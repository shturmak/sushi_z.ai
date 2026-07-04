# SushiChain — Налаштування Staging-середовища

## 1. Огляд

Staging — це копія production з PostgreSQL. Призначення:

- перевірка міграцій на реальній базі;
- скінцеве тестування фіч end-to-end;
- QA-ворота перед релізом у production.

Канонічна схема — `prisma/schema.prisma` (PostgreSQL). Окремої `schema.postgresql.prisma` більше не існує. Всі команди Prisma використовують стандартну схему без `--schema` флагу.

---

## 2. Передумови

| Інструмент | Чому |
|------------|------|
| Docker + Docker Compose | запуск сервісів |
| Git | клонування репозиторію |
| Обліковий запис Supabase або Railway | тільки для зовнішньої БД (опціонально) |

---

## 3. Локальна PostgreSQL для розробки

```bash
docker compose -f docker-compose.dev.yml up -d
```

Це запускає PostgreSQL 16 на `localhost:5432`:

- **Користувач:** `sushichain`
- **Пароль:** `sushichain_dev`
- **База:** `sushichain_dev`

Перевірка підключення:

```bash
docker compose -f docker-compose.dev.yml ps
```

Зупинка та скидання:

```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## 4. Staging з локальною PostgreSQL

### 4.1. Підготовка `.env.staging`

```bash
cp .env.example .env.staging
```

Відредагуйте `.env.staging` — вкажіть `DATABASE_URL`:

```env
DATABASE_URL="postgresql://sushichain:sushichain_staging@db:5432/sushichain_staging?schema=public"

POSTGRES_USER=sushichain
POSTGRES_PASSWORD=sushichain_staging
POSTGRES_DB=sushichain_staging

NEXT_PUBLIC_APP_URL=http://localhost:3000
BRAND_DOMAIN=localhost
NODE_ENV=staging

JWT_SECRET=staging-jwt-secret-change-me-32chars-minimum!!
JWT_REFRESH_SECRET=staging-refresh-secret-change-me-32chars!!

PAYMENT_PROVIDER=liqpay_sandbox
LIQPAY_PUBLIC_KEY=sandbox_public_key
LIQPAY_PRIVATE_KEY=sandbox_private_key

LOG_LEVEL=debug
```

> Генерація секретів: `openssl rand -base64 32`

### 4.2. Запуск

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

Docker Compose автоматично:
- запустить PostgreSQL з healthcheck;
- зачекає, поки БД стане готовою (`depends_on: condition: service_healthy`);
- зібере та запустить Next.js додаток.

### 4.3. Міграції та сиди

```bash
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

---

## 5. Staging з зовнішньою PostgreSQL (Supabase / Railway)

### 5.1. Налаштування з'єднання

У `.env.staging` замініть `DATABASE_URL` на зовнішнє підключення:

```env
DATABASE_URL="postgresql://user:password@db.xxxxx.supabase.co:5432/postgres?schema=public"
```

### 5.2. Вимкнення локальної БД

В `docker-compose.staging.yml` закоментуйте сервіс `db` та залежність у `app`:

```yaml
# db:
#   image: postgres:16-alpine
#   ...

  app:
    # depends_on:
    #   db:
    #     condition: service_healthy
```

### 5.3. Запуск

```bash
docker compose -f docker-compose.staging.yml up -d --build app
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

---

## 6. Перша міграція на staging

Оскільки це нове налаштування:

1. **Переконайтеся, що міграції існують** — вони мають бути в `prisma/migrations/` (створюються під час локальної розробки командою `bunx prisma migrate dev`).

2. **Застосуйте міграції на staging:**

```bash
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate deploy
```

3. **Заповніть тестовими даними:**

```bash
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

> **Важливо:** ніколи не виконуйте `prisma migrate dev` на staging — тільки `prisma migrate deploy`. Команда `dev` створює нові міграції і може змінити схему непередбачувано.

---

## 7. Чеклист перевірки

Після деплою пройдіться по цьому списку:

- [ ] **Адмін-панель** — завантажується на `/admin`
- [ ] **Меню** — бренди → філії → категорії → товари відображаються коректно
- [ ] **Оформлення замовлення** — кошик, checkout, створення замовлення працюють
- [ ] **Субдомени брендів** — роутинг по `BRAND_DOMAIN` працює (наприклад, `sushi-master.localhost`)
- [ ] **Міграції** — `prisma migrate status` показує «Database schema is up to date»
- [ ] **Сиди** — тестові дані на місці (бренди, товари, замовлення)

```bash
# Швидка перевірка
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate status
curl -s http://localhost:3000/api/ | head -c 200
docker compose -f docker-compose.staging.yml logs --tail=20 app
```

---

## 8. Скидання

### Повний скидання з видаленням даних (nuclear reset)

```bash
docker compose -f docker-compose.staging.yml down -v
```

Це зупиняє контейнери та видаляє всі volumes (`postgres_staging`, `app_uploads_staging`).

### Повторний запуск після скидання

```bash
docker compose -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

### Скидання лише даних (схема залишається)

```bash
docker compose -f docker-compose.staging.yml exec app sh -c \
  "bunx prisma migrate reset --force && bun run prisma/seed.ts"
```

---

## 9. Вирішення проблем

### БД недоступна (Connection refused)

```bash
# Перевірте статус БД
docker compose -f docker-compose.staging.yml ps

# Перевірте healthcheck PostgreSQL
docker compose -f docker-compose.staging.yml exec db pg_isready -U sushichain

# Перевірте DATABASE_URL в контейнері
docker compose -f docker-compose.staging.yml exec app printenv DATABASE_URL
```

Якщо використовуєте зовнішню БД — перевірте, що IP-адреса сервера дозволена в налаштуваннях Supabase/Railway (Connection Pooling → IPv4 allowlist).

### Проблеми з міграціями

```bash
# Перевірте статус міграцій
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate status

# Якщо є конфлікт — спочатку вирішіть локально:
bunx prisma migrate dev          # на локальній машині
git add prisma/migrations/
git commit -m "fix migration conflict"
git push origin staging

# Потім на staging:
docker compose -f docker-compose.staging.yml exec app bunx prisma migrate deploy
```

### Prisma Client не знайдено або помилки типів

```bash
# Перегенеруйте клієнт
docker compose -f docker-compose.staging.yml exec app bunx prisma generate

# Якщо не допомогло — перезбірка образу
docker compose -f docker-compose.staging.yml up -d --build app
```

### Контейнер не стартує

```bash
# Логи додатку
docker compose -f docker-compose.staging.yml logs --tail=50 app

# Логи БД
docker compose -f docker-compose.staging.yml logs --tail=50 db
```
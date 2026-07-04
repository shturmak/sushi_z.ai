# Робочий процес міграцій бази даних (Migration Workflow)

> **Цей документ описує повний цикл роботи зі змінами схеми: від локальної розробки до production.**
> Усі команди готові до копіювання. Дотримуйтесь порядку кроків.

---

## 1. Огляд

### Два схеми — дві БД

| Середовище | Схема Prisma | БД | Призначення |
|---|---|---|---|
| **Локальна розробка** | `prisma/schema.prisma` | SQLite (`file:db/custom.db`) | Швидкий прототипування |
| **Staging / Production** | `prisma/schema.postgresql.prisma` | PostgreSQL | Стабільне середовище з історією змін |

### Чому `db push` тільки для dev, а `migrate deploy` для staging/prod?

- **`prisma db push`** синхронізує схему з БД **без створення файлів міграцій**. Це швидко, але не залишає історії. Якщо щось зламається — немає шляку назад. Тому це лише для локальної SQLite-розробки.

- **`prisma migrate deploy`** застосовує **готові файли міграцій** з `prisma/migrations/` послідовно. Не робить diff схеми — просто виконує SQL-файли по порядку. Це безпечно для production, бо кожна зміна перевірена і закомічена в Git.

- **Файли міграцій** зберігаються в `prisma/migrations/` і є частиною репозиторію. Кожен розробник отримує однаковий стан БД після `git pull`.

### Ключове правило

> **Ніколи не змінюйте існуючі файли міграцій.** Тільки створюйте нові. Інакше розробники з іншими гілками отримають конфлікти.

---

## 2. Локальна розробка (dev)

### Швидке прототипування (SQLite)

Коли ви експериментуєте з моделями і не плануєте відправляти зміни на staging/production:

```bash
bun run db:push
```

Це перезапише локальну SQLite-базу відповідно до `prisma/schema.prisma`. Дані будуть втрачені — це нормально для прототипування.

### Створення міграції для staging/prod

**Коли створювати міграцію:** будь-яка зміна в `prisma/schema.postgresql.prisma`, яка має потрапити на staging або production.

```bash
bunx prisma migrate dev --name add_tip_field_to_orders --schema prisma/schema.postgresql.prisma
```

Що відбувається:

1. Prisma порівнює поточний стан БД (за `DATABASE_URL`) зі схемою
2. Генерує SQL-файл у `prisma/migrations/<timestamp>_add_tip_field_to_orders/migration.sql`
3. Застосовує міграцію до локальної БД
4. Оновлює таблицю `_prisma_migrations`

> **Важливо:** перед цим переконайтеся, що `DATABASE_URL` вказує на вашу локальну PostgreSQL (Docker), а не на staging/production. Ніколи не запускайте `migrate dev` проти production-БД.

### Локальний PostgreSQL для перевірки міграцій

```bash
docker run --name sushichain-pg-dev \
  -e POSTGRES_USER=sushichain \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=sushichain_dev \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Встановіть `DATABASE_URL` у `.env`:

```bash
DATABASE_URL=postgresql://sushichain:secret@localhost:5432/sushichain_dev?schema=public
```

---

## 3. Перевірка перед комітом

### 3.1. Валідація схеми

```bash
bunx prisma validate --schema prisma/schema.postgresql.prisma
```

Перевіряє синтаксис схеми без підключення до БД. Повинно повернути `The schema is valid.`

### 3.2. Перевірка згенерованого SQL

Відкрийте файл міграції та прочитайте SQL:

```bash
# Знайти останню міграцію
ls -t prisma/migrations/ | head -1

# Переглянути SQL
cat prisma/migrations/$(ls -t prisma/migrations/ | head -1)/migration.sql
```

На що звернути увагу:

- `ALTER TABLE` з `ADD COLUMN ... NOT NULL` без `DEFAULT` — це впаде на таблиці з даними (див. розділ 10)
- `DROP COLUMN` чи `DROP TABLE` — переконайтеся, що це дійсно потрібно
- Перейменування (`RENAME COLUMN`, `RENAME TABLE`) — Prisma може згенерувати це як drop + add (втрата даних). Перевірте і при необхідності виправте SQL вручну

### 3.3. Тестування на локальному PostgreSQL

```bash
# Перевірити статус міграцій
bunx prisma migrate status --schema prisma/schema.postgresql.prisma

# Якщо все чисто — застосувати
bunx prisma migrate deploy --schema prisma/schema.postgresql.prisma
```

### 3.4. Генерація клієнта

```bash
bun run db:generate:pg
```

Переконайтеся, що TypeScript-код компілюється без помилок після зміни схеми:

```bash
bun run build
```

---

## 4. Коміт і пуш

### Що комітити

```bash
git add prisma/schema.postgresql.prisma
git add prisma/migrations/
git commit -m "feat(db): add tip_amount column to orders"
git push origin staging
```

**Завжди комітьте обидві речі разом:**

1. Зміну в `prisma/schema.postgresql.prisma`
2. Папку з міграцією `prisma/migrations/<timestamp>_<name>/`

### Заборонені дії

- **Ніколи не редагуйте існуючі файли `migration.sql`** — це зламає історію для інших розробників
- **Ніколи не видаляйте файли міграцій** — навіть якщо здається, що вони не потрібні
- **Ніколи не перейменовуйте папки міграцій** — Prisma використовує імена папок для відстеження стану

### Якщо міграція потребує виправлення

Якщо ви створили міграцію і зрозуміли, що SQL неправильний (до коміту):

```bash
# Відкотити локально
bunx prisma migrate resolve --rolled-back $(ls -t prisma/migrations/ | head -1) --schema prisma/schema.postgresql.prisma

# Видалити папку міграції (ДО КОМІТУ!)
rm -rf prisma/migrations/$(ls -t prisma/migrations/ | head -1)

# Створити нову з правильним SQL
bunx prisma migrate dev --name correct_description --schema prisma/schema.postgresql.prisma
```

> **Тільки до коміту!** Після пушу створюйте нову міграцію-фікс, а не змінюйте існуючу.

---

## 5. Деплой на staging

### Автоматично (через CI/CD)

CI/CD pipeline автоматично запускає `prisma migrate deploy` при деплої на staging. Це безпечна операція — вона лише застосовує ще не застосовані міграції.

```yaml
# З фрагмента .github/workflows/staging.yml:
- name: Run migrations
  run: docker compose -f docker-compose.staging.yml exec -T app npx prisma migrate deploy
```

### Вручну

```bash
./scripts/migrate-staging.sh
```

Або безпосередньо на сервері:

```bash
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy
```

### Що відбувається під час `migrate deploy`

1. Prisma читає таблицю `_prisma_migrations` в БД
2. Порівнює з файлами в `prisma/migrations/`
3. Застосовує тільки ті міграції, яких ще немає в БД
4. Записує кожну застосовану міграцію в `_prisma_migrations`
5. **Не робить diff схеми** — тільки виконує SQL

### При помилці

- Деплой зупиняється
- Міграція, яка впала, позначається як `Rolled back` в `_prisma_migrations`
- Дані залишаються в стані, який був до падіння міграції (в межах однієї транзакції)
- Перевірте логи:

```bash
docker compose -f docker-compose.staging.yml logs app --tail 100
```

---

## 6. Перевірка на staging

Після успішного деплою обов'язково перевірте:

### Адмін-панель

```bash
# Відкрийте staging в браузері
open https://staging.sushichain.app/admin
```

- [ ] Адмін-панель завантажується без помилок
- [ ] Сторінка замовлень відображає таблицю
- [ ] Сторінка меню показує категорії та продукти

### Тестовий замовлення

- [ ] Додайте товар у кошик
- [ ] Оформіть замовлення (delivery або pickup)
- [ ] Перевірте, що замовлення з'явилось в адмінці
- [ ] Прокрутіть статус замовлення до `completed`

### Нові колонки/таблиці

Якщо міграція додавала нові колонки або таблиці:

```bash
# Підключитися до БД staging і перевірити
docker compose -f docker-compose.staging.yml exec postgres psql -U sushichain -d sushichain_staging

# Приклад: перевірити наявність нової колонки
\d orders

# Або через Prisma
docker compose -f docker-compose.staging.yml exec app npx prisma db execute --schema prisma/schema.postgresql.prisma --stdin <<'SQL'
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tip_amount';
SQL
```

---

## 7. Деплой на production

### Правило

> **Завжди деплойте спочатку на staging.** Production отримує тільки той код, який пройшов перевірку на staging.

### Перед деплоєм: бекап

```bash
# На production сервері
pg_dump -Fc -f /backups/pre-migration-$(date +%Y%m%d-%H%M%S).dump $DATABASE_URL
```

Або через утиліту бекапів (якщо налаштовано для PostgreSQL):

```bash
bun run db:backup
```

### Деплой

```bash
./scripts/migrate-production.sh
```

Скрипт має запитати підтвердження перед виконанням. Якщо скрипта ще немає — запускайте вручну з обережністю:

```bash
# На production сервері
cd /opt/sushichain
git pull origin main
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

### Моніторинг після міграції

```bash
# Перевірити логи додатку
docker compose -f docker-compose.production.yml logs -f app --tail 50

# Перевірити статус міграцій
docker compose -f docker-compose.production.yml exec app npx prisma migrate status

# Перевірити здоров'я додатку
curl -s https://sushichain.app/api | head -c 200
```

Якщо щось пішло не так — див. розділ 8 (відкат міграції).

---

## 8. Відкат міграції

### Важливе попередження

> **Prisma не підтримує автоматичний відкат (`prisma migrate rollback` в персепктивному вигляді).** Вам потрібно вручну створити нову міграцію, яка скасує зміни.

### Крок 1: Позначити міграцію як відкочену (якщо вона впала)

```bash
bunx prisma migrate resolve --rolled-back 20260702235305_add_tip_field --schema prisma/schema.postgresql.prisma
```

Це розповідає Prisma: «ця міграція не застосована, не намагайся її повторити». БД при цьому **не змінюється**.

### Крок 2: Створити нову міграцію для скасування

Наприклад, якщо ви додали колонку `tip_amount` і хочете її прибрати:

```bash
bunx prisma migrate dev --name remove_tip_field_from_orders --schema prisma/schema.postgresql.prisma
```

Prisma побачить, що в схемі колонки більше немає, і згенерує:

```sql
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "tip_amount";
```

### Крок 3: Застосувати на staging/production

```bash
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy
```

### Відновлення з бекапу (якщо все зовсім погано)

```bash
# Стопнути додаток
docker compose -f docker-compose.production.yml stop app

# Відновити з бекапу
pg_restore -d $DATABASE_URL /backups/pre-migration-20250115-103000.dump

# Запустити додаток
docker compose -f docker-compose.production.yml start app
```

---

## 9. Перший деплой (initial setup)

Коли ви deployingте проєкт вперше на нове середовище (немає жодної таблиці):

### Staging

```bash
./scripts/setup-staging-db.sh
```

Або вручну:

```bash
# 1. Підготувати PostgreSQL (docker-compose.staging.yml)
docker compose -f docker-compose.staging.yml up -d postgres

# 2. Дочекатися готовності
docker compose -f docker-compose.staging.yml exec postgres pg_isready

# 3. Застосувати всі міграції з нуля
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy --schema prisma/schema.postgresql.prisma

# 4. Заповнити тестовими даними
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

Що створюється:

- Усі 20+ таблиць (brands, users, orders, products тощо)
- Усі enums (OrderStatus, PaymentMethod, PromotionType тощо)
- Усі індекси та foreign keys
- `_prisma_migrations` таблиця з історією

### Seed дані

Seed-скрипт (`prisma/seed.ts`) створює:

| Сутність | Кількість | Деталі |
|---|---|---|
| Brands | 3 | Суші Мастер, Піца Наполі, Бургер Лаб |
| Branches | 3+ | По одному на бренд з графіком роботи |
| Categories | 9+ | Роли, Суші, Піца, Бургери, Напої тощо |
| Products | 30+ | З групами опцій (розмір, гострота) |
| Promotions | 3 | Відсоток, фіксована знижка, безкоштовна доставка |
| Users | 1 | Демо-користувач з паролем `password123` |
| Orders | 3 | Різні статуси (new, completed, cancelled) |

---

## 10. Часті проблеми та рішення

### 10.1. Конфлікт міграцій (два розробники змінили схему)

**Симптом:** `prisma migrate dev` пише, що є незастосовані міграції, які конфліктують з поточною схемою.

**Рішення:**

```bash
# 1. Потягнути останні зміни
git pull --rebase origin staging

# 2. Базова міграція вже застосована локально. Розкажіть Prisma про це:
bunx prisma migrate resolve --applied 20260703120000_their_migration --schema prisma/schema.postgresql.prisma

# 3. Створити свою міграцію поверх
bunx prisma migrate dev --name my_feature --schema prisma/schema.postgresql.prisma
```

Якщо конфлікт структурний (обоє змінили одну і ту ж таблицю):

1. Обговоріть з іншим розробником, яка міграція йде першою
2. Перебазуйте свою гілку
3. Створіть нову міграцію, яка враховує обидві зміни

### 10.2. Міграція впала під час деплою

**Симптом:** CI/CD зупинився, в логах `Error applying migration ...`.

**Рішення:**

```bash
# 1. Подивитися статус
docker compose -f docker-compose.staging.yml exec app npx prisma migrate status

# 2. Якщо міграція впала і була відкочена — виправте SQL і створіть нову міграцію
# 3. Якщо міграція впала частково — перевірте стан БД вручну
docker compose -f docker-compose.staging.yml exec postgres psql -U sushichain -d sushichain_staging

# 4. Якщо дані не пошкоджені — позначте як відкочену і створіть фікс
bunx prisma migrate resolve --rolled-back 20260703120000_broken_migration --schema prisma/schema.postgresql.prisma
```

### 10.3. Додавання NOT NULL колонки до існуючої таблиці

**Проблема:** Prisma генерує `ALTER TABLE ... ADD COLUMN "tip_amount" REAL NOT NULL`, що впаде, якщо в таблиці вже є рядки.

**Рішення (двоступовий підхід):**

**Крок 1** — додайте колонку як nullable:

```prisma
// prisma/schema.postgresql.prisma
tipAmount Float?
```

```bash
bunx prisma migrate dev --name add_tip_amount_nullable --schema prisma/schema.postgresql.prisma
```

**Крок 2** — після деплою на staging/production, заповніть значення і зробіть NOT NULL:

```prisma
// prisma/schema.postgresql.prisma
tipAmount Float @default(0)
```

```bash
bunx prisma migrate dev --name make_tip_amount_required --schema prisma/schema.postgresql.prisma
```

Prisma згенерує SQL з `DEFAULT 0`, який безпечно застосується до існуючих рядків.

### 10.4. Перейменування колонок/таблиць

**Проблема:** Prisma може згенерувати `DROP COLUMN + ADD COLUMN` замість `RENAME COLUMN`, що призведе до втрати даних.

**Рішення:** після генерації міграції перевірте SQL і при необхідності виправте вручну.

Неправильно (Prisma за замовчуванням):

```sql
ALTER TABLE "products" DROP COLUMN "name";
ALTER TABLE "products" ADD COLUMN "title" TEXT NOT NULL;
```

Правильно (виправте вручну):

```sql
ALTER TABLE "products" RENAME COLUMN "name" TO "title";
```

**Порядок дій:**

1. Змініть поле в схемі Prisma
2. Запустіть `prisma migrate dev` — це згенерує (можливо, неправильний) SQL
3. **Виправте SQL вручну** у файлі міграції (це єдиний випадок, коли редагування migration.sql допустиме, і тільки ДО КОМІТУ)
4. Застосуйте виправлену міграцію локально
5. Закомітьте

### 10.5. Зміна значень enum

**Проблема:** Додавання нового значення в enum — це `ALTER TYPE ... ADD VALUE`, але PostgreSQL не підтримує це в транзакції (яку Prisma використовує за замовчуванням).

**Рішення:** для PostgreSQL використовуйте окремий SQL:

```bash
# Створіть порожню міграцію
bunx prisma migrate dev --name add_expedited_to_order_status --schema prisma/schema.postgresql.prisma --create-only
```

Відредагуйте згенерований `migration.sql`:

```sql
-- Додаємо нове значення в enum (поза транзакцією для PostgreSQL)
DO $$ BEGIN
    ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'expedited';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

> **Примітка:** нове значення enum додається в кінець списку. Не видаляйте існуючі значення — це впаде на production з даними.

### 10.6. Міграція даних (зміна даних разом зі схемою)

**Симптом:** вам потрібно не лише змінити структуру таблиць, але й перенести/трансформувати існуючі дані.

**Рішення:** створіть міграцію `--create-only` і додайте SQL для міграції даних вручну.

```bash
bunx prisma migrate dev --name migrate_phone_to_email --schema prisma/schema.postgresql.prisma --create-only
```

Відредагуйте `migration.sql`:

```sql
-- 1. Структурна зміна: додаємо нову колонку
ALTER TABLE "users" ADD COLUMN "emailBackup" TEXT;

-- 2. Міграція даних: копіюємо значення
UPDATE "users" SET "emailBackup" = "email" WHERE "email" IS NOT NULL;

-- 3. Налаштовуємо колонку (якщо потрібно)
CREATE UNIQUE INDEX "users_emailBackup_key" ON "users"("emailBackup");
```

**Правила для міграції даних:**

- Робіть оновлення даних **після** структурних змін в тому ж файлі
- Великі таблиці (>100k рядків) — розбийте на кілька міграцій або використовуйте `UPDATE` з `WHERE` чанками
- Завжди перевіряйте на staging з реальними даними перед production
- Roblohny backup перед production (див. розділ 7)

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MIGRATION QUICK REFERENCE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ЛОКАЛЬНА РОЗРОБКА (SQLite)                                        │
│  ─────────────────────────────────                                  │
│  bun run db:push                     # швидке прототипування        │
│                                                                     │
│  СТВОРЕННЯ МИГРАЦІЇ (PostgreSQL)                                    │
│  ─────────────────────────────────                                  │
│  bunx prisma migrate dev \                                         │
│    --name description \                                             │
│    --schema prisma/schema.postgresql.prisma                        │
│                                                                     │
│  ПЕРЕВІРКА ПЕРЕД КОМІТОМ                                           │
│  ─────────────────────────────────                                  │
│  bunx prisma validate \                                             │
│    --schema prisma/schema.postgresql.prisma                        │
│  bun run db:generate:pg                                             │
│  bun run build                                                      │
│                                                                     │
│  ДЕПЛОЙ НА STAGING                                                  │
│  ─────────────────────────────────                                  │
│  ./scripts/migrate-staging.sh                                      │
│  # або автоматично через CI/CD                                     │
│                                                                     │
│  ДЕПЛОЙ НА PRODUCTION                                               │
│  ─────────────────────────────────                                  │
│  bun run db:backup                    # бекап перед міграцією       │
│  ./scripts/migrate-production.sh       # з підтвердженням           │
│                                                                     │
│  ВІДКАТ                                                              │
│  ─────────────────────────────────                                  │
│  bunx prisma migrate resolve \                                      │
│    --rolled-back <migration_name> \                                │
│    --schema prisma/schema.postgresql.prisma                        │
│                                                                     │
│  СТАТУС МИГРАЦІЙ                                                   │
│  ─────────────────────────────────                                  │
│  bunx prisma migrate status \                                       │
│    --schema prisma/schema.postgresql.prisma                        │
│                                                                     │
│  FIRST DEPLOY (на нове середовище)                                  │
│  ─────────────────────────────────                                  │
│  ./scripts/setup-staging-db.sh                                     │
│  # або:                                                            │
│  npx prisma migrate deploy --schema prisma/schema.postgresql.prisma│
│  bun run prisma/seed.ts                                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ЗОЛОГІ ПРАВИЛА                                                     │
│                                                                     │
│  1. db:push        → тільки для локальної розробки (SQLite)        │
│  2. migrate dev    → створює міграційні файли (dev)                │
│  3. migrate deploy → застосовує на staging/prod (без diff)         │
│  4. Ніколи не редагуйте існуючі migration.sql                      │
│  5. Ніколи не видаляйте файли міграцій                              │
│  6. Комітьте схему + міграцію разом                                │
│  7. Бекап перед production deploy                                  │
│  8. Завжди спочатку staging, потім production                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Структура файлів

```
prisma/
├── schema.prisma                    # SQLite (dev)
├── schema.postgresql.prisma         # PostgreSQL (staging/prod) ← канонічна схема
├── seed.ts                          # Тестові дані
└── migrations/
    ├── migration_lock.toml          # Провайдер БД для міграцій
    └── 20260702235305_init/         # Перша міграція
        └── migration.sql            # SQL для застосування
```

Кожна нова міграція додає ще одну папку з timestamp:

```
prisma/migrations/
├── 20260702235305_init/
│   └── migration.sql
├── 20260703120000_add_tip_field/
│   └── migration.sql
└── 20260704150000_add_expedited_status/
    └── migration.sql
```
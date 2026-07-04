# Робочий процес міграцій бази даних — SushiChain

> **Повний посібник зі створення, перевірки та деплою міграцій Prisma.**
> Усі команди готові до копіювання. Дотримуйтесь порядку кроків.

---

## 1. Огляд та політика канонічної схеми

### Єдине джерело істини

`prisma/schema.prisma` (PostgreSQL) — **канонічна схема** проєкту. Всі зміни структури БД починаються тут.

| Файл | БД | Роль |
|---|---|---|
| `prisma/schema.prisma` | PostgreSQL | **Канонічна схема** — єдине джерело істини |
| `prisma/schema.sqlite.prisma` | SQLite | Дев-копія для швидкого прототипування (НЕ канонічна) |

### Ключові правила

1. **Усі зміни схеми спочатку вносяться в `prisma/schema.prisma`**
2. **Міграції генеруються тільки з канонічної схеми**
3. **SQLite-схема — це зручна копія для локальних експериментів**. Зміни, зроблені там, потрібно вручну перенести в канонічну схему
4. **Міграції з SQLite ніколи не комітяться в репозиторій**

### Чому дві схеми?

- **PostgreSQL (канонічна)** — production-сумісна БД з повною підтримкою міграцій. Усі міграційні файли живуть у `prisma/migrations/` і є частиною Git-історії
- **SQLite (прототипування)** — для швидких експериментів без підняття Docker. Використовує `prisma db push` (без файлів міграцій). Дані можуть бути втрачені — це нормально

---

## 2. Середовища баз даних

| Середовище | База даних | Файл схеми | Команда | Призначення |
|---|---|---|---|---|
| **Локальна розробка** | PostgreSQL 16 (Docker) | `prisma/schema.prisma` | `bun run db:migrate` | Створення та тестування міграцій |
| **Staging** | PostgreSQL (managed) | `prisma/schema.prisma` | `prisma migrate deploy` | Перевірка перед production |
| **Production** | PostgreSQL (managed) | `prisma/schema.prisma` | `prisma migrate deploy` | Бойове середовище |
| **Швидке прототипування** | SQLite (локальний файл) | `prisma/schema.sqlite.prisma` | `bun run db:push:sqlite` | Тільки для швидкої ітерації |

### Розгортання команд за призначенням

- **`prisma migrate dev`** — створює файли міграцій, застосовує їх локально. Тільки в dev!
- **`prisma db push`** — синхронізує схему з БД без міграційних файлів. Тільки для локального прототипування!
- **`prisma migrate deploy`** — застосовує готові міграції з `prisma/migrations/`. Єдиний дозволений спосіб для staging/production

---

## 3. Дозволені команди за середовищами

### Локальна розробка (PostgreSQL Docker)

```bash
# ✅ Створення міграції (генерує файл + застосовує локально)
bun run db:migrate --name <опис>

# ✅ Швидке прототипування на локальному PG (без файлів міграцій)
prisma db push

# ✅ Перевірка синтаксису схеми
bun run db:validate

# ✅ Генерація Prisma-клієнта
bun run db:generate
```

> **❌ НІКОЛИ не вказуйте `DATABASE_URL` на staging/production під час використання `migrate dev`**. Це зруйнує базу даних.

### Staging

```bash
# ✅ Застосувати pending-міграції
prisma migrate deploy

# ✅ Перевірити статус міграцій
prisma migrate status

# ✅ Переддеплойна перевірка
bun run db:validate
```

> **❌ НІКОЛИ `prisma migrate dev` на staging** — це створює нові файли міграцій і модифікує схему на льоту.
>
> **❌ НІКОЛИ `prisma db push` на staging** — немає історії змін, немає шляху назад.

### Production

```bash
# ✅ Застосувати pending-міграції
prisma migrate deploy

# ✅ Перевірити статус міграцій
prisma migrate status
```

> **❌ НІКОЛИ `prisma migrate dev` на production**
>
> **❌ НІКОЛИ `prisma db push` на production**
>
> **❌ НІКОЛИ будь-яка команда модифікації схеми на production** — тільки `migrate deploy`

---

## 4. Підготовка до першої міграції

Проєкт ще не має жодної міграції. Перша міграція створює всі таблиці з нуля на порожній БД.

### Крок 1 — Запустити перевірку перед міграцією

```bash
bun run pre-migration-check
```

Переконайтеся, що **всі перевірки пройдені**. Скрипт перевіряє цілісність схеми, наявність `DIRECT`-відношень, коректність типів тощо.

### Крок 2 — Підняти локальний PostgreSQL

```bash
docker compose -f docker-compose.dev.yml up -d
```

Перевірте, що контейнер працює:

```bash
docker compose -f docker-compose.dev.yml exec postgres pg_isready
```

Переконайтеся, що `.env` містить правильний `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://sushichain:secret@localhost:5432/sushichain_dev?schema=public
```

### Крок 3 — Створити ініціальну міграцію

```bash
bun run db:migrate --name init
```

Це згенерує `prisma/migrations/<timestamp>_init/migration.sql` з усіма `CREATE TABLE`, `CREATE INDEX`, `CREATE TYPE` тощо.

### Крок 4 — Ретельно перевірити згенерований SQL

```bash
# Знайти папку міграції
ls prisma/migrations/

# Переглянути SQL
cat prisma/migrations/$(ls prisma/migrations/ | tail -1)/migration.sql
```

На що звернути увагу:

- [ ] Усі таблиці створюються з коректними типами
- [ ] Усі foreign keys вказують на правильні таблиці
- [ ] Enum-типи створені з усіма значеннями
- [ ] Індекси покривають необхідні запити
- [ ] Немає випадкових `DROP` (на новій БД цього бути не повинно)

### Важливо

Це **INIT-міграція** — вона створює БД з нуля на порожній базі. Це НЕ baseline від існуючої БД. Staging та production отримають цю міграцію через `prisma migrate deploy` при першому деплої.

---

## 5. Щоденний робочий процес міграцій

Покрокова інструкція для внесення зміни в схему:

### Крок 1 — Внести зміну в канонічну схему

Редагуйте `prisma/schema.prisma`:

```prisma
model Order {
  // ... існуючі поля ...
  tipAmount     Float?              // нове поле
  deliveryNote  String?             // нове поле
}
```

### Крок 2 — Перевірити синтаксис

```bash
bun run db:validate
```

Має вивести: `The schema is valid.`

### Крок 3 — Створити міграцію

```bash
bun run db:migrate --name add_tip_and_delivery_note_to_orders
```

Prisma:
1. Порівнює поточний стан локальної БД зі схемою
2. Генерує SQL у `prisma/migrations/<timestamp>_add_tip_and_delivery_note_to_orders/migration.sql`
3. Застосовує міграцію до локальної БД
4. Оновлює таблицю `_prisma_migrations`

### Крок 4 — Перевірити згенерований SQL

```bash
cat prisma/migrations/$(ls -t prisma/migrations/ | head -1)/migration.sql
```

Перевірте:
- `ADD COLUMN ... NOT NULL` без `DEFAULT` — **впаде** на таблиці з даними
- `DROP COLUMN` / `DROP TABLE` — переконайтеся, що це дійсно потрібно
- Перейменування — Prisma може згенерувати `DROP + ADD` замість `RENAME` (втрата даних!)

### Крок 5 — Виправити SQL якщо потрібно (див. розділ 6)

Тільки для найсвіжішої міграції, тільки до коміту.

### Крок 6 — Перегенерувати клієнт

```bash
bun run db:generate
```

### Крок 7 — Перевірити збірку TypeScript

```bash
bun run build
```

Якщо є помилки типізації — виправте код, що використовує змінену схему.

### Крок 8 — Перевірити якість коду

```bash
bun run lint
```

### Крок 9 — Закомітити схему та міграцію РАЗОМ

```bash
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "feat(db): add tip_amount and delivery_note to orders"
```

> **Завжди комітьте обидві речі разом:** зміну в `prisma/schema.prisma` та папку `prisma/migrations/<timestamp>_<name>/`.

### Крок 10 — Push, staging, production

```bash
git push origin <branch>
# → деплой на staging → перевірка → деплой на production
```

---

## 6. Редагування згенерованого SQL міграції

### Коли ДОЗВОЛЕНО редагувати `migration.sql`

- ✅ **Тільки найсвіжіша** (остання створена) міграція
- ✅ **Тільки до `git commit`** (поки не закомічено)
- ✅ **Тільки для таких випадків:**
  - **Перейменування** — замінити `DROP + ADD` на `RENAME COLUMN` / `RENAME TABLE`
  - **Міграція даних** — додати `UPDATE` / `INSERT` для трансформації даних
  - **Enum-значення** — змінити `ALTER TYPE` для коректного додавання значень в PostgreSQL

Приклад виправлення перейменування:

Неправильно (Prisma за замовчуванням):

```sql
ALTER TABLE "products" DROP COLUMN "name";
ALTER TABLE "products" ADD COLUMN "title" TEXT NOT NULL;
```

Правильно (виправте вручну):

```sql
ALTER TABLE "products" RENAME COLUMN "name" TO "title";
```

Приклад додавання значення в enum (PostgreSQL):

```sql
-- Додаємо нове значення в enum (поза транзакцією)
DO $$ BEGIN
    ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'expedited';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

### Коли ЗАБОРОНЕНО редагувати `migration.sql`

- ❌ **Будь-яка закомічена міграція** — це зламає історію для інших розробників
- ❌ **Будь-яка міграція, що вже була задеплоєна** на staging або production
- ❌ **Додавання `DROP TABLE` / `DROP COLUMN`** без повного розуміння наслідків

### Якщо потрібно виправити закомічену міграцію

```bash
# Створити нову міграцію-фікс (ніколи не редагуйте стару!)
bun run db:migrate --name fix_previous_migration
```

---

## 7. Деплой на Staging

### Через CI/CD

Pipeline автоматично запускає `prisma migrate deploy` при деплої на staging:

```yaml
# .github/workflows/staging.yml (фрагмент)
- name: Run migrations
  run: prisma migrate deploy
```

### Вручну

```bash
bun run migrate:staging
```

Або через скрипт напряму:

```bash
./scripts/migrate-staging.sh
```

### Що відбувається під час `migrate deploy`

1. Prisma читає таблицю `_prisma_migrations` в БД
2. Порівнює з файлами в `prisma/migrations/`
3. Застосовує **тільки** ті міграції, яких ще немає в БД
4. Записує кожну застосовану міграцію в `_prisma_migrations`
5. **Не робить diff схеми** — тільки виконує SQL послідовно

### Перевірка після деплою на staging

Обов'язково перевірте вручну:

- [ ] Адмін-панель завантажується без помилок
- [ ] Сторінка замовлень відображає таблицю
- [ ] Сторінка меню показує категорії та продукти
- [ ] Створіть тестове замовлення (delivery або pickup)
- [ ] Перевірте, що замовлення з'явилось в адмінці
- [ ] Прокрутіть статус замовлення до `completed`
- [ ] Якщо є нові колонки/таблиці — перевірте через SQL:

```bash
# Підключитися до БД staging
docker compose -f docker-compose.staging.yml exec postgres psql -U sushichain -d sushichain_staging

# Приклад: перевірити наявність нової колонки
\d orders
```

### При помилці на staging

- Деплой зупиняється
- Міграція, що впала, позначається як `Rolled back` в `_prisma_migrations`
- Перевірте логи:

```bash
docker compose -f docker-compose.staging.yml logs app --tail 100
```

---

## 8. Деплой на Production

### Правило

> **Завжди деплойте спочатку на staging.** Production отримує тільки той код, який пройшов перевірку на staging.

### Крок 1 — Бекап перед міграцією

```bash
# Варіант 1: через утиліту проєкту
bun run db:backup

# Варіант 2: через pg_dump напряму
pg_dump -Fc -f /backups/pre-migration-$(date +%Y%m%d-%H%M%S).dump $DATABASE_URL
```

### Крок 2 — Застосувати міграцію

```bash
bun run migrate:prod
```

Або через скрипт:

```bash
./scripts/migrate-production.sh
```

Скрипт має запитати підтвердження перед виконанням.

### Крок 3 — Моніторинг після міграції

```bash
# Перевірити статус міграцій
prisma migrate status

# Перевірити логи додатку
docker compose -f docker-compose.production.yml logs -f app --tail 50

# Перевірити здоров'я додатку
curl -s https://sushichain.app/api | head -c 200
```

Якщо щось пішло не так — див. [розділ 9](#9-відновлення-після-невдалої-міграції).

---

## 9. Відновлення після невдалої міграції

### Варіант 1: Позначити як відкочену та створити фікс

Якщо міграція впала під час `migrate deploy`:

```bash
# 1. Перевірити статус
prisma migrate status

# 2. Позначити впалу міграцію як відкочену
prisma migrate resolve --rolled-back <migration_name>
```

Це розповідає Prisma: «ця міграція не застосована, не намагайся її повторити». **БД при цьому не змінюється.**

Потім створіть нову міграцію-фікс локально:

```bash
bun run db:migrate --name fix_broken_migration
```

Застосуйте на staging, перевірте, потім production.

### Варіант 2: Відновлення з бекапу (крайній захід)

```bash
# 1. Зупинити додаток
docker compose -f docker-compose.production.yml stop app

# 2. Відновити з бекапу
pg_restore -d $DATABASE_URL /backups/pre-migration-20250115-103000.dump

# 3. Запустити додаток
docker compose -f docker-compose.production.yml start app
```

> **Важливе попередження:** Prisma **не підтримує** автоматичний відкат (`prisma migrate rollback`). Для скасування змін потрібно вручну створити нову міграцію.

---

## 10. Чеклист небезпечних операцій

Перед застосуванням будь-якої міграції, що містить щось із нижченаведеного, **зупиніться і перевірте двічі**:

| Операція | Ризик | Що перевірити |
|---|---|---|
| `DROP TABLE` | **Незворотна втрата даних** | Чи точно таблиця не потрібна? Чи є бекап? |
| `DROP COLUMN` | **Незворотна втрата даних** | Чи не використовується колонка в коді? Чи є бекап? |
| `ALTER TYPE` (зміна enum) | Може впадати в транзакції PostgreSQL | Використовуйте `DO $$ BEGIN ... END $$` поза транзакцією |
| `ADD COLUMN ... NOT NULL` без `DEFAULT` | **Впаде** на таблиці з існуючими рядками | Додайте `@default(<значення>)` або спочатку додайте як nullable, потім заповніть, потім зробіть NOT NULL |

### Безпечний патерн для NOT NULL колонки

**Крок 1** — додайте як nullable:

```prisma
tipAmount Float?
```

```bash
bun run db:migrate --name add_tip_amount_nullable
```

**Крок 2** — після деплою на staging, заповніть значення і зробіть NOT NULL:

```prisma
tipAmount Float @default(0)
```

```bash
bun run db:migrate --name make_tip_amount_required
```

Prisma згенерує SQL з `DEFAULT 0`, який безпечно застосується до існуючих рядків.

---

## 11. Робочий процес SQLite-прототипування

Для швидких експериментів, коли не хочете піднімати Docker.

### Швидкий цикл

```bash
# 1. Внести зміну в prisma/schema.sqlite.prisma
# 2. Заштовхнути в SQLite
bun run db:push:sqlite

# 3. Згенерувати SQLite-клієнт
bun run db:generate:sqlite

# 4. Протестувати локально
bun run dev
```

### Обмеження та правила

- ⚠️ **Зміни тут не створюють файлів міграцій** — вони не потраплять в `prisma/migrations/`
- ⚠️ **Зміни потрібно вручну перенести** в канонічну схему `prisma/schema.prisma`
- ❌ **Ніколи не комітьте міграції з SQLite** — вони не сумісні з PostgreSQL
- ❌ **Не використовуйте SQLite для фінального тестування** — деякі функції PostgreSQL (enums, специфічні типи) не підтримуються

### Типовий потік

1. Експериментуєте в `schema.sqlite.prisma` з `db:push:sqlite`
2. Коли результат влаштовує — переносите зміни в `prisma/schema.prisma`
3. Створюєте міграцію через `bun run db:migrate --name <опис>` з PostgreSQL Docker

---

## 12. Швидкий довідник

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  MIGRATION QUICK REFERENCE — SushiChain                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🟢 ЛОКАЛЬНА РОЗРОБКА (PostgreSQL Docker)                              │
│  ────────────────────────────────────────                              │
│  bun run db:validate              # перевірка синтаксису схеми          │
│  bun run db:migrate --name <n>    # створити міграцію + застосувати    │
│  prisma db push                   # швидкий прототип (без міграцій)    │
│  bun run db:generate              # згенерувати Prisma-клієнт          │
│                                                                         │
│  🟡 STAGING (managed PostgreSQL)                                        │
│  ─────────────────────────────────                                      │
│  bun run db:validate              # переддеплойна перевірка             │
│  prisma migrate deploy            # застосувати pending-міграції       │
│  prisma migrate status            # перевірити статус міграцій          │
│                                                                         │
│  🔴 PRODUCTION (managed PostgreSQL)                                     │
│  ─────────────────────────────────                                      │
│  bun run db:backup                # бекап перед міграцією              │
│  prisma migrate deploy            # застосувати pending-міграції       │
│  prisma migrate status            # перевірити статус міграцій          │
│                                                                         │
│  🔵 SQLITE ПРОТОТИПУВАННЯ (тільки локально)                            │
│  ───────────────────────────────────────────                            │
│  bun run db:push:sqlite           # штовхнути в SQLite                 │
│  bun run db:generate:sqlite      # згенерувати SQLite-клієнт          │
│                                                                         │
│  🛠 ВІДНОВЛЕННЯ                                                      │
│  ─────────────                                                        │
│  prisma migrate resolve \                                                  │
│    --rolled-back <name>           # позначити як відкочену              │
│  bun run db:backup                # бекап                               │
│  bun run db:restore               # відновлення з бекапу                │
│                                                                         │
│  🚀 ДОПОМІЖНІ СКРИПТИ                                                 │
│  ─────────────────────                                                │
│  bun run pre-migration-check      # перевірка перед міграцією          │
│  bun run db:dev:start             # підняти PostgreSQL Docker          │
│  bun run db:dev:stop              # зупинити PostgreSQL Docker         │
│  bun run db:dev:reset             # зупинити + видалити томи           │
│  bun run migrate:staging          # деплой міграцій на staging         │
│  bun run migrate:prod             # деплой міграцій на production      │
│  bun run db:seed                  # заповнити тестовими даними          │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  🏆 ЗОЛОТІ ПРАВИЛА                                                     │
│                                                                         │
│   1. schema.prisma — єдине джерело істини (PostgreSQL)                 │
│   2. Міграції створюються тільки через db:migrate (dev)                │
│   3. Staging/production — тільки migrate deploy                        │
│   4. Ніколи не редагуйте закомічені migration.sql                      │
│   5. Ніколи не видаляйте файли міграцій                                 │
│   6. Комітьте схему + міграцію разом                                   │
│   7. Бекап перед production deploy                                     │
│   8. Завжди спочатку staging, потім production                         │
│   9. SQLite — тільки для прототипування, зміни переносити вручну      │
│  10. DATABASE_URL на staging/prod — заблокований для migrate dev       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Структура файлів

```
prisma/
├── schema.prisma                 # ← Канонічна схема (PostgreSQL)
├── schema.sqlite.prisma          # Дев-копія (SQLite, прототипування)
├── seed.ts                       # Тестові дані
└── migrations/
    └── <timestamp>_<name>/       # Кожна міграція — окрема папка
        └── migration.sql         # SQL для застосування
```

Після першої міграції структура буде такою:

```
prisma/migrations/
├── migration_lock.toml            # Провайдер БД для міграцій
└── 20260702235305_init/
    └── migration.sql
```

Кожна наступна міграція додає папку:

```
prisma/migrations/
├── migration_lock.toml
├── 20260702235305_init/
│   └── migration.sql
├── 20260703120000_add_tip_field/
│   └── migration.sql
└── 20260704150000_add_expedited_status/
    └── migration.sql
```---

## 13. Пов'язані документи

| Документ | Опис |
|---|---|
| [docs/FIRST_MIGRATION_STRATEGY.md](./FIRST_MIGRATION_STRATEGY.md) | Детальна стратегія першої міграції: init vs baseline, список таблиць/enums/індексів, ризики |
| [docs/PRE_MIGRATION_CHECKLIST.md](./PRE_MIGRATION_CHECKLIST.md) | Чек-лист (50+ пунктів) для перевірки готовності до першої міграції |
| [docs/ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | Повний довідник змінних оточення з прикладами для кожного середовища |
| [docs/STAGING_SETUP.md](./STAGING_SETUP.md) | Налаштування staging-середовища з PostgreSQL |

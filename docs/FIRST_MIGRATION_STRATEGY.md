# Стратегія першої міграції (INIT) — SushiChain

> **Повний план створення ініціальної міграції бази даних.**
> Цей документ — ПЛАН. Фактичне виконання `prisma migrate dev` здійснюється ТІЛЬКИ після командного рев'ю.

---

## 1. Рішення: Init, а не Baseline

### Чому це INIT-міграція

Проєкт SushiChain ще не має жодної міграції, а база даних — **порожня**, без існуючих production-даних. Тому використовується стандартний шлях Prisma:

```bash
bun run db:migrate --name init
```

Ця команда:
1. Порівнює поточну схему `prisma/schema.prisma` з порожньою БД
2. Генерує файл `prisma/migrations/<timestamp>_init/migration.sql` з усіма `CREATE TABLE`, `CREATE TYPE`, `CREATE INDEX`
3. Застосовує міграцію до локальної БД
4. Створює таблицю `_prisma_migrations` для відстеження історії

Результат — файл `migration.sql` з повною структурою БД з нуля.

### Коли використовувати Baseline замість Init

`prisma migrate resolve --applied <name>` (Baseline) потрібен **тільки** коли:

- В БД вже існують таблиці з даними, які **не можна відтворити**
- БД була створена вручну або через інший інструмент (наприклад, `prisma db push`)
- Дані занадто великі або критичні для пересоздання
- Міграційних файлів не існує, але БД вже працює

**SushiChain не потрапляє в жоден з цих випадків** — база порожня, дані відсутні, міграцій не було.

| Критерій | INIT (наш випадок) | Baseline |
|---|---|---|
| База даних | Порожня | Існуючі таблиці з даними |
| Дані | Немає (чистий старт) | Є, не можна втратити |
| Команда | `bun run db:migrate --name init` | `prisma migrate resolve --applied <name>` |
| Згенерований SQL | Повний `CREATE TABLE / TYPE / INDEX` | Порожній `migration.sql` |
| Застосування | Автоматичне при створенні | Вручну позначається як застосована |

---

## 2. Повний перелік таблиць (27 таблиць)

Усі таблиці створюються з моделів Prisma через директиву `@@map`. Нижче — повний список із ключовими колонками та tenant-областю.

### Таблиці без tenant-області (глобальні)

| # | Модель Prisma | Таблиця БД | Ключові колонки | Tenant (brandId) |
|---|---|---|---|---|
| 1 | `Brand` | `brands` | id, name, slug, isActive, currency | — (це сам tenant) |
| 2 | `UserSession` | `user_sessions` | id, userId, refreshToken, expiresAt | Немає (належить користувачу) |
| 3 | `UserAddress` | `user_addresses` | id, userId, street, latitude, longitude, isDefault | Немає (належить користувачу) |
| 4 | `ProductOptionGroup` | `product_option_groups` | id, productId, name, isRequired, maxChoices | Немає (через productId) |
| 5 | `ProductOption` | `product_options` | id, groupId, name, priceDelta | Немає (через groupId) |
| 6 | `CartItem` | `cart_items` | id, cartId, productId, quantity, selectedOptions, totalPrice | Немає (через cartId) |
| 7 | `OrderItem` | `order_items` | id, orderId, productId, productName, quantity, totalPrice | Немає (через orderId) |
| 8 | `Payment` | `payments` | id, orderId, method, status, amount, providerTxId | Немає (через orderId) |
| 9 | `LoyaltyTransaction` | `loyalty_transactions` | id, accountId, type, amount, balanceAfter | Немає (через accountId) |
| 10 | `CampaignMessage` | `campaign_messages` | id, campaignId, userId, channel, status | Немає (через campaignId) |
| 11 | `DeliveryAssignment` | `delivery_assignments` | id, orderId, courierId, status, assignedAt | Немає (через orderId) |

### Таблиці з tenant-областю (мають brandId)

| # | Модель Prisma | Таблиця БД | Ключові колонки | Tenant (brandId) |
|---|---|---|---|---|
| 12 | `User` | `users` | id, phone, email, passwordHash, role, brandId | ✅ (nullable — admin прив'язаний до бренду, super_admin — ні) |
| 13 | `Branch` | `branches` | id, brandId, name, slug, address, isOpen, workSchedule | ✅ |
| 14 | `DeliveryZone` | `delivery_zones` | id, branchId, name, deliveryFee, estimatedMinutes, polygonData | Немає (через branchId → brandId) |
| 15 | `Category` | `categories` | id, brandId, branchId, name, slug, sortOrder, isActive | ✅ (branchId nullable) |
| 16 | `Product` | `products` | id, brandId, categoryId, branchId, name, slug, price, tags, allergens, isAvailable | ✅ |
| 17 | `FavoriteProduct` | `favorite_products` | id, userId, brandId, productId | ✅ |
| 18 | `Cart` | `carts` | id, userId, brandId, branchId | ✅ |
| 19 | `Order` | `orders` | id, orderNumber, userId, brandId, branchId, type, status, subtotal, total, createdAt | ✅ |
| 20 | `Promotion` | `promotions` | id, code, name, type, value, minOrder, maxUses, startDate, endDate, status, brandId | ✅ |
| 21 | `LoyaltyAccount` | `loyalty_accounts` | id, userId, brandId, balance, lifetime, tier | ✅ |
| 22 | `Review` | `reviews` | id, userId, brandId, productId, orderId, rating, comment, isApproved | ✅ |
| 23 | `Feedback` | `feedbacks` | id, userId, brandId, branchId, orderId, type, status, message | ✅ |
| 24 | `Campaign` | `campaigns` | id, brandId, name, type, status, subject, body, targetSegment, channel | ✅ |
| 25 | `Courier` | `couriers` | id, brandId, name, phone, isActive | ✅ |
| 26 | `MenuTranslation` | `menu_translations` | id, brandId, locale, entityType, entityId, name, description | ✅ |
| 27 | `BrandSettings` | `brand_settings` | id, brandId, enableGuestOrders, enableLoyalty, enableReviews, loyaltyRate | ✅ (1:1 з Brand) |

---

## 3. Перелік enum-типів (11 enum)

Prisma генерує PostgreSQL `CREATE TYPE ... AS ENUM` для кожного enum-типу.

| # | Enum Prisma | Значення | Використання |
|---|---|---|---|
| 1 | `OrderType` | `delivery`, `pickup` | Order.type |
| 2 | `OrderStatus` | `new`, `confirmed`, `cooking`, `ready`, `delivering`, `completed`, `cancelled` | Order.status |
| 3 | `PaymentStatus` | `pending`, `processing`, `succeeded`, `failed`, `refunded` | Payment.status |
| 4 | `PaymentMethod` | `card`, `cash`, `bonus` | Payment.method |
| 5 | `PromotionType` | `percentage`, `fixed`, `free_delivery`, `bonus` | Promotion.type |
| 6 | `PromotionStatus` | `active`, `inactive`, `expired` | Promotion.status |
| 7 | `LoyaltyTransactionType` | `earned`, `spent`, `adjusted`, `expired` | LoyaltyTransaction.type |
| 8 | `FeedbackType` | `order_issue`, `general`, `suggestion`, `complaint` | Feedback.type |
| 9 | `FeedbackStatus` | `new`, `in_progress`, `resolved`, `closed` | Feedback.status |
| 10 | `CampaignType` | `win_back`, `promo`, `notification` | Campaign.type |
| 11 | `CampaignStatus` | `draft`, `active`, `paused`, `completed` | Campaign.status |

> **Примітка:** `CampaignStatus` не зазначений у початковому плані як окремий enum, але присутній у схемі і буде створений.

---

## 4. Стратегія індексування (45 індексів)

Усі індекси походять з директив `@@index` у схемі. Згруповані за призначенням.

### 4.1 Tenant-індекси (brandId) — ізоляція даних за брендом

| # | Таблиця | Колонка | Призначення |
|---|---|---|---|
| 1 | `users` | `[brandId]` | Фільтрація користувачів бренду |
| 2 | `branches` | `[brandId]` | Отримання філій бренду |
| 3 | `categories` | `[brandId]` | Фільтрація категорій бренду |
| 4 | `products` | `[brandId]` | Фільтрація продуктів бренду |
| 5 | `favorite_products` | `[brandId]` | Фільтрація улюблених за брендом |
| 6 | `orders` | `[brandId]` | Отримання замовлень бренду |
| 7 | `promotions` | `[brandId]` | Отримання акцій бренду |
| 8 | `loyalty_accounts` | `[brandId]` | Фільтрація лояльності за брендом |
| 9 | `reviews` | `[brandId]` | Фільтрація відгуків бренду |
| 10 | `feedbacks` | `[brandId]` | Фільтрація зворотного зв'язку бренду |
| 11 | `campaigns` | `[brandId]` | Отримання кампаній бренду |
| 12 | `couriers` | `[brandId]` | Отримання кур'єрів бренду |
| 13 | `menu_translations` | `[brandId]` | Отримання перекладів бренду |

### 4.2 FK-індекси (foreign key lookups)

| # | Таблиця | Колонка | Призначення |
|---|---|---|---|
| 14 | `user_sessions` | `[userId]` | Пошук сесій користувача |
| 15 | `user_addresses` | `[userId]` | Пошук адрес користувача |
| 16 | `delivery_zones` | `[branchId]` | Зони доставки філії |
| 17 | `categories` | `[branchId]` | Категорії філії |
| 18 | `products` | `[categoryId]` | Продукти категорії |
| 19 | `products` | `[branchId]` | Продукти філії |
| 20 | `product_option_groups` | `[productId]` | Групи опцій продукту |
| 21 | `product_options` | `[groupId]` | Опції в групі |
| 22 | `favorite_products` | `[userId]` | Улюблені користувача |
| 23 | `carts` | `[userId]` | Кошики користувача |
| 24 | `carts` | `[branchId]` | Кошики філії |
| 25 | `cart_items` | `[cartId]` | Позиції кошика |
| 26 | `orders` | `[userId]` | Замовлення користувача |
| 27 | `orders` | `[branchId]` | Замовлення філії |
| 28 | `orders` | `[promotionId]` | Замовлення з акцією |
| 29 | `order_items` | `[orderId]` | Позиції замовлення |
| 30 | `payments` | `[orderId]` | Оплати замовлення |
| 31 | `loyalty_accounts` | `[userId]` | Рахунки лояльності користувача |
| 32 | `loyalty_transactions` | `[accountId]` | Транзакції лояльності |
| 33 | `loyalty_transactions` | `[relatedOrderId]` | Транзакції за замовленням |
| 34 | `reviews` | `[userId]` | Відгуки користувача |
| 35 | `reviews` | `[productId]` | Відгуки продукту |
| 36 | `reviews` | `[orderId]` | Відгуки замовлення |
| 37 | `feedbacks` | `[userId]` | Зворотний зв'язок користувача |
| 38 | `feedbacks` | `[orderId]` | Зворотний зв'язок замовлення |
| 39 | `campaign_messages` | `[campaignId]` | Повідомлення кампанії |
| 40 | `campaign_messages` | `[userId]` | Повідомлення користувача |
| 41 | `couriers` | `[courierId]` | **← таблиця delivery_assignments** |
| 42 | `delivery_assignments` | `[courierId]` | Призначення кур'єра |

### 4.3 Індекси оптимізації запитів

| # | Таблиця | Колонка | Призначення |
|---|---|---|---|
| 43 | `products` | `[isAvailable]` | Фільтрація доступних продуктів |
| 44 | `orders` | `[status]` | Фільтрація замовлень за статусом |
| 45 | `orders` | `[createdAt]` | Сортування замовлень за датою |
| 46 | `campaigns` | `[status]` | Фільтрація кампаній за статусом |

---

## 5. Унікальні обмеження (14 unique constraints)

Унікальні обмеження створюються з `@unique` на полях та `@@unique` на композиціях.

| # | Таблиця | Обмеження | Тип |
|---|---|---|---|
| 1 | `brands` | `slug` | `@unique` на полі |
| 2 | `users` | `phone` | `@unique` на полі (nullable) |
| 3 | `users` | `email` | `@unique` на полі (nullable) |
| 4 | `user_sessions` | `refreshToken` | `@unique` на полі |
| 5 | `branches` | `[brandId, slug]` | `@@unique` — унікальний slug в межах бренду |
| 6 | `categories` | `[brandId, branchId, slug]` | `@@unique` — унікальний slug в межах бренду + філії |
| 7 | `carts` | `[userId, brandId]` | `@@unique` — один кошик на користувача/бренд |
| 8 | `loyalty_accounts` | `[userId, brandId]` | `@@unique` — один рахунок лояльності на користувача/бренд |
| 9 | `favorite_products` | `[userId, productId]` | `@@unique` — один запис улюбленого на пару |
| 10 | `promotions` | `[brandId, code]` | `@@unique` — унікальний промокод в межах бренду |
| 11 | `menu_translations` | `[brandId, locale, entityType, entityId]` | `@@unique` — одна перекладена сутність на мову |
| 12 | `orders` | `orderNumber` | `@unique` на полі |
| 13 | `delivery_assignments` | `orderId` | `@unique` на полі — одне призначення на замовлення |
| 14 | `brand_settings` | `brandId` | `@unique` на полі — один запис налаштувань на бренд |

---

## 6. Ризики та пом'якшення

### 6.1 Prisma генерує DROP+ADD замість RENAME

**Ризик:** При перейменуванні колонки Prisma може згенерувати `DROP COLUMN` + `ADD COLUMN` замість `RENAME COLUMN`. Це призведе до **втрати даних** на таблицях з існуючими рядками.

**Пом'якшення:** Для INIT-міграції це **не актуально** — база порожня, даних втратити неможливо. Але для **майбутніх** міграцій — обов'язково переглядати згенерований SQL і замінювати `DROP+ADD` на `RENAME`:

```sql
-- ❌ Неправильно (Prisma за замовчуванням)
ALTER TABLE "products" DROP COLUMN "name";
ALTER TABLE "products" ADD COLUMN "title" TEXT NOT NULL;

-- ✅ Правильно (виправте вручну)
ALTER TABLE "products" RENAME COLUMN "name" TO "title";
```

### 6.2 ADD COLUMN NOT NULL без DEFAULT

**Ризик:** Додавання колонки `NOT NULL` без значення за замовчуванням впаде на таблиці з існуючими рядками.

**Пом'якшення:** Для INIT-міграції — не актуально (порожня БД). Для майбутніх міграцій використовувати двокроковий патерн:

```prisma
// Крок 1: nullable
tipAmount Float?

// Крок 2: після деплою — NOT NULL з DEFAULT
tipAmount Float @default(0)
```

### 6.3 Додавання значень в enum в транзакції (обмеження PostgreSQL)

**Ризик:** `ALTER TYPE ... ADD VALUE` не може виконуватись всередині транзакції в PostgreSQL. Prisma обгортає міграції в транзакції.

**Пом'якшення:** Для INIT-міграції — не актуально (усі enum створюються з нуля через `CREATE TYPE`). Для майбутніх міграцій — використовувати `DO $$ BEGIN ... EXCEPTION` блок:

```sql
DO $$ BEGIN
    ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'expedited';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

### 6.4 Втрата файлів міграцій

**Ризик:** Якщо файли міграцій видалені або не закомічені, `prisma migrate deploy` на staging/production не зможе визначити, які міграції вже застосовані.

**Пом'якшення:**
- **Завжди комітити `schema.prisma` + `prisma/migrations/` РАЗОМ** в одному коміті
- **Ніколи не видаляти файли міграцій** після коміту
- Використовувати `.gitignore` для `prisma/migrations/` — **ЗАБОРОНЕНО**

### 6.5 Хтось запускає migrate dev на staging/production

**Ризик:** `prisma migrate dev` створює нові файли міграцій і модифікує схему на льоту. На staging/production це може **зруйнувати базу даних**.

**Пом'якшення:**
- **Дисципліна env-файлів:** `DATABASE_URL` в `.env` завжди вказує на локальну БД
- **Документація:** цей документ + `MIGRATION_WORKFLOW.md` чітко розмежовують команди за середовищами
- **Навчання команди:** всі розробники мають знати «золоті правила» міграцій
- **CI/CD:** staging/production використовують тільки `prisma migrate deploy`

### 6.6 JSON-поля (promoBannerUrls, workSchedule, polygonData, selectedOptions тощо)

**Ризик:** JSON-поля можуть викликати проблеми з валідацією та запитами.

**Пом'якшення:** PostgreSQL має нативну підтримку JSON (`Json` → `jsonb` в PG). Це **безпечно**:
- `promoBannerUrls` (Brand) — масив URL-банерів
- `workSchedule` (Branch) — розклад роботи
- `polygonData` (DeliveryZone) — координати полігону зони доставки
- `selectedOptions` (CartItem, OrderItem) — вибрані опції продукту
- `addressSnapshot` (Order) — знімок адреси доставки
- `providerPayload` (Payment) — payload від платіжного провайдера

Валідація JSON відбувається на рівні application-коду (Zod/Joi), а не на рівні БД.

### 6.7 String[] поля (tags, allergens на Product)

**Ризик:** Масиви рядків можуть не підтримуватися деякими БД.

**Пом'якшення:** PostgreSQL повністю підтримує нативні масиви. Prisma `String[]` → `text[]` в PG. Це **безпечно** і не потребує жодних обхідних шляхів:
- `tags` — теги продукту (`["роли", "сети", "вегетарианское"]`)
- `allergens` — алергени (`["глютен", "молоко", "орехи"]`)

### 6.8 Немає існуючих даних для втрати (INIT)

**Це ПОЗИТИВ, а не ризик.** Оскільки це перша міграція на порожній БД:
- Немає даних для втрати
- Всі `CREATE TABLE` створюються з нуля
- Немає конфліктів з існуючими об'єктами
- `DROP + ADD` замість `RENAME` безпечний (нема даних)
- `ADD COLUMN NOT NULL` без `DEFAULT` безпечний (нема рядків)
- Enum-значення створюються повністю з першого разу

> **Єдина вимога:** переконатися, що локальна БД дійсно порожня перед запуском міграції.

---

## 7. Очікувана структура SQL-міграції

Файл `prisma/migrations/<timestamp>_init/migration.sql` буде містити SQL у такому порядку:

### 7.1 CREATE TYPE — enum-типи (11 штук)

```sql
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('delivery', 'pickup');
CREATE TYPE "OrderStatus" AS ENUM ('new', 'confirmed', 'cooking', 'ready', 'delivering', 'completed', 'cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'cash', 'bonus');
CREATE TYPE "PromotionType" AS ENUM ('percentage', 'fixed', 'free_delivery', 'bonus');
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'inactive', 'expired');
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('earned', 'spent', 'adjusted', 'expired');
CREATE TYPE "FeedbackType" AS ENUM ('order_issue', 'general', 'suggestion', 'complaint');
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'in_progress', 'resolved', 'closed');
CREATE TYPE "CampaignType" AS ENUM ('win_back', 'promo', 'notification');
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'completed');
```

### 7.2 CREATE TABLE — таблиці (27 штук, у порядку FK-залежностей)

Prisma генерує таблиці в порядку, що забезпечує коректне створення foreign keys. Приблизний порядок:

```sql
-- CreateTable (немає FK залежностей)
CREATE TABLE "brands" (...);

-- CreateTable (залежить від brands)
CREATE TABLE "users" (...);
CREATE TABLE "branches" (...);
CREATE TABLE "brand_settings" (...);
CREATE TABLE "categories" (...);
CREATE TABLE "products" (...);
CREATE TABLE "promotions" (...);
CREATE TABLE "loyalty_accounts" (...);
CREATE TABLE "reviews" (...);
CREATE TABLE "feedbacks" (...);
CREATE TABLE "campaigns" (...);
CREATE TABLE "couriers" (...);
CREATE TABLE "menu_translations" (...);

-- CreateTable (залежить від users)
CREATE TABLE "user_sessions" (...);
CREATE TABLE "user_addresses" (...);
CREATE TABLE "carts" (...);
CREATE TABLE "favorite_products" (...);

-- CreateTable (залежить від branches)
CREATE TABLE "delivery_zones" (...);

-- CreateTable (залежить від products)
CREATE TABLE "product_option_groups" (...);

-- CreateTable (залежить від product_option_groups)
CREATE TABLE "product_options" (...);

-- CreateTable (залежить від carts, products)
CREATE TABLE "cart_items" (...);

-- CreateTable (залежить від orders, products)
CREATE TABLE "order_items" (...);

-- CreateTable (залежить від orders)
CREATE TABLE "payments" (...);
CREATE TABLE "delivery_assignments" (...);

-- CreateTable (залежить від loyalty_accounts)
CREATE TABLE "loyalty_transactions" (...);

-- CreateTable (залежить від campaigns)
CREATE TABLE "campaign_messages" (...);
```

### 7.3 CREATE INDEX — індекси (45 штук)

```sql
--.CreateIndex
CREATE INDEX "users_brandId_idx" ON "users"("brandId");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");
CREATE INDEX "user_addresses_userId_idx" ON "user_addresses"("userId");
CREATE INDEX "branches_brandId_idx" ON "branches"("brandId");
-- ... ще ~41 індекс ...
```

### 7.4 CREATE UNIQUE INDEX — унікальні обмеження (14 штук)

```sql
-- CreateIndex (unique)
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");
CREATE UNIQUE INDEX "branches_brandId_slug_key" ON "branches"("brandId", "slug");
-- ... ще ~9 унікальних індексів ...
```

### 7.5 ALTER TABLE — foreign key обмеження

Prisma може генерувати FK як частину `CREATE TABLE` або як окремі `ALTER TABLE`. Це залежить від версії Prisma та порядку створення таблиць.

```sql
-- AddForeignKey (якщо не вбудовані в CREATE TABLE)
ALTER TABLE "users" ADD CONSTRAINT "users_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- ... ще ~30+ FK ...
```

---

## 8. Постміграційна перевірка

Після застосування міграції виконайте наступні кроки для верифікації:

### 8.1 Перевірка кількості об'єктів

```sql
-- Підключитися до БД
docker compose -f docker-compose.dev.yml exec postgres psql -U sushichain -d sushichain_dev

-- Перевірити кількість таблиць (має бути 27 + _prisma_migrations = 28)
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Очікувано: 28 (27 таблиць проєкту + _prisma_migrations)

-- Перевірити кількість enum-типів (має бути 11)
SELECT count(*) FROM pg_type
WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace;
-- Очікувано: 11

-- Перевірити кількість індексів (має бути ~45 + PK-індекси + унікальні)
SELECT count(*) FROM pg_indexes
WHERE schemaname = 'public';
-- Очікувано: ~90+ (PK + @@index + @@unique + автоматичні)
```

### 8.2 Запуск seed-даних

```bash
bun run db:seed
```

Перевірте, що тестові дані створені коректно:
- Бренд створений з настройками
- Філії створені з зонами доставки
- Категорії та продукти присутні
- Користувач-адмін створений

### 8.3 Передміграційна перевірка

```bash
bun run pre-migration-check
```

Всі перевірки мають бути пройдені.

### 8.4 Збірка TypeScript

```bash
bun run build
```

Якщо є помилки типізації — виправте код, що використовує змінену схему.

### 8.5 Чеклист перевірки

- [ ] Кількість таблиць: **27** (плюс `_prisma_migrations`)
- [ ] Кількість enum-типів: **11**
- [ ] Кількість @@index індексів: **45**
- [ ] Кількість унікальних обмежень: **14**
- [ ] Seed-дані успішно створені
- [ ] `pre-migration-check` пройдено без помилок
- [ ] `bun run build` завершився успішно
- [ ] `bun run lint` завершився без помилок
- [ ] Адмін-панель завантажується без помилок
- [ ] Сторінка замовлень відображає таблицю

---

## 9. ⚠️ НЕ ВИКОНУЙТЕ — Це лише план

> **Цей документ є ПЛАНОМ підготовки до першої міграції.**
>
> Фактичне виконання команди `prisma migrate dev` **НЕ було здійснено** в рамках підготовки цього документа.
>
> Міграція повинна бути створена **ТИЛЬКИ після**:
> 1. Командного рев'ю цього документа
> 2. Підтвердження, що `prisma/schema.prisma` фінальний
> 3. Запуску `bun run pre-migration-check` з позитивним результатом
> 4. Переконання, що локальна БД порожня

### Що зробити після рев'ю

```bash
# 1. Підняти PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 2. Перевірити готовність
docker compose -f docker-compose.dev.yml exec postgres pg_isready

# 3. Запустити передміграційну перевірку
bun run pre-migration-check

# 4. Створити міграцію
bun run db:migrate --name init

# 5. Перевірити згенерований SQL
cat prisma/migrations/$(ls -t prisma/migrations/ | head -1)/migration.sql

# 6. Запустити seed
bun run db:seed

# 7. Збірка
bun run build

# 8. Закомітити
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): initial migration — create all 27 tables with indexes and enums"
```

---

## Додаток: Порівняння Init vs Baseline

```
┌─────────────────────────────────────────────────────────────────────┐
│              FIRST MIGRATION — INIT vs BASELINE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INIT (✅ наш вибір)                                                │
│  ───────────────────                                                │
│  • База порожня, немає даних                                       │
│  • bun run db:migrate --name init                                  │
│  • Генерує повний CREATE TABLE / TYPE / INDEX                      │
│  • Застосовує міграцію автоматично                                 │
│  • migration_lock.toml створюється автоматично                     │
│                                                                     │
│  BASELINE (❌ не наш випадок)                                       │
│  ────────────────────────────                                       │
│  • База існує з даними, які не можна втратити                     │
│  • Створюється пустий migration.sql                               │
│  • prisma migrate resolve --applied <name>                         │
│  • Позначає існуючий стан як "застосований"                       │
│  • Потрібен ручний експорт існуючої схеми                         │
│                                                                     │
│  SushiChain: INIT, бо база порожня, проект новий                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
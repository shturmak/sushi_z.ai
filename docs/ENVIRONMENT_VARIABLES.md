# Змінні оточення SushiChain — Повний довідник

> Останнє оновлення: 2025
> Канонічне джерело: `.env.example`

---

## 1. Огляд

SushiChain — це мультитенантна платформа для доставки їжі (Next.js 16 + Prisma + PostgreSQL). Усі середовища використовують **PostgreSQL 16**; канонічна схема визначена у файлі `prisma/schema.prisma`.

Змінні оточення керують підключенням до бази даних, аутентифікацією JWT, платіжним шлюзом LiqPay, Telegram-сповіщеннями, алертингом помилок та логуванням.

### Ключові принципи

- **Обов'язкові** змінні мають бути задані в кожному середовищі — без них додаток не запуститься.
- **Необов'язкові** змінні ввімкнюють додатковий функціонал (Telegram, Sentry); якщо не задані — функціонал просто не активується.
- Змінні з префіксом `NEXT_PUBLIC_` потрапляють у клієнтський бандл — **ніколи** не зберігайте там секрети.

---

## 2. Файли середовища

| Файл | Призначення | Коментар |
|---|---|---|
| `.env.example` | Шаблон із усіма змінними та коментарями | Комітується у репозиторій |
| `.env.development` | Локальна розробка | Створюється вручну: `cp .env.example .env.development` |
| `.env.staging` | Staging-середовище | Створюється вручну, використовується `docker-compose.staging.yml` |
| `.env.production` | Продакшн | Створюється вручну, використовується `docker-compose.yml` |

> **Увага:** жоден з файлів `.env.*` (окрім `.env.example`) не комітується до Git. Додано до `.gitignore`.

---

## 3. Довідник змінних

### 3.1. Загальний огляд (таблиця)

| Змінна | Обов'язкова? | Група |
|---|---|---|
| `NODE_ENV` | ✅ Так | Додаток |
| `NEXT_PUBLIC_APP_URL` | ✅ Так | Додаток |
| `BRAND_DOMAIN` | ✅ Так | Додаток |
| `DATABASE_URL` | ✅ Так | База даних |
| `DIRECT_URL` | ❌ Ні | База даних |
| `JWT_SECRET` | ✅ Так | Аутентифікація |
| `JWT_REFRESH_SECRET` | ✅ Так | Аутентифікація |
| `PAYMENT_PROVIDER` | ✅ Так | Платежі |
| `LIQPAY_PUBLIC_KEY` | ✅ Так | Платежі |
| `LIQPAY_PRIVATE_KEY` | ✅ Так | Платежі |
| `TELEGRAM_BOT_TOKEN` | ❌ Ні | Telegram Bot |
| `TELEGRAM_CHAT_ID` | ❌ Ні | Telegram Bot |
| `TELEGRAM_ALERT_BOT_TOKEN` | ❌ Ні | Алертинг |
| `TELEGRAM_ALERT_CHAT_ID` | ❌ Ні | Алертинг |
| `SENTRY_DSN` | ❌ Ні | Алертинг |
| `LOG_LEVEL` | ❌ Ні | Логування |
| `NEXTAUTH_URL` | ❌ Ні | NextAuth |
| `NEXTAUTH_SECRET` | ❌ Ні | NextAuth |

---

### 3.2. Детальний опис за групами

---

#### 🏗 Додаток

##### `NODE_ENV`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Визначає поточне середовище. Впливає на логування (JSON у production, кольоровий вивід у dev), Prisma Client кешування та поведінку middleware. |
| **Значення** | `development` \| `staging` \| `production` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `development` |
| Staging | `staging` |
| Production | `production` |

**Примітки безпеки:**
- У production режимі логгер ховає stack trace з помилок (див. `src/lib/logger.ts`).
- `NODE_ENV=production` примусово встановлюється у `docker-compose.yml` через блок `environment`.

---

##### `NEXT_PUBLIC_APP_URL`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Публічна URL-адреса додатку, доступна на клієнтській стороні. Використовується для генерації callback URL платіжного шлюзу (`server_url` у LiqPay), побудови абсолютних посилань тощо. |
| **Формат** | `https://` або `http://` + домен (+ порт для локальної розробки) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `http://localhost:3000` |
| Staging | `https://staging.sushichain.ua` |
| Production | `https://sushichain.ua` |

**Примітки безпеки:**
- ⚠️ **Ця змінна має префікс `NEXT_PUBLIC_`** — вона потрапляє у клієнтський JavaScript-бандл. Не зберігайте в ній секрети. Значення є публічним за визначенням.

---

##### `BRAND_DOMAIN`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Базовий домен для маршрутизації за субдоменами брендів. Використовується у `src/middleware.ts` для визначення slug бренда з субдомену (наприклад, `sushi-master.sushichain.ua` → slug `sushi-master`). |
| **Формат** | Домен без протоколу та слешу |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `localhost` |
| Staging | `staging.sushichain.ua` |
| Production | `sushichain.ua` |

**Як це працює:**
- Production: `BRAND_DOMAIN=sushichain.ua` → хост `sushi-master.sushichain.ua` дає slug `sushi-master`
- Staging: `BRAND_DOMAIN=staging.sushichain.ua` → хост `sushi-master.staging.sushichain.ua` дає slug `sushi-master`
- Development: `BRAND_DOMAIN=localhost` → субдомени не визначаються, бренд обирається через `?brand=<slug>` або `/b/<slug>/`

**Примітки безпеки:** Не містить секретів, але неправильне значення може призвести до витоку даних між брендами.

---

#### 🗄 База даних

##### `DATABASE_URL`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Рядок підключення PostgreSQL для Prisma Client. Використовується як основне з'єднання для всіх запитів до бази даних. |
| **Формат** | `postgresql://user:pass@host:5432/dbname?schema=public` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `postgresql://sushichain:sushichain_dev@localhost:5432/sushichain_dev?schema=public` |
| Staging (локальна БД) | `postgresql://sushichain:sushichain_staging@db:5432/sushichain_staging?schema=public` |
| Staging (Supabase) | `postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=public` |
| Production (Docker) | `postgresql://sushichain:[password]@postgres:5432/sushichain?schema=public` |

**Примітки безпеки:**
- 🔴 **СЕКРЕТ** — містить пароль до бази даних у відкритому вигляді.
- Ніколи не комітуйте `.env` файли з реальними паролями.
- Використовуйте різні паролі для кожного середовища.
- При використанні Supabase PGBouncer — вкажіть порт `6543` (connection pooler), а не `5432`.

---

##### `DIRECT_URL`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Пряме підключення до PostgreSQL, що оминає connection pooler (наприклад, Supabase PGBouncer). Потрібне для виконання міграцій Prisma, оскільки PGBouncer не підтримує деякі команди, необхідні для міграцій. |
| **Формат** | `postgresql://user:pass@host:5432/dbname?schema=public` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не потрібна* (пряме підключення через `DATABASE_URL`) |
| Staging (Supabase) | `postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?schema=public` |
| Production (Supabase) | `postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres?schema=public` |

**Примітки безпеки:**
- 🔴 **СЕКРЕТ** — містить пароль до бази даних.
- У конфігурації Prisma (`prisma/schema.prisma`) задається через `directUrl` у блоці `datasources`.

---

#### 🔐 Аутентифікація (JWT)

##### `JWT_SECRET`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Секрет для підпису JWT access-токенів. Використовується в `src/lib/auth.ts` разом з алгоритмом HS256. Access-токен діє 15 хвилин. |
| **Вимоги** | Щонайменше **32 символи**, випадкова строка високої ентропії |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `dev-super-secret-key-change-me-2024-at-least-32` |
| Staging | `staging-jwt-secret-[random-32+-chars]` |
| Production | `prod-jwt-[cryptographically-random-64+-chars]` |

**Примітки безпеки:**
- 🔴 **КРИТИЧНИЙ СЕКРЕТ** — при компрометації зловмисник може створювати довільні JWT-токени з будь-якими ролями (включно з `super_admin`).
- Генеруйте через `openssl rand -hex 32` або `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- У коді є fallback-значення для локальної розробки (`sushichain-super-secret-key-change-in-production-2024`), але воно **ніколи** не повинно використовуватися в staging/production.
- Змінюйте секрет регулярно та при підозрі на витік.

---

##### `JWT_REFRESH_SECRET`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Окремий секрет для підпису JWT refresh-токенів. Використовується в `src/lib/auth.ts` з алгоритмом HS256. Refresh-токен діє 30 днів. Має відрізнятися від `JWT_SECRET`. |
| **Вимоги** | Щонайменше **32 символи**, відрізняється від `JWT_SECRET` |

> ⚠️ У коді змінна читається як `process.env.REFRESH_SECRET` (без префікса `JWT_`), але у `.env.example` та цій документації використовується назва `JWT_REFRESH_SECRET`. Переконайтеся, що у вашому `.env` файлі використовується саме та назва, яку чекає код (`REFRESH_SECRET`).

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `dev-refresh-secret-key-change-me-2024-at-least-32` |
| Staging | `staging-refresh-[random-32+-chars]` |
| Production | `prod-refresh-[cryptographically-random-64+-chars]` |

**Примітки безпеки:**
- 🔴 **КРИТИЧНИЙ СЕКРЕТ** — при компрометації зловмисник може отримувати безстрокові сесії.
- Повинен відрізнятися від `JWT_SECRET` — у разі витоку одного секрету інший залишається безпечним.
- Генеруйте незалежно від `JWT_SECRET`.

---

#### 💳 Платежі (LiqPay)

##### `PAYMENT_PROVIDER`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Визначає активного платіжного провайдера. Реєстр провайдерів у `src/lib/payments/index.ts`. Наразі підтримується лише LiqPay. |
| **Значення** | `liqpay` \| `liqpay_sandbox` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `liqpay_sandbox` |
| Staging | `liqpay_sandbox` |
| Production | `liqpay` |

**Примітки безпеки:**
- `liqpay_sandbox` використовує тестові ключі LiqPay — платежі не реальні.
- Переконайтеся, що в production встановлено `liqpay`, інакше реальні платежі не оброблятимуться.

---

##### `LIQPAY_PUBLIC_KEY`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Публічний ключ LiqPay (отримується у кабінеті LiqPay). Використовується для формування платежу у `src/lib/payments/liqpay.ts`. |
| **Формат** | Рядок, що складається з цифр (наприклад, `i12345678901`) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `sandbox_i00000000001` |
| Staging | `sandbox_i00000000001` |
| Production | `i12345678901` |

**Примітки безпеки:**
- 🟡 Технічно не секрет (відправляється у клієнтський бандл LiqPay), але не варто поширювати тестові ключі поза командою.

---

##### `LIQPAY_PRIVATE_KEY`

| | |
|---|---|
| **Обов'язкова** | ✅ Так |
| **Опис** | Приватний ключ LiqPay (СЕКРЕТ). Використовується для підпису SHA1 платежів та перевірки callback-сигнатур у `src/lib/payments/liqpay.ts`. |
| **Формат** | Рядок (увидаляється як довга випадкова строка) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `sandbox_abc123def456...` |
| Staging | `sandbox_abc123def456...` |
| Production | `[реальний приватний ключ від LiqPay]` |

**Примітки безпеки:**
- 🔴 **КРИТИЧНИЙ СЕКРЕТ** — при компрометації зловмисник може підробляти платежі та callback-и.
- Ніколи не потрапляє на клієнт (використовується лише на сервері).
- Зберігайте лише у серверних `.env` файлах та в секретах хостингу.
- При підозрі на витік — негайно генеруйте новий ключ у кабінеті LiqPay.

---

#### 🤖 Telegram Bot (сповіщення клієнтів)

##### `TELEGRAM_BOT_TOKEN`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Токен Telegram-бота для сповіщення клієнтів про замовлення. Використовується у `mini-services/telegram-bot/index.ts`. Якщо не задано — бот не запускається. |
| **Формат** | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` (отримується від @BotFather) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не задано* або тестовий токен |
| Staging | `123456789:ABCdef_test_staging_token` |
| Production | `987654321:ZYXwvu_real_production_token` |

**Примітки безпеки:**
- 🔴 **СЕКРЕТ** — повний контроль над ботом.
- Ніколи не комітуйте. Використовуйте секрети Docker / хостинг-провайдера.

---

##### `TELEGRAM_CHAT_ID`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | ID чату за замовчуванням для відправки сповіщень про замовлення. |
| **Формат** | Ціле число (негативне для груп/каналів) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не задано* |
| Staging | `-1001234567890` |
| Production | `-1009876543210` |

**Примітки безпеки:**
- 🟡 Не секрет, але не варто робити чат публічним, якщо він містить дані замовлень.

---

#### 🚨 Алертинг (сповіщення про помилки)

##### `TELEGRAM_ALERT_BOT_TOKEN`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Токен окремого Telegram-бота для алертів про помилки. Використовується у `src/lib/error-handler.ts`. Рекомендується використовувати окремого бота від клієнтського. |
| **Формат** | `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не задано* |
| Staging | `111222333:alert_bot_staging_token` |
| Production | `444555666:alert_bot_production_token` |

**Примітки безпеки:**
- 🔴 **СЕКРЕТ** — використовуйте окремого бота від клієнтського для ізоляції.

---

##### `TELEGRAM_ALERT_CHAT_ID`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | ID чату (групи або каналу), куди відправляються алерти про помилки з `src/lib/error-handler.ts`. Алерти відправляються fire-and-forget і не блокують основний потік. |
| **Формат** | Ціле число (негативне для груп/каналів) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не задано* |
| Staging | `-1001112223333` |
| Production | `-1004445556666` |

**Примітки безпеки:**
- 🟡 Алерти містять stack traces та дані контексту — чат має бути приватним, лише для команди розробників.

---

##### `SENTRY_DSN`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Data Source Name Sentry для відстеження помилок. Якщо задано — `src/lib/error-handler.ts` логує інформацію про готовність відправки до Sentry. Повна інтеграція з Sentry SDK — у планах (наразі лише логування). |
| **Формат** | `https://[key]@sentry.io/[project-id]` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | *не задано* |
| Staging | `https://abc123@sentry.io/456` |
| Production | `https://def789@sentry.io/789` |

**Примітки безпеки:**
- 🟡 DSN технічно є публічним ідентифікатором проекту, але варто обмежити доступ.

---

#### 📝 Логування

##### `LOG_LEVEL`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Мінімальний рівень логування. Впливає на структурований логгер у `src/lib/logger.ts`. |
| **Значення** | `debug` \| `info` \| `warn` \| `error` |
| **За замовчуванням** | `debug` (якщо `NODE_ENV != production`), `info` (в production) |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `debug` |
| Staging | `debug` |
| Production | `info` або `warn` |

**Поведінка логгера:**
- **Development**: кольоровий вивід з ANSI-кодами, stack traces включено
- **Production**: JSON-формат (придатний для парсингу log-колекторами), stack traces виключені
- Усі fatal-помилки (ECONNREFUSED, database errors, out of memory тощо) автоматично підвищуються до рівня `fatal` та можуть triggerити Telegram-алерт

**Примітки безпеки:**
- 🟡 На рівні `debug` у production можуть логуватися дані запитів — використовуйте `info` або вище.

---

#### 🔑 NextAuth

##### `NEXTAUTH_URL`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Перевизначає URL, який NextAuth використовує для callback-ів. Якщо не задано — NextAuth визначає URL автоматично з заголовків запиту. |
| **Формат** | `https://domain` або `http://localhost:3000` |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `http://localhost:3000` |
| Staging | `https://staging.sushichain.ua` |
| Production | `https://sushichain.ua` |

**Примітки безпеки:**
- 🟡 Має точно відповідати URL, через який користувачі звертаються до додатку, інакше будуть помилки OAuth callback.

---

##### `NEXTAUTH_SECRET`

| | |
|---|---|
| **Обов'язкова** | ❌ Ні |
| **Опис** | Секрет для шифрування сесій NextAuth (JWT сесій та CSRF-токени). |
| **Вимоги** | Рекомендовано 32+ символів, випадкова строка |

**Приклади:**

| Середовище | Значення |
|---|---|
| Development | `change-me` |
| Staging | `staging-nextauth-[random-32+-chars]` |
| Production | `prod-nextauth-[cryptographically-random-64+-chars]` |

**Примітки безпеки:**
- 🔴 **СЕКРЕТ** — при компрометації зловмисник може підробляти сесії.
- Генеруйте через `openssl rand -hex 32`.

---

## 4. Настанови безпеки

### 4.1. Загальні правила

1. **Ніколи не комітьте `.env` файли** — лише `.env.example` з плейсхолдерами.
2. **Генеруйте секрети криптографічно**: `openssl rand -hex 32` або `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. **Різні секрети для кожного середовища** — staging і production повинні мати повністю незалежні ключі.
4. **Регулярно ротаційте секрети**, особливо `JWT_SECRET`, `JWT_REFRESH_SECRET` та `LIQPAY_PRIVATE_KEY`.
5. **Не використовуйте fallback-значення з коду** в staging/production (наприклад, `sushichain-super-secret-key-change-in-production-2024`).

### 4.2. Розподіл за рівнем секретності

| Рівень | Змінні |
|---|---|
| 🔴 Критичний (повний контроль над системою) | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `LIQPAY_PRIVATE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` |
| 🔴 Секрет (повний доступ до сервісу) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_BOT_TOKEN` |
| 🟡 Обмежений | `LIQPAY_PUBLIC_KEY`, `TELEGRAM_CHAT_ID`, `TELEGRAM_ALERT_CHAT_ID`, `SENTRY_DSN` |
| 🟢 Публічний | `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `BRAND_DOMAIN`, `PAYMENT_PROVIDER`, `LOG_LEVEL`, `NEXTAUTH_URL` |

### 4.3. Зберігання секретів

- **Локальна розробка**: `.env.development` (у `.gitignore`)
- **Docker / VPS**: `.env.staging` або `.env.production` з обмеженими правами доступу (`chmod 600`)
- **Хмарний хостинг**: використовуйте вбудований менеджер секретів провайдера (Railway ENV, Vercel Environment Variables, AWS Secrets Manager тощо)
- **CI/CD**: зберігайте секрети у секретах GitHub Actions / GitLab CI, ніколи у скриптах

### 4.4. NEXT_PUBLIC_ префікс

Змінні з префіксом `NEXT_PUBLIC_` (наразі лише `NEXT_PUBLIC_APP_URL`) **вбудовуються у клієнтський JavaScript**. Вони видимі у браузері через DevTools. Переконайтеся, що такі змінні не містять жодних секретів.

---

## 5. Поведінка Docker Compose щодо DATABASE_URL

Docker Compose конфігурації можуть **перезаписувати** `DATABASE_URL` з `.env` файлу. Це важливо розуміти для налаштування підключення до бази даних.

### 5.1. docker-compose.yml (Production)

```yaml
app:
  env_file:
    - .env                    # ← завантажує всі змінні з .env
  environment:
    # ↳ ПЕРЕЗАПИСУЄ DATABASE_URL з .env
    DATABASE_URL: postgresql://${POSTGRES_USER:-sushichain}:${POSTGRES_PASSWORD:-changeme}@postgres:5432/${POSTGRES_DB:-sushichain}?schema=public
    NODE_ENV: production       # ↳ ПЕРЕЗАПИСУЄ NODE_ENV
    PORT: "3000"
    HOSTNAME: "0.0.0.0"
```

**Що відбувається:**
1. Блок `env_file` завантажує `.env.production` → `DATABASE_URL` вказує на `localhost` (як у шаблоні)
2. Блок `environment` **перезаписує** `DATABASE_URL` на `postgres:5432` (ім'я сервісу всередині Docker-мережі)
3. `NODE_ENV` примусово встановлюється в `production`

> ⚠️ Хост `postgres` у `DATABASE_URL` — це **ім'я сервісу** з `docker-compose.yml`, а не реальний хост. Docker внутрішній DNS дозволяє контейнерам знаходити один одного за іменами сервісів.

### 5.2. docker-compose.staging.yml (Staging)

```yaml
app:
  env_file:
    - .env.staging
  environment:
    NODE_ENV: staging
    PORT: "3000"
    HOSTNAME: "0.0.0.0"
    LOG_LEVEL: debug
    # DATABASE_URL перезапис закоментовано — використовується значення з .env.staging
    # DATABASE_URL: postgresql://...@db:5432/...
```

**Що відбувається:**
- `DATABASE_URL` **не перезаписується** — використовується значення з `.env.staging`
- Якщо `.env.staging` містить зовнішнє підключення (Supabase, Railway) — воно працює як є
- Якщо потрібна локальна БД Docker — розкоментуйте рядок `DATABASE_URL` у блоці `environment`

### 5.3. docker-compose.dev.yml (Development)

Цей файл містить **тільки** сервіс PostgreSQL:

```yaml
services:
  postgres-dev:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sushichain
      POSTGRES_PASSWORD: sushichain_dev
      POSTGRES_DB: sushichain_dev
    ports:
      - "5432:5432"
```

- Додаток Next.js запускається локально (`npm run dev`), а не в Docker
- `DATABASE_URL` у `.env.development` вказує на `localhost:5432` — порт проброшується з контейнера

### 5.4. Пріоритет змінних у Docker Compose

```
environment: блок      ← найвищий пріоритет (перезаписує все)
    ↑
env_file:              ← середній пріоритет (завантажує .env файл)
    ↑
shell environment      ← найнижчий пріоритет
```

### 5.5. Додаткові змінні Docker (не у .env.example)

Docker Compose файли використовують допоміжні змінні для налаштування контейнера PostgreSQL:

| Змінна | Де використовується | За замовчуванням |
|---|---|---|
| `POSTGRES_USER` | `docker-compose.yml`, `docker-compose.staging.yml` | `sushichain` |
| `POSTGRES_PASSWORD` | `docker-compose.yml`, `docker-compose.staging.yml` | `changeme` / `sushichain_staging` |
| `POSTGRES_DB` | `docker-compose.yml`, `docker-compose.staging.yml` | `sushichain` / `sushichain_staging` |

> Ці змінні не використовуються безпосередньо додатком — вони потрібні лише для ініціалізації контейнера PostgreSQL. Їх можна задати у `.env` файлі для кастомізації облікових даних БД.

---

## 6. Чек-лист для нового середовища

- [ ] Скопіювати `.env.example` → `.env.[середовище]`
- [ ] Встановити `NODE_ENV`
- [ ] Встановити `NEXT_PUBLIC_APP_URL` (повна URL з протоколом)
- [ ] Встановити `BRAND_DOMAIN` (без протоколу)
- [ ] Налаштувати `DATABASE_URL` (та `DIRECT_URL` для Supabase)
- [ ] Згенерувати та встановити `JWT_SECRET` (min 32 символи)
- [ ] Згенерувати та встановити `JWT_REFRESH_SECRET` (min 32 символи, відрізняється від JWT_SECRET)
- [ ] Встановити `PAYMENT_PROVIDER` (`liqpay_sandbox` для dev/staging, `liqpay` для production)
- [ ] Встановити `LIQPAY_PUBLIC_KEY` та `LIQPAY_PRIVATE_KEY`
- [ ] Опціонально: налаштувати Telegram Bot, Alerting, Sentry
- [ ] Опціонально: встановити `LOG_LEVEL`
- [ ] Перевірити права доступу до файлу: `chmod 600 .env.[середовище]`
- [ ] Перевірити, що файл у `.gitignore`
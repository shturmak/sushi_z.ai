# Changelog

Все изменения проекта в хронологическом порядке.

---

## [0.6.0] — 2026-07-03

### Добавлено
- **i18n (UA/RU/EN)**: полная интернационализация storefront + admin
  - `src/i18n/` — Zustand store, хук `useT()`, LanguageSwitcher компонент
  - 3 словаря: `uk.ts` (источник), `ru.ts`, `en.ts` (~300 ключей каждый)
  - 7 storefront компонентов обновлены (brand-picker, header, auth, menu, cart, checkout, orders, profile)
  - 7 admin файлов обновлены (analytics, branches, categories, products, orders, promotions, sidebar)
  - Переключатель языков в хедере (🇺🇦/🇷🇺/🇬🇧), сохраняется в localStorage
- **PWA**: Progressive Web App поддержка
  - `public/manifest.json` — standalone display, theme #e11d48
  - `public/sw.js` — Service Worker с 3 стратегиями кэширования (cache-first для статики, stale-while-revalidate для API, network-first для навигации)
  - `src/components/pwa/ServiceWorkerRegistrar.tsx` — авто-регистрация SW, промпт обновления
  - Иконки: `public/icons/icon.svg`, `icon-192.png`, `icon-512.png`
- **SEO**: динамические мета-теги, Open Graph, sitemap, robots.txt
  - Обновлён `metadata` в layout.tsx (keywords, OG, Twitter cards)
  - `src/app/sitemap.ts` — динамический sitemap
  - `src/app/robots.ts` — robots.txt (allow /, disallow /admin/ /api/)
  - `src/app/not-found.tsx` — кастомная 404 страница с i18n
- **Telegram-бот**: мини-сервис для заказов через Telegram
  - `mini-services/telegram-bot/` — независимый Bun проект (grammy)
  - Команды: /start (выбор бренда), /cart, /checkout, /orders, /help
  - Inline keyboard: бренды → филиалы → категории → продукты → корзина
  - Общая БД с основным приложением (SQLite)
  - Создание реальных заказов в БД через бота

### Изменено
- **layout.tsx**: добавлен manifest, apple-mobile-web-app meta, ServiceWorkerRegistrar, Viewport export
- **eslint.config.mjs**: добавлен `public/**` в игнор (plain JS service worker)

---

## [0.5.0] — 2026-07-03

### Добавлено
- **Prisma Migrate**: начальная миграция `20260702235305_init` (327 строк SQL), переход с `db push` на `prisma migrate`
- **Доменная маршрутизация**: `src/middleware.ts` — Edge-совместимый middleware для brand resolution
  - Subdomain: `sushi-master.sushichain.ua` → `x-brand-slug: sushi-master`
  - Path prefix: `/b/sushi-master/menu` → rewrite на `/menu` + header
  - Query fallback: `?brand=sushi-master` (для разработки)
- **LiqPay платежи**: реальная интеграция украинского платёжного шлюза
  - `src/lib/payments/liqpay.ts` — SHA1 через Web Crypto, base64, checkout/callback
  - `src/lib/payments/index.ts` — реестр провайдеров (extensible для Fondy/Stripe)
  - Обновлён `POST /api/payments/intent` — генерация data + signature + checkoutUrl
  - Обновлён `POST /api/payments/webhook/[provider]` — верификация подписи, auto-confirm заказа
- **CI/CD**: `.github/workflows/ci.yml` — lint, type-check, build, migrate check, deploy staging
- **Пагинация API**: унифицированная система
  - `src/lib/pagination.ts` — `parsePagination()`, `paginateResult()`, `paginateCursorResult()`
  - `useAdminPaginatedApi<T>()` — React hook с auto-unwrap `{ data, pagination }`
  - Обновлены 8 endpoints: admin products, branches, categories, promotions, orders, loyalty transactions, customer orders
  - Стандартизированный ответ: `{ data: T[], pagination: { page, limit, total, pages, hasNext, hasPrev } }`

### Изменено
- **package.json**: обновлены скрипты `db:migrate:reset`, `db:reset`, `db:migrate:pg`
- **Админ-страницы**: переход с `useAdminApi<T[]>(path, [])` на `useAdminPaginatedApi<T>(path)`
- **.env**: добавлены `PAYMENT_PROVIDER`, `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY`, `LIQPAY_IS_TEST`

---

## [0.4.0] — 2026-07-02

### Добавлено
- **White-label multi-tenant архитектура**: Brand как центральный tenant, brandId на Branch, Category, Product, Cart, Order, Promotion, LoyaltyAccount
- **3 бренда в seed**: Суші Мастер (#e11d48), Піца Наполі (#ea580c), Бургер Лаб (#ca8a04)
- **5 филиалов, 15 категорий, 30 продуктов, 4 промоакции**
- **5 пользователей**: 1 super_admin, 3 brand admin, 1 customer
- **TenantContext система**: tenant.ts (типы), tenant-middleware.ts (withTenant, withTenantAuth, withTenantAdmin)
- **Admin auth**: Zustand store (auto-login как super_admin), AdminAuthInit компонент
- **Admin API**: бренды CRUD (/api/admin/brands), все роуты с Bearer-токеном + ?brandId=
- **Storefront SPA** (7 компонентов на маршруте /):
  - brand-picker — выбор бренда (цветные карточки)
  - auth-dialog — логин/регистрация
  - storefront-header — sticky хедер с корзиной
  - menu-view — филиалы, категории, продукты, корзина
  - checkout-view — 6-шаговое оформление заказа
  - orders-view — история заказов с статусами
  - profile-view — профиль + лояльность
- **OpenAPI/Swagger контракт**: docs/openapi.yaml (38 путей, 56 операций)
- **API гайд для мобильных**: docs/API.md
- **PostgreSQL-ready**: schema.postgresql.prisma, docs/DEPLOYMENT.md
- **Admin Brands CRUD**: страница управления брендами с цветовыми свотчами

### Изменено
- **schema.prisma**: Brand model, brandId на всех tenant-таблицах, @@unique([userId, brandId]) для лояльности
- **admin-api.ts**: убран USE_MOCK, реальные API-запросы с Bearer-токеном
- **admin-layout.tsx**: добавлен AdminAuthInit
- **layout.tsx**: обновлён title на "SushiChain"

---

## [0.2.0] — 2026-07-01

### Добавлено
- Админ-панель (6 страниц): Аналитика, Филиалы, Меню (категории + блюда), Заказы, Промоакции
- 30+ REST API роутов (Auth, Branches, Menu, Cart, Orders, Payments, Promotions, Loyalty, Admin)
- Domain-сервисы: order.service.ts, promotion.service.ts, analytics.service.ts
- Prisma-схема: 16 моделей, 6 enum-ов
- shadcn/ui компоненты (New York style), Zustand store

---

## [0.1.0] — 2026-07-01

### Добавлено
- Инициализация проекта: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui
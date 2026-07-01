# 🗺️ Roadmap — White-Label Food Ordering Platform

Мульти-тенантная омниканальная платформа для ресторанов.
Статусы: ⏳ Запланировано | 🔄 В работе | ✅ Готово | ⏸️ На паузе

---

## Этап 0 — White-Label Foundation [ТЕКУЩИЙ]

Архитектурный рефакторинг: внедрение Brand (tenant), TenantContext, brandId-изоляция.

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 0.1 | Prisma-схема: Brand + BrandCounts модели, brandId во все таблицы | 🔄 | `feat/brand-schema` | 🔴 |
| 0.2 | Seed: 2 бренда (Суші Мастер, Суши Токіо), данные по brandId | 🔄 | `feat/brand-schema` | 🔴 |
| 0.3 | TenantContext тип + resolveBrand() из домена/поддомена | ⏳ | `feat/tenant-context` | 🔴 |
| 0.4 | Tenant middleware (авто-вставка brandId в API-запросы) | ⏳ | `feat/tenant-context` | 🔴 |
| 0.5 | Refactor domain-сервисы: все принимают TenantContext | ⏳ | `feat/brand-api` | 🔴 |
| 0.6 | Refactor API-роуты: brand-aware, изоляция данных | ⏳ | `feat/brand-api` | 🔴 |
| 0.7 | Admin: CRUD брендов (super-admin), смена текущего бренда | ⏳ | `feat/admin-brands` | 🔴 |
| 0.8 | Admin: все страницы brand-scoped (фильтр по brandId) | ⏳ | `feat/admin-brands` | 🔴 |

## Этап 1 — Backend & Admin [v0.2 ✅ → рефакторинг]

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 1.1 | Auth API (JWT register/login/refresh/logout) | ✅ | — | — |
| 1.2 | CRUD API: филиалы, меню, акции, заказы | ✅ | — | — |
| 1.3 | Admin-панель: аналитика, филиалы, меню, заказы, акции | ✅ | — | — |
| 1.4 | Domain-сервисы (Orders, Promotions, Analytics) | ✅ | — | — |
| 1.5 | **Refactor: все сервисы + API с TenantContext** | ⏳ | `feat/brand-api` | 🔴 |
| 1.6 | **Refactor: OrderService.createFromCart — атомарная транзакция** | ⏳ | `feat/brand-api` | 🔴 |
| 1.7 | **Refactor: Loyalty — бренд-специфичная** | ⏳ | `feat/brand-api` | 🔴 |
| 1.8 | **Refactor: Menu — branchId null = общее, конкретное = филиал** | ⏳ | `feat/brand-api` | 🟡 |

## Этап 2 — Web-витрина (клиентская часть)

Публичный сайт для каждого бренда: меню, корзина, заказы.

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 2.1 | Brand storefront layout (цвета/лого из Brand config) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.2 | Главная страница (баннеры, хиты, акции бренда) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.3 | Каталог меню (категории, продукты, поиск, фильтры) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.4 | Карточка товара (опции, количество, состав) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.5 | Корзина (добавление, промокод, итого) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.6 | Оформление заказа (адрес, оплата, комментарий) | ⏳ | `feat/web-storefront` | 🔴 |
| 2.7 | Личный кабинет (профиль, адреса, история, лояльность) | ⏳ | `feat/web-storefront` | 🟡 |
| 2.8 | Отслеживание заказа (статусы, таймлайн) | ⏳ | `feat/web-storefront` | 🟡 |

## Этап 3 — API-контракт для мобильных

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 3.1 | OpenAPI / Swagger спецификация всех эндпоинтов | ⏳ | `docs/api-contract` | 🟡 |
| 3.2 | Пагинация, versioning, error codes документация | ⏳ | `docs/api-contract` | 🟡 |
| 3.3 | Примеры запросов/ответов для мобильных разработчиков | ⏳ | `docs/api-contract` | 🟡 |

## Этап 4 — Мобильные приложения (следующий этап)

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 4.1 | Android: product flavors (brandId в BuildConfig) | ⏳ | `feat/android-app` | 🟢 |
| 4.2 | iOS: build targets (brandId в Config.swift) | ⏳ | `feat/ios-app` | 🟢 |
| 4.3 | Push-уведомления (статус заказа, акции) | ⏳ | `feat/push-notifications` | 🟢 |

## Этап 5 — Инфраструктура и продакшен

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 5.1 | PostgreSQL + Prisma migrations для staging/prod | ⏳ | `feat/postgresql` | 🟡 |
| 5.2 | Docker + docker-compose | ⏳ | `feat/docker` | 🟡 |
| 5.3 | CI/CD (GitHub Actions: lint, build, deploy) | ⏳ | `feat/ci-cd` | 🟡 |
| 5.4 | SSL, rate limiting, CORS для продакшена | ⏳ | `feat/security` | 🟡 |
| 5.5 | LiqPay / Fondy интеграция | ⏳ | `feat/payments` | 🟡 |
| 5.6 | Мониторинг (Sentry) | ⏳ | `feat/monitoring` | 🟢 |

## Этап 6 — Улучшения

| # | Задача | Статус | Ветка | Приоритет |
|---|--------|--------|-------|-----------|
| 6.1 | i18n (UA / RU / EN) | ⏳ | `feat/i18n` | 🟢 |
| 6.2 | PWA (offline menu, install) | ⏳ | `feat/pwa` | 🟢 |
| 6.3 | SEO (мета, sitemap, OG) | ⏳ | `feat/seo` | 🟢 |
| 6.4 | Админ: управление доставчиками | ⏳ | `feat/admin-drivers` | 🟢 |
| 6.5 | Админ: отчёты (CSV/PDF экспорт) | ⏳ | `feat/admin-reports` | 🟢 |
| 6.6 | Telegram-бот | ⏳ | `feat/telegram-bot` | 🟢 |
| 6.7 | Отзывы и рейтинги | ⏳ | `feat/reviews` | 🟢 |

---

## Легенда приоритетов
- 🔴 Критично — блокирует следующее
- 🟡 Важно — нужно скоро
- 🟢 Улучшение — когда будет время

## Архитектурные решения (приняты)

| Решение | Выбор | Причина |
|---------|-------|---------|
| Лояльность | Бренд-специфичная (`@@unique([userId, brandId])`) | Бонусы не смешиваются между брендами |
| Brand ID (web) | Домен/поддомен → slug → Brand (fallback: path prefix) | `sushimaster.orderapp.ua` |
| Админ | 1 brand на админа; super_admin видит всё | Достаточно на старте, UserBrand m2m позже |
| Меню | branchId=null = общее для бренда; конкретное = филиал | Гибкость: единое + специфичное |
| Мобильные | API-контракт сейчас, приложения — следующий этап | Не перегружаться, показать живую систему |
| БД | SQLite (dev) → PostgreSQL (staging/prod) | Быстрый прототип, надёжный прод |
| Мульти-брендовый портал | Path prefix: `/sushimaster/menu` | Резервный вариант для витрины всех брендов |
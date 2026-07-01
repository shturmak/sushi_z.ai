# 📋 Changelog

Все изменения проекта в хронологическом порядке.

---

## [0.2.0] — 2026-07-01

### Добавлено
- **Админ-панель** (6 страниц):
  - Аналитика — KPI-карточки (заказы, выручка, средний чек), линейный график заказов по дням, столбчатая диаграмма выручки по категориям, таблица последних заказов
  - Филиалы — CRUD таблица, поиск, статус toggle, удаление с подтверждением
  - Меню → Категории — CRUD с формой в диалоге
  - Меню → Блюда — CRUD с вложенными группами опций (динамическое добавление/удаление)
  - Заказы — фильтры по статусу и филиалу, таблица, модал деталей заказа, кнопки смены статуса (state machine), таймлайн
  - Акции / Промокоды — CRUD с type-aware формой, статус-бейджи, счётчик использований
- **30+ REST API роутов** (Next.js Route Handlers):
  - Auth: register, login, refresh, logout (JWT через `jose`)
  - Branches: list, get, delivery-zones
  - Menu: list by branch, get product
  - Cart: create, get, add/update/remove items, clear
  - Orders: list, get, create, cancel, repeat, status change
  - Payments: intent, webhook
  - Promotions: list, validate
  - Loyalty: balance, transactions
  - Admin: analytics, CRUD для branches/categories/products/orders/promotions
- **Domain-сервисы**: `order.service.ts`, `promotion.service.ts`, `analytics.service.ts`
- **Утилиты**: JWT auth, хеширование паролей, middleware (requireAuth, requireAdmin), стандартизированные API-ответы
- **Mock-данные** — admin-панель работает автономно через `USE_MOCK = true`
- **Zustand store** — auth state + API-хелпер для клиентских запросов
- **Prisma-схема** — 16 моделей, 6 enum-ов, seed с реалистичными украинскими данными
- **Компоненты**: AdminSidebar, AdminHeader, AdminMobileSidebar, StatusBadge, ConfirmDialog, PageHeader, Skeletons

### Исправлено
- `useAdminApi` хук: `useState` → `useEffect` для корректной загрузки данных в React 19
- Dev-сервер: добавлен флаг `-H 0.0.0.0` для IPv4-биндинга

---

## [0.1.0] — 2026-07-01

### Добавлено
- Инициализация проекта: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui
- Полный набор shadcn/ui компонентов (New York style)
- Базовая структура директорий

---
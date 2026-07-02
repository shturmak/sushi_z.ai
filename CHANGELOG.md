# Changelog

Все изменения проекта в хронологическом порядке.

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
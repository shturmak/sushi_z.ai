---
Task ID: wl-4 (Part A)
Agent: tenant-routes-refactor
Task: Refactor 19 public API routes to be brand-aware using tenant middleware

Work Log:
- Added Brand model to Prisma schema with all required fields (id, name, slug, logoUrl, colors, banners, etc.)
- Added `brandId` field to: Branch, Category, Product, Promotion, Order, Cart, LoyaltyAccount, UserAddress
- Changed unique constraints: Branch slug from `@unique` to `@@unique([brandId, slug])`, Category from `@@unique([branchId, slug])` to `@@unique([brandId, branchId, slug])`, Cart from `userId @unique` to `@@unique([userId, brandId])`, LoyaltyAccount from `userId @unique` to `@@unique([userId, brandId])`
- Created `src/lib/tenant.ts` with `TenantContext` and `TenantAuthContext` types
- Created `src/lib/tenant-middleware.ts` with `withTenant()`, `withTenantAuth()`, `withTenantAdmin()`, `tenantCatch()` functions
  - Brand resolution strategy: `X-Brand-Slug` header → `?brand=` query param → default brand (slug="default") → first active brand
- Updated seed data to include brand and brandId on all entities
- Force-reset DB and re-seeded

Refactored 19 public API routes:
1. `src/app/api/branches/route.ts` — GET: filter by `ctx.brandId`
2. `src/app/api/branches/[id]/route.ts` — GET: verify `branch.brandId === ctx.brandId`
3. `src/app/api/branches/[id]/delivery-zones/route.ts` — GET: verify branch brand
4. `src/app/api/menu/route.ts` — GET: verify branch brand, filter categories/products by brandId
5. `src/app/api/menu/[id]/route.ts` — GET: verify `product.brandId === ctx.brandId`
6. `src/app/api/promotions/route.ts` — GET: filter by brandId + active date range
7. `src/app/api/promotions/validate/route.ts` — POST: inline validation with brandId check (replaced service call)
8. `src/app/api/cart/route.ts` — GET/POST/DELETE: `withTenantAuth`, composite key `userId_brandId`
9. `src/app/api/cart/items/route.ts` — POST: `withTenantAuth`, verify product brand
10. `src/app/api/cart/items/[id]/route.ts` — PUT/DELETE: `withTenantAuth`
11. `src/app/api/orders/route.ts` — GET/POST: `withTenantAuth`, filter by user+brand
12. `src/app/api/orders/[id]/route.ts` — GET: verify order brandId
13. `src/app/api/orders/[id]/cancel/route.ts` — POST: verify order brandId before cancel
14. `src/app/api/orders/[id]/repeat/route.ts` — POST: verify order brandId before repeat
15. `src/app/api/me/route.ts` — GET/PUT: `withTenantAuth`
16. `src/app/api/me/loyalty/route.ts` — GET: composite key lookup
17. `src/app/api/addresses/route.ts` — GET/POST: `withTenantAuth`, filter by brand
18. `src/app/api/addresses/[id]/route.ts` — PUT/DELETE: `withTenantAuth`, verify brand
19. `src/app/api/payments/intent/route.ts` — POST: `withTenantAuth`, verify order brand

Also fixed related files for schema compatibility:
- `src/domain/order.service.ts` — Updated CreateOrderParams to include brandId, all Cart/LoyaltyAccount lookups use composite keys
- `src/app/api/auth/login/route.ts` — Changed `loyaltyAccount` include to `loyaltyAccounts` (plural)
- `src/app/api/auth/register/route.ts` — Removed loyalty account creation at registration (now per-brand)
- `src/app/api/auth/profile/route.ts` — Converted to tenant-aware, queries brand-specific loyalty
- `src/app/api/loyalty/transactions/route.ts` — Converted to tenant-aware, uses composite key
- `src/app/api/admin/orders/[id]/status/route.ts` — Removed extra TenantContext param from updateOrderStatus call

Stage Summary:
- All 19 specified public API routes are brand-aware
- Brand resolution via X-Brand-Slug header or ?brand query param, fallback to default brand
- Public routes use `withTenant()`, authenticated routes use `withTenantAuth()`
- Cross-tenant access prevention: all single-resource lookups verify brandId match
- Cart and LoyaltyAccount scoped per user+brand via composite unique constraints
- `bun run lint` passes cleanly
- Dev server compiles without errors
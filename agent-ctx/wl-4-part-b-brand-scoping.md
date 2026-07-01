# Task ID: wl-4 (part B) — Brand-Aware Admin API Routes

## Agent: Main (Brand Scoping)

## Work Log

### 1. Tenant Infrastructure
- Updated `src/lib/tenant.ts` — kept existing `TenantContext` (with brand object) and `TenantAuthContext` types
- Rewrote `src/lib/tenant-middleware.ts`:
  - `withTenantAdmin(request)` — returns `TenantContext & { userId: string }`. Resolves brandId from admin user's `brandId` field (admin/manager) or from `?brandId=` query param (super_admin). Verifies brand exists.
  - `withTenantAuth(request)` — kept for customer-facing routes (resolves brand from header/query param)
  - `withTenant(request)` — public, no auth, kept as-is
  - `tenantCatch(err)` — standard error handler

### 2. Schema Changes (already partially done by part A, finalized here)
- Removed erroneous `brandId` from `UserAddress` model
- Confirmed Brand model with proper relations
- Confirmed `brandId` on: Branch, Category, Product, Order, Cart, Promotion, LoyaltyAccount, User (nullable)
- Updated `prisma/seed.ts` to create a Brand and assign brandId to all entities
- Pushed schema, seeded successfully

### 3. Admin API Routes Refactored (11 routes, all brand-scoped)

| # | Route File | Methods | Brand Scope |
|---|-----------|---------|-------------|
| 1 | `api/admin/branches/route.ts` | GET, POST | `where: { brandId }`, create with `brandId` |
| 2 | `api/admin/branches/[id]/route.ts` | GET, PUT, DELETE | Verify `branch.brandId === ctx.brandId` or 404 |
| 3 | `api/admin/menu/categories/route.ts` | GET, POST | `where: { brandId }`, create with `brandId` |
| 4 | `api/admin/menu/categories/[id]/route.ts` | GET, PUT, DELETE | Verify `category.brandId === ctx.brandId` or 404 |
| 5 | `api/admin/menu/products/route.ts` | GET, POST | `where: { brandId }`, create with `brandId` |
| 6 | `api/admin/menu/products/[id]/route.ts` | GET, PUT, DELETE | Verify `product.brandId === ctx.brandId` or 404 |
| 7 | `api/admin/orders/route.ts` | GET | Filter by branch IDs belonging to `ctx.brandId` |
| 8 | `api/admin/orders/[id]/status/route.ts` | PUT | Verify `order.branch.brandId === ctx.brandId` |
| 9 | `api/admin/promotions/route.ts` | GET, POST | `where: { brandId }`, create with `brandId` |
| 10 | `api/admin/promotions/[id]/route.ts` | GET, PUT, DELETE | Verify `promotion.brandId === ctx.brandId` or 404 |
| 11 | `api/admin/analytics/route.ts` | GET | Get brand's branch IDs, filter all queries |

### 4. Domain Services Refactored

- **`order.service.ts`**: `createOrderFromCart(ctx, params)` — verifies cart.branch.brand matches ctx.brandId; `updateOrderStatus(id, status, ctx?)` — optional brand verification; `cancelOrder`/`repeatOrder` — use brand-scoped loyalty lookups
- **`promotion.service.ts`**: `validatePromotion(ctx, code, subtotal)` — verifies promo.brandId; `getActivePromotions(ctx)` — filters by ctx.brandId
- **`analytics.service.ts`**: `getAdminAnalytics(ctx)` — gets all brand branch IDs, filters all queries (orders, items, revenue)

### 5. Fixed Customer-Facing Caller
- `api/orders/route.ts` — updated `createOrderFromCart` call to pass `(ctx, params)` with new signature

## Stage Summary
- **11 admin API routes** now brand-scoped via `withTenantAdmin()`
- **3 domain services** accept `TenantContext` for brand filtering
- All entities owned by a brand are inaccessible from other brands (returns 404)
- Lint passes cleanly
- Dev server compiles successfully
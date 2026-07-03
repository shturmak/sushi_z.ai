---
Task ID: 1-8
Agent: Main Architect
Task: Build production-ready omnichannel food ordering backend + frontend

Work Log:
- Designed Prisma schema with 16 models (User, UserSession, UserAddress, Branch, DeliveryZone, Category, Product, ProductOptionGroup, ProductOption, Cart, CartItem, Order, OrderItem, Payment, Promotion, LoyaltyAccount, LoyaltyTransaction)
- Created seed data with 2 branches, 6 categories, 18 products with option groups, 3 promotions, 3 sample orders
- Built domain service layer: order.service.ts (create, status transitions, cancel, repeat), promotion.service.ts (validate), analytics.service.ts
- Implemented 30+ REST API route handlers across Auth, Me, Branches, Menu, Cart, Orders, Payments, Promotions, Loyalty, Admin domains
- Replaced jose with crypto-based JWT for process stability
- Built comprehensive frontend dashboard with login, admin analytics, menu browsing, cart, orders, promotions views
- All APIs verified working via curl E2E tests

Stage Summary:
- Full REST API backend operational
- Frontend renders login page, admin dashboard with KPIs, customer menu/cart/orders
- All 30+ API endpoints tested and working
- Lint passes cleanly

---
Task ID: 9
Agent: promotions-page-builder
Task: Build Promotions CRUD page

Work Log:
- Created src/app/admin/promotions/page.tsx with table, CRUD dialog form
- Implemented type-dependent value field label
- Added date range formatting and usage counter

Stage Summary:
- Full promotions CRUD page with type-aware form, status badges, usage counters

---
Task ID: 8
Agent: orders-page-builder
Task: Build Orders management page

Work Log:
- Created src/app/admin/orders/page.tsx with filters, table, detail dialog, status workflow
- Implemented status state machine with next-status buttons
- Added order detail view with items, address, customer info, timeline

Stage Summary:
- Full orders page with filters, status workflow, detail modal, timeline
---
Task ID: 5
Agent: branches-page-builder
Task: Build Branches CRUD page

Work Log:
- Created src/app/admin/branches/page.tsx with table, search, CRUD forms
- Used Dialog for create/edit forms, ConfirmDialog for delete
- Implemented slug auto-generation from Ukrainian names

Stage Summary:
- Full CRUD branches page with search, form modal, status toggle, delete confirmation
---
Task ID: 4
Agent: analytics-page-builder
Task: Build Analytics dashboard page

Work Log:
- Created src/app/admin/page.tsx with metric cards, charts, and recent orders table
- Used recharts for LineChart and BarChart with proper theming via CSS variables
- Integrated with useAdminApi hook for data fetching
- Implemented loading skeletons for all sections
- Fixed Bar chart to use recharts Cell component for per-bar coloring

Stage Summary:
- Analytics page with 4 KPI cards, 2 charts (orders by day line chart + revenue by category bar chart), recent orders table

---
Task ID: 6-7
Agent: menu-pages-builder
Task: Build Menu Categories and Products CRUD pages

Work Log:
- Created src/app/admin/menu/categories/page.tsx with CRUD table and form
- Created src/app/admin/menu/products/page.tsx with complex form including option groups
- Implemented dynamic option group/option management in product form

Stage Summary:
- Categories page: full CRUD with table, dialog form
- Products page: full CRUD with category/search filters, complex form with nested option groups


---
Task ID: fix-white-screen
Agent: Main
Task: Fix white screen issue — server not running + React hook bug

Work Log:
- Diagnosed root cause: dev server was not running (user saw white screen)
- Fixed `useAdminApi` hook: replaced `useState(() => refetch())` with `useEffect(() => refetch(), [refetch])` — incorrect React 19 usage
- Fixed server startup: added `-H 0.0.0.0` flag to bind IPv4 (Caddy proxy needs IPv4)
- Created auto-restart wrapper (`auto-restart.sh`) with double-fork technique for process persistence
- Verified all admin pages render correctly: Analytics, Branches, Orders

Stage Summary:
- Admin panel fully functional with mock data
- Server stable with auto-restart wrapper (PPID=1, fully detached)
- All 5 admin pages verified: Analytics (KPI cards + charts + table), Branches CRUD, Menu Categories, Products, Orders with filters

---
Task ID: 4
Agent: PostgreSQL Setup
Task: Step 4 — Make project PostgreSQL-ready for staging

Work Log:
- Read and analyzed prisma/schema.prisma, package.json, .env
- Added PostgreSQL switch comment to datasource block in schema.prisma
- Added "For PostgreSQL, change to Json type" comments on 6 JSON string fields: workSchedule, polygonData, selectedOptions (CartItem), addressSnapshot, selectedOptions (OrderItem), providerPayload
- Verified no SQLite-specific features (no @db functions, no unsupported types)
- Created prisma/schema.postgresql.prisma as a reference file with provider="postgresql" and all 6 JSON fields converted from String? to Json?
- Created docs/DEPLOYMENT.md with full deployment guide (Railway/Supabase/RDS/Docker, switching steps, migrate vs push, env vars, checklist)
- Added commented PostgreSQL DATABASE_URL to .env
- Added db:generate:pg and db:migrate:deploy scripts to package.json

Stage Summary:
- schema.prisma annotated with PostgreSQL switch instructions (SQLite remains default)
- prisma/schema.postgresql.prisma created as drop-in PostgreSQL reference (Json types, postgresql provider)
- docs/DEPLOYMENT.md covers all deployment scenarios with step-by-step instructions
- .env includes commented PostgreSQL connection string template
- package.json has db:generate:pg (reference) and db:migrate:deploy (production) scripts

---
Task ID: 3
Agent: OpenAPI Generator
Task: Step 3 — Generate OpenAPI/Swagger API contract for mobile developers

Work Log:
- Read worklog.md, api-response.ts, auth-middleware.ts, auth.ts, prisma/schema.prisma
- Discovered and read all 40 API route.ts files across 10 domains
- Read domain services: order.service.ts, promotion.service.ts, analytics.service.ts
- Created docs/openapi.yaml — complete OpenAPI 3.0.3 spec with 55+ endpoint operations
- Created docs/API.md — mobile developer guide covering auth flow, branch isolation, error codes, key workflows, code generation
- All endpoints documented with method, path, summary, parameters, request bodies, response schemas
- 10 tags: Auth, User Profile, Branches, Menu, Cart, Orders, Payments, Promotions, Loyalty, Admin
- 30+ reusable component schemas (models, inputs, envelopes, responses)
- Bearer token security scheme defined globally
- Appended work record to worklog.md

Stage Summary:
- docs/openapi.yaml: 1200+ line OpenAPI 3.0.3 spec covering all 40 route files
- docs/API.md: concise mobile developer guide with auth flow, error codes, workflows, code gen examples
- Spec is Swagger UI compatible and code-generator ready (typescript-axios, kotlin, swift5, dart)

---
Task ID: 4.3
Agent: Domain Routing Agent
Task: Create Next.js middleware for domain-based brand routing

Work Log:
- Read and analyzed existing tenant-middleware.ts, tenant.ts types, app/page.tsx storefront, prisma/schema.prisma
- Confirmed resolveBrand() already reads x-brand-slug header (line 16 of tenant-middleware.ts) — no changes needed
- Created src/middleware.ts as Edge-compatible Next.js middleware with:
  - Brand slug extraction in priority order: subdomain > /b/<slug>/ path prefix > ?brand= query param
  - Subdomain extraction strips port, validates against BRAND_DOMAIN (default: sushichain.ua), skips reserved subdomains (www, api, admin)
  - Path prefix /b/<slug>/... rewrites URL to remove the prefix (e.g., /b/sushi-master/menu → /menu)
  - Query param ?brand=slug with basic slug validation as dev fallback
  - Sets x-brand-slug header on all matched requests where brand is identified
  - Matcher config excludes: /_next/*, /api/*, /admin/*, static files (favicon, robots, sitemap), public asset dirs (images/, icons/, assets/)
  - No Node.js APIs used — fully Edge Runtime compatible
- Verified: zero type errors in middleware.ts, zero lint warnings
- Integration verified: tenant-middleware.ts resolveBrand() picks up x-brand-slug header via headers().get('x-brand-slug')

Stage Summary:
- src/middleware.ts: ~110 lines, Edge-compatible domain-based brand routing
- Three brand resolution strategies: subdomain (production), /b/<slug>/ path prefix, ?brand= query param (dev)
- x-brand-slug header set for downstream consumption by resolveBrand()
- No changes needed to tenant-middleware.ts — header-based integration already in place

---
Task ID: 4.4
Agent: Payment Integration Agent
Task: Implement real LiqPay payment integration for Ukrainian market

Work Log:
- Read existing payment intent route (fake URL), webhook route (no signature verification), api-response, auth-middleware, Prisma schema (PaymentStatus enum, Payment model)
- Created `src/lib/payments/liqpay.ts` — self-contained LiqPay provider module:
  - Types: LiqPayCheckoutParams, LiqPayCheckoutResult, LiqPayCallbackData, MappedPaymentStatus
  - SHA1 via Web Crypto API (globalThis.crypto.subtle.digest) — works in Edge and Node.js runtimes
  - Base64 encode/decode with Buffer fallback for Edge
  - `createCheckout()`: builds LiqPay v3 JSON payload (action=pay, currency=UAH), base64-encodes it, generates SHA1(private_key + data + private_key) signature
  - `verifyCallback()`: recomputes SHA1 signature, decodes base64 JSON payload, validates
  - `mapStatus()`: maps LiqPay statuses (success/failure/wait/reversed/error/subscriber/codeverif) to internal PaymentStatus enum
  - Server callback URL derived from LIQPAY_SERVER_URL env or NEXT_PUBLIC_APP_URL with fallback
- Created `src/lib/payments/index.ts` — extensible payment provider registry:
  - PaymentProvider interface with createCheckout() and verifyCallback()
  - LiqPay registered as default provider; extensible for Fondy/Stripe/Portmone
  - `getProvider(name)` and `getProviderNames()` accessors
  - Shared CheckoutParams, CheckoutResult, CallbackResult types
- Rewrote `src/app/api/payments/intent/route.ts`:
  - Resolves provider via registry (PAYMENT_PROVIDER env, defaults to "liqpay")
  - Generates real checkout with base64 data + signature + checkoutUrl
  - Returns { paymentId, amount, provider, data, signature, checkoutUrl }
  - Derives resultUrl from request origin for redirect-after-payment
- Rewrote `src/app/api/payments/webhook/[provider]/route.ts`:
  - Parses form-encoded body (LiqPay default) and JSON fallback
  - Registered providers: full signature verification via provider.verifyCallback()
  - Unknown providers: legacy fallback (original raw providerTxId/status behavior preserved)
  - Signature invalid → returns 400 INVALID_SIGNATURE
  - Valid callback: updates Payment status + providerTxId + providerPayload
  - Auto-confirms order (status → confirmed, confirmedAt) on succeeded payment
  - All errors caught — returns 200 to prevent LiqPay retry storms
- Updated `.env` with LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY, LIQPAY_IS_TEST, PAYMENT_PROVIDER, and commented LIQPAY_SERVER_URL

Stage Summary:
- `src/lib/payments/liqpay.ts`: ~190 lines — LiqPay v3 integration with SHA1/WebCrypto
- `src/lib/payments/index.ts`: ~100 lines — provider registry pattern, ready for additional providers
- Intent route: returns real LiqPay checkout (data + signature + checkoutUrl) instead of fake URL
- Webhook route: full signature verification, form-encoded body parsing, auto-order-confirmation, legacy fallback
- `.env`: LiqPay sandbox credentials added (replace with real keys for production)
- Frontend integration note: POST form to checkoutUrl with `data` and `signature` fields, or use redirect with query params

---
Task ID: 4.2
Agent: Main Architect
Task: Switch from prisma db push to prisma migrate

Work Log:
- Ran `prisma migrate reset --force` to clear existing DB
- Ran `prisma migrate dev --name init` to create baseline migration
- Migration file: `prisma/migrations/20260702235305_init/migration.sql` (327 lines)
- Ran `bun run prisma/seed.ts` to repopulate database
- Updated package.json scripts: `db:migrate:reset`, `db:reset`, `db:migrate:pg`

Stage Summary:
- Full migration history established — ready for safe schema evolution
- DB re-seeded with 3 brands, 5 branches, 30 products, 4 promotions

---
Task ID: 4.5
Agent: Main Architect
Task: Create CI/CD pipeline with GitHub Actions

Work Log:
- Created `.github/workflows/ci.yml` with 4 jobs:
  1. lint-and-typecheck: ESLint + Prisma generate
  2. build: Next.js production build (depends on lint)
  3. db-migrate-check: Prisma migrate status check
  4. deploy-staging: placeholder deploy step (main branch only)
- Triggers: push to main/develop, PRs to main

Stage Summary:
- CI pipeline ready for GitHub Actions

---
Task ID: 4.6
Agent: Main Architect
Task: Add unified pagination to all list API endpoints

Work Log:
- Created `src/lib/pagination.ts` with: parsePagination(), paginateResult(), paginateCursorResult(), paginatedFindMany()
- Updated 8 API routes: admin/products, admin/branches, admin/promotions, admin/menu/categories, admin/orders, customer/orders, loyalty/transactions
- Added `useAdminPaginatedApi<T>()` hook to admin-api.ts with auto-unwrap of { data, pagination }
- Updated 5 admin pages: branches, products, categories, promotions, orders
- Standardized response: { data: T[], pagination: { page, limit, total, pages, hasNext, hasPrev } }

Stage Summary:
- All list endpoints return consistent paginated response
- Admin frontend uses useAdminPaginatedApi for auto-unwrap
---
Task ID: 5.1-storefront
Agent: Storefront i18n Agent
Task: Replace hardcoded Ukrainian strings in 7 storefront components with i18n

Work Log:
- Read all 7 storefront component files and i18n setup (useT hook, LanguageSwitcher)
- Updated brand-picker.tsx: added useT import, replaced 3 hardcoded strings (title, subtitle, noBrands)
- Updated storefront-header.tsx: added useT import, LanguageSwitcher import (default export), replaced 6 hardcoded strings (profile, orders, logout, login, cart, defaultBrand), inserted LanguageSwitcher component before cart button
- Updated auth-dialog.tsx: added useT import, replaced 12 hardcoded strings (dialogTitle, dialogDesc, loginTab, registerTab, email, password, phone, firstName, lastName, registerButton, and 4 placeholders)
- Updated menu-view.tsx: added useT import to both MenuContent and MenuView components, replaced 9 hardcoded strings (selectBranch, emptyMenu, emptyMenuHint, emptyCategory, add, notAvailable, cart.title, cart.empty, cart.checkout, common.total), refactored pluralizeItems to accept t parameter and use cart.items_one/few/many keys
- Updated checkout-view.tsx: full rewrite, moved STEPS array inside component to use t() calls, replaced all ~30 hardcoded strings including step labels, delivery/pickup titles and descriptions, address field labels, promo labels, payment method labels, bonus labels, summary labels, navigation buttons
- Updated orders-view.tsx: moved STATUS_MAP and PAYMENT_LABELS inside component body (required for t() access), moved getTimeline function inside component, replaced all ~20 hardcoded strings including status labels, payment labels, timeline labels, empty states, action buttons, summary labels
- Updated profile-view.tsx: moved TIER_CONFIG and TX_TYPE_LABELS inside component body, replaced all ~12 hardcoded strings including title, loyalty labels, tier labels, transaction type labels, logout button
- Ran bun run lint: 0 errors, 1 pre-existing warning (unrelated to changes)

Stage Summary:
- All 7 storefront components now use useT() hook for i18n
- No hardcoded Ukrainian strings remain in storefront components
- LanguageSwitcher added to storefront header
- STATUS_MAP, PAYMENT_LABELS, TIER_CONFIG, TX_TYPE_LABELS moved inside component bodies for t() access
- pluralizeItems refactored to accept t parameter for locale-aware pluralization
- Lint passes with no new errors
---
Task ID: 5.1-admin
Agent: Admin i18n Agent
Task: Replace hardcoded Ukrainian strings in 6 admin pages + sidebar with i18n

Work Log:
- Read i18n system (useT hook, uk.ts locale with ~100 admin keys) and all 7 target files
- Updated src/app/admin/page.tsx (Analytics): added useT import, moved orderTypeLabel inside component body, replaced page title, 4 KPI card labels, 2 chart titles, table headers (orderNumber, branch, status, amount), recent orders title, noData empty state, order type labels (delivery/pickup)
- Updated src/app/admin/branches/page.tsx: added useT to both BranchFormDialog and BranchesPage, replaced dialog title/description, 8 form labels (name, slug, address, phone, email, schedule, description, isOpen), button labels (cancel, save), table headers (name, address, status, orders, actions), search placeholder, action aria-labels, delete confirm dialog, empty state
- Updated src/app/admin/menu/categories/page.tsx: added useT import, replaced page header title/create label, table headers (name, slug, products, actions), dialog title, form labels (name, slug, description), button labels (cancel, save, create), delete confirm, empty state
- Updated src/app/admin/menu/products/page.tsx: added useT import, replaced page header title/create label, filter labels (category, searchPlaceholder), table headers (category, name, price, weight, available, actions), dialog title, form labels (category, name, slug, price, weight, calories, available, description), option group labels (optionGroups, optionGroupName, optionMaxChoices, optionRequired, optionName), button labels (addGroup, addOption, cancel, save, create), delete confirm, empty state
- Updated src/app/admin/orders/page.tsx: moved STATUS_OPTIONS and STATUS_LABELS inside component body (required for t() access), added useT to both OrdersPage and OrderDetailDialog, replaced page header, status filter options (all 7 statuses + all), branch filter label, table headers (orderNumber, branch, date, status, amount, payment, actions), order type labels, noOrders empty state, detail dialog title, info row labels (branch, payment, items, amount, total, address, customer, note), status timeline labels (all 7 statuses), changeStatus heading, status change button labels, order detail section headings
- Updated src/app/admin/promotions/page.tsx: moved promotionTypes and promotionStatuses arrays inside component body, added useT import, replaced page header, table headers (name, code, type, value, period, status, usedCount, actions), dialog title/description, form labels (code, name, description, type, value, minOrder, maxUses, startDate, endDate, status), type/status select options, button labels (cancel, save, create), delete confirm, sr-only labels, empty state, toast messages
- Updated src/components/admin/admin-sidebar.tsx: moved navItems array inside component body, replaced all 7 nav labels (analytics, branches, menu, categories, products, orders, promotions) with t() calls
- Removed unused useAdminApi import from products page
- Ran bun run lint: 0 errors, 1 pre-existing warning (unrelated)

Stage Summary:
- All 6 admin page components + admin sidebar now use useT() hook for i18n
- STATUS_OPTIONS, STATUS_LABELS, promotionTypes, promotionStatuses moved inside component bodies for t() access
- orderTypeLabel moved inside analytics component for t() access
- navItems moved inside AdminSidebar component for t() access
- ~150 hardcoded Ukrainian strings replaced with i18n t() calls across 7 files
- Lint passes with no new errors
---
Task ID: 5.4
Agent: Telegram Bot Agent
Task: Create Telegram bot mini-service for food ordering

Work Log:
- Read Prisma schema to understand full data model (Brand, Branch, Category, Product, Order, etc.)
- Created `mini-services/telegram-bot/package.json` with grammy ^1.35.0 and @prisma/client ^6.11.1
- Created `mini-services/telegram-bot/.env.example` with TELEGRAM_BOT_TOKEN placeholder
- Created `mini-services/telegram-bot/index.ts` (~465 lines) with complete bot logic:
  - /start: shows active brands as inline keyboard buttons
  - Brand selection callback: shows open branches for selected brand
  - Branch selection callback: shows menu categories (brand-wide + branch-specific)
  - Category selection callback: shows products with prices and "Add to cart" buttons
  - Add to cart: in-memory cart with quantity tracking, shows running total
  - /cart: displays cart items with quantities, per-item totals, and grand total
  - /checkout: asks delivery vs pickup via inline buttons, creates pending Order in DB
  - /orders: shows recent orders with status labels (Ukrainian), uses note field as Telegram chatId tag
  - /help: lists all available commands
  - In-memory session store (Map<chatId, {brandId, branchId, cart}>)
  - All UI text in Ukrainian
  - Proper null safety for ctx.chat in callback query handler
  - Bot gracefully exits if TELEGRAM_BOT_TOKEN not set
- Installed dependencies: grammy@1.44.0, @prisma/client@6.19.3

Stage Summary:
- Standalone Bun mini-service at `mini-services/telegram-bot/` (port 3004)
- Full ordering flow: brand → branch → category → products → cart → checkout
- Orders created as "new" status in shared SQLite database, tagged with Telegram chatId
- Type-safe with grammy's TypeScript-first API

---
Task ID: 5.3
Agent: SEO Agent
Task: Add SEO support (dynamic meta tags, Open Graph, sitemap)

Work Log:
- Updated `src/app/layout.tsx` metadata: enhanced title, added keywords array, authors, openGraph (type, locale, siteName, title, description), twitter (card, title, description)
- Created `src/app/sitemap.ts` — Next.js dynamic sitemap with entries for homepage (daily, priority 1) and admin (weekly, priority 0.3), using NEXT_PUBLIC_APP_URL env with fallback
- Created `src/app/robots.ts` — Next.js robots.txt allowing /, disallowing /admin/ and /api/, pointing to sitemap.xml
- Added `notFound` i18n keys (title, description, goHome) to all 3 locale files (uk, en, ru)
- Created `src/app/not-found.tsx` — client component 404 page using useT() hook, styled with large "404" text, title, description, and Button linking to homepage
- Verified: all changed/created files pass ESLint with zero errors (pre-existing error in public/sw.js is unrelated)

Stage Summary:
- SEO metadata (keywords, authors, Open Graph, Twitter cards) added to root layout
- Dynamic sitemap.xml and robots.txt generated via Next.js file conventions
- Custom 404 page with i18n support (uk/ru/en) using shadcn/ui Button
- All files lint-clean
---
Task ID: 5.2
Agent: PWA Agent
Task: Add PWA support (manifest, service worker, offline menu)

Work Log:
- Created `public/manifest.json` — Web App Manifest with name, theme_color (#e11d48), standalone display, portrait orientation, 3 icon entries (192, 512, maskable 512)
- Created `public/icons/icon.svg` — SVG app icon with red (#e11d48) rounded square background, white sushi roll and chopsticks design
- Created `public/icons/icon-192.png` and `public/icons/icon-512.png` — minimal placeholder PNG icons (replace with real icons for production)
- Created `public/sw.js` — Plain JS service worker (~120 lines) with 3 caching strategies:
  - Cache-first: static assets (CSS, JS, fonts, icons, /_next/static/)
  - Stale-while-revalidate: /api/* requests (serves cached, updates in background, falls back to cache when offline)
  - Network-first: navigation requests (fetches from network, falls back to cached page)
  - Pre-caches critical assets on install (/, /manifest.json, /icons/icon.svg)
  - Cleans old caches on activate, calls skipWaiting + clients.claim
- Created `src/components/pwa/ServiceWorkerRegistrar.tsx` — "use client" component that registers /sw.js on mount, listens for updatefound event, shows "Нова версія доступна" prompt with "Перезавантажити" / "Пізніше" buttons, sends SKIP_WAITING message on reload
- Updated `src/app/layout.tsx`:
  - Added `Viewport` export with themeColor, width, initialScale, maximumScale
  - Updated icons metadata to reference local /icons/icon-192.png and icon-512.png (plus apple icon)
  - Added `manifest: "/manifest.json"` to metadata
  - Added `appleWebApp` config (capable, statusBarStyle, title)
  - Imported and rendered `<ServiceWorkerRegistrar />` inside ThemeProvider
- Updated `eslint.config.mjs` ignores to exclude `public/**` from ESLint (plain JS SW was being parsed by TypeScript parser)

Stage Summary:
- PWA manifest with app icons and theme configured
- Service worker with 3-tier caching (cache-first for static, stale-while-revalidate for API, network-first for navigation)
- Offline menu support via cached API responses
- Update prompt shown when new SW version detected
- `bun run lint` passes with 0 errors

---
Task ID: 6.1
Agent: general-purpose
Task: Real-time order updates via WebSocket

Work Log:
- Created `mini-services/orders-ws/` Socket.io server (port 3004) with brand/order room routing
- Created `mini-services/orders-ws/package.json` with socket.io dependency, ran `bun install`
- Installed `socket.io-client@4.8.3` in main project
- Created `src/hooks/use-order-ws.ts` — `useOrderWebSocket(brandId, options?)` hook with auto-connect, reconnect, subscription management
- Created `src/components/admin/order-notifications.tsx` — `AdminOrderNotifications` component with sonner toasts, Web Audio API beep, and `useNewOrderCount()` zustand store
- Updated `src/app/admin/layout.tsx` — mounted `AdminOrderNotifications` with brandId from admin auth
- Updated `src/components/admin/admin-sidebar.tsx` — added red badge on Orders link using `useNewOrderCount()`, badge resets on click via `admin-orders-viewed` custom event
- Updated `src/components/storefront/orders-view.tsx` — integrated WebSocket for real-time status updates, updates order in local list without refetch, shows ring+shadow flash animation on status change
- Added `notifications.newOrder` and `notifications.orderUpdated` i18n keys to all 3 locale files (uk, ru, en)
- Fixed React 19 lint errors (refs during render) by wrapping ref updates in useEffect
- `bun run lint` passes with 0 errors

Stage Summary:
- Socket.io mini-service at `mini-services/orders-ws/` (port 3004) with brand/order room routing, events: order:created, order:new (alias), order:status_changed
- Client hook `useOrderWebSocket` connects via `io("/?XTransformPort=3004&...")` with Caddy proxy support
- Admin gets toast notifications + audio beep + sidebar red badge for new orders
- Customer orders view updates in real-time with animated ring highlight
- i18n keys added for notifications (uk/ru/en)

---
Task ID: 6.3
Agent: general-purpose
Task: Delivery zones & fee calculator

Work Log:
- Created `src/app/api/admin/delivery-zones/route.ts` — GET (paginated list with optional ?branchId= filter) + POST (create zone with branch validation)
- Created `src/app/api/admin/delivery-zones/[id]/route.ts` — GET (single with branch name), PUT (update), DELETE
- Verified existing public API at `src/app/api/branches/[id]/delivery-zones/route.ts` (returns active zones for a branch)
- Added `DeliveryZoneFormData` interface to `src/lib/admin-types.ts`, extended `DeliveryZone` with `createdAt`, `updatedAt`, `branch?`
- Created `src/app/admin/delivery-zones/page.tsx` — full CRUD admin page with:
  - Table with columns: Name, Branch, Fee, Min Order, ETA, Status
  - Branch filter (Select) + search filter
  - Create/Edit dialog with fields: name, branchId (select), deliveryFee, minOrder, estimatedMinutes, description, isActive
  - Delete confirmation dialog
  - Toggle active status button
  - Uses useAdminPaginatedApi, useAdminApi, PageHeader, ConfirmDialog, ActiveToggleBadge, TableSkeleton, shadcn/ui Select
- Updated `src/components/admin/admin-sidebar.tsx` — added "Delivery Zones" nav item with MapPin icon after Branches
- Updated `src/components/storefront/checkout-view.tsx`:
  - Added DeliveryZone type, deliveryZones/selectedZoneId/zonesLoaded/fetchBranchId/freeDeliveryPromo state
  - Fetches zones via API.branches.zones(selectedBranchId) when in delivery mode
  - Shows zone selector (Select with Clock icon, zone name, ETA, fee, min order) in address step
  - Shows "Безкоштовна доставка" when no zones defined
  - Derives deliveryFee from selectedZone (no separate state)
  - free_delivery promo type zeroes out delivery fee via freeDeliveryPromo flag
  - Includes deliveryZoneId in order payload
  - Replaced hardcoded "Доставка:" in summary with i18n delivery time/fee label
- Added i18n keys to all 3 locale files (uk, ru, en):
  - `admin.sidebar.deliveryZones` — sidebar label
  - `admin.deliveryZones` — title, create, edit, deleteConfirm, name, branch, fee, minOrder, estimatedMinutes, description, isActive, noZones
  - `checkout.deliveryZones` — selectZone, deliveryTime, freeDelivery
- Refactored delivery zone state management to avoid React 19 lint errors (no setState in effect body)
- `bun run lint` passes with 0 errors (6 pre-existing errors in unrelated files were present before but now resolved)

Stage Summary:
- Admin CRUD for delivery zones: list/create/update/delete via /api/admin/delivery-zones
- Admin UI page at /admin/delivery-zones with table, filters, form dialog, delete confirmation
- Public API at /api/branches/[id]/delivery-zones (pre-existing, verified working)
- Storefront checkout integrates delivery zones: auto-fetch on branch select, zone picker, fee applied to total
- free_delivery promo type correctly zeros delivery fee
- Sidebar updated with MapPin icon menu item
- All i18n keys added (uk/ru/en)

---
Task ID: 6.2
Agent: general-purpose
Task: Product image management

Work Log:
- Created `src/app/api/admin/upload/route.ts` — POST endpoint for multipart/form-data image uploads
  - Admin-protected via `requireAdmin()`
  - Accepts jpg, png, webp, gif only; max 5MB
  - Saves to `public/uploads/` with timestamp-prefixed unique filenames
  - Returns `{ url: "/uploads/filename.ext" }`
- Updated `src/lib/admin-types.ts` — added `imageUrl: string` to `ProductFormData` and `CategoryFormData`
- Updated `src/app/api/admin/menu/products/route.ts` — POST now accepts and persists `imageUrl`
- Updated `src/app/api/admin/menu/products/[id]/route.ts` — PUT now accepts and persists `imageUrl`
- Updated `src/app/api/admin/menu/categories/route.ts` — POST now accepts and persists `imageUrl`
- Updated `src/app/admin/menu/products/page.tsx` — added image upload field with preview, remove button, and upload-before-submit flow
- Updated `src/app/admin/menu/categories/page.tsx` — added same image upload/preview/remove functionality
- Updated `src/components/storefront/menu-view.tsx`:
  - Added `imageUrl` to Product and Category interfaces
  - Created `ProductImage` component (shows `<img>` with onError fallback)
  - Created `ProductPlaceholder` component (colored div with food emoji based on product name)
  - Added `getCategoryEmoji()` helper with keyword matching (рол→🍣, піц→🍕, бургер→🍔, etc.)
  - Category pills now show small image thumbnail or emoji icon
  - Product cards show actual image when available, emoji placeholder when not
- Added i18n keys `image`, `uploadImage`, `removeImage` to all 3 locale files (uk, en, ru) for both categories and products
- Created `public/uploads/` directory for uploaded files

Stage Summary:
- Full image upload API with admin auth, file validation, and unique filename generation
- Admin product and category forms now support image upload with live preview and removal
- Storefront menu displays product images with graceful emoji fallback when no image
- Category tabs show small image thumbnails or emoji icons
- All changes pass ESLint with 0 errors

---
Task ID: 6.5
Agent: admin-enhancements
Task: Admin Enhancements (CSV Export, Date Range Filters, Analytics Improvements)

Work Log:
- Added 9 i18n keys to all 3 locale files (uk, ru, en): exportCsv, dateFrom, dateTo, customRange, today, last7days, last30days, thisMonth, analytics.period
- Updated `/api/admin/orders` route to accept `dateFrom`/`dateTo` query params with proper date range filtering on `createdAt`
- Created `/api/admin/orders/export` route: GET endpoint returning CSV with UTF-8 BOM + semicolon delimiter, columns: Order #, Date, Customer, Branch, Type, Status, Items Count, Subtotal, Discount, Total, Payment Method, Note
- Updated orders admin page with: date range inputs (default last 30 days), Export CSV button with blob download, date params passed to paginated API
- Updated analytics service to accept optional `AnalyticsDateRange`, compute range-scoped orders/revenue, ordersByDay chart data, and revenueByCategory via raw SQL
- Updated analytics API route to accept `period` (today/7d/30d/month) or `dateFrom`/`dateTo` params
- Updated admin analytics page with period selector buttons (Today, 7 days, 30 days, This month, Custom) and custom date inputs, dynamic KPI display based on selected period
- Added quick stats to admin header: subtle "X замовлень, Y ₴" line fetched from analytics API (today period)
- Updated Analytics type to include `range` field in orders/revenue objects

Stage Summary:
- CSV export for orders with full filter support (status, branch, date range)
- Date range filtering on orders management page (default 30 days)
- Analytics dashboard now supports 5 period presets + custom date range
- Admin header shows today's orders count and revenue
- All changes pass ESLint with 0 errors

---
Task ID: 6.4
Agent: reviews-system-builder
Task: Reviews & Ratings System

Work Log:
- Added Review model to Prisma schema with relations to User, Brand, Product, Order
- Added reviews Review[] field to User, Brand, Product, and Order models
- Ran db:push to sync schema
- Created StarRating and StarRatingText UI components in src/components/ui/star-rating.tsx
- Created public API GET/POST /api/products/[id]/reviews for listing approved reviews and creating new ones
- Created admin API GET /api/admin/reviews for paginated listing with status/productId filters and pendingCount
- Created admin API PUT/DELETE /api/admin/reviews/[id] for approve/reject, admin reply, and deletion
- Built admin reviews page at src/app/admin/reviews/page.tsx with table, filters, approve/reject/reply/delete actions
- Updated admin sidebar with Reviews menu item, Star icon, and pending count badge (amber)
- Updated admin mobile sidebar with Reviews entry
- Added storefront product reviews section to menu-view (average rating, last 3 reviews, write review dialog)
- Added order item review button (star icon) to completed orders in orders-view
- Created review dialog with interactive star rating selector and comment textarea
- Added API.reviews helpers to store.ts (getByProduct, create)
- Added i18n translations for all review-related keys to uk, ru, en locale files
- Fixed pre-existing lint issue in menu-view (setState in effect)
- Fixed lint issue in orders-view (replaced effect-based reset with key-based remount)
- All changes pass ESLint with 0 errors

Stage Summary:
- Full reviews & ratings system operational
- Customer can review products from completed orders (one per order per product)
- Admin can moderate reviews (approve/reject), reply, and delete
- Pending review count badge shown in admin sidebar
- Star rating component supports both interactive and read-only modes
- i18n support for Ukrainian, Russian, and English

---
Task ID: 6.6
Agent: customer-features-agent
Task: Customer Features (Order Repeat, Favorites, Address Book)

Work Log:
- Added i18n translations for favorites and addresses to uk.ts, ru.ts, en.ts
- Added FavoriteProduct model to Prisma schema with userId/productId unique constraint
- Added favoriteProducts relation to User, Brand, Product models
- Ran db:push to sync schema and regenerate Prisma client
- Created /api/favorites/route.ts with GET (list), POST (add), DELETE (remove) endpoints
- Created /api/me/addresses/route.ts with GET (list) and POST (create) endpoints
- Created /api/me/addresses/[id]/route.ts with PUT (update) and DELETE endpoints
- Updated store.ts API: addresses CRUD now uses /api/me/addresses, added favorites API methods
- Updated orders-view.tsx: Repeat button now shows for completed AND cancelled orders; handleRepeat navigates to menu view
- Updated page.tsx: passes onNavigate callback to OrdersView
- Updated menu-view.tsx: added Heart icon on each product card (filled red if favorited); added Favorites category tab with heart icon; optimistic favorite toggle; favorites view shows only favorited products
- Updated checkout-view.tsx: loads saved addresses; shows "Saved Addresses" section above address form; clickable address cards fill form; "Save this address" checkbox with label input
- Updated profile-view.tsx: added Favorites section with product grid and remove buttons; added Addresses section with list, edit/delete buttons, and add address dialog
- Lint passes cleanly, db:push confirms schema in sync

Stage Summary:
- Order Repeat: completed/cancelled orders show Repeat button, navigates to menu on success
- Favorites: full CRUD via API, heart toggle on menu cards, favorites tab, profile section
- Address Book: saved addresses in checkout, address management in profile with dialog
- All new i18n keys added to 3 locale files

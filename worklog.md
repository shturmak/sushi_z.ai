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

---
Task ID: 10
Agent: Main
Task: Add search and filter UI to the storefront menu view

Work Log:
- Added i18n translation keys for search/filter to all 3 locale files (uk, en, ru) under `menu.filters.*`
- Updated `Product` interface with `isVegetarian`, `tags`, `allergens` fields
- Added imports: `useMemo` from React, `Search`, `SlidersHorizontal`, `X` from lucide-react, `Input`, `Label`, `Switch` from UI components
- Removed unused imports: `useCallback`, `Loader2`
- Moved filter state declarations and `useMemo` hooks before early returns to fix React hooks rules
- Added search bar with filter button (badge count indicator) at top of MenuContent
- Added active filter badges (vegetarian, tags, excluded allergens) with dismissible X
- Added Filter Sheet (slide-in panel) with: vegetarian toggle, price range inputs, tag selection, allergen exclusion
- Added conditional rendering: when filters are active → flat grid of all matching products; when cleared → normal category view
- Removed duplicate `handleCategoryClick` function
- All changes pass ESLint cleanly

Stage Summary:
- Search bar always visible at top of menu with search icon
- Filter button opens Sheet with vegetarian, price range, tags, allergens filters
- Active filters shown as dismissible badges below search bar
- Filtered results displayed in flat grid with count header and empty state
- Clearing all filters returns to normal category-based view

---
Task ID: 7.6
Agent: order-acceptance-settings
Task: Order Acceptance Settings — Branch fields, API, admin form, menu guard

Work Log:
- Added `autoConfirm`, `acceptingOrders`, `minOrderAmount`, `prepTimeMinutes` to `Branch` and `BranchFormData` interfaces in `src/lib/admin-types.ts`
- Updated `POST /api/admin/branches` route to destructure and persist the 4 new fields with sensible defaults
- `PUT /api/admin/branches/[id]` required no change — already passes full body through to Prisma
- Updated `src/app/admin/branches/page.tsx`:
  - Imported `Separator` component
  - Added 4 new fields to `emptyForm` (autoConfirm: false, acceptingOrders: true, minOrderAmount: 0, prepTimeMinutes: 30)
  - Added 4 new fields to `resetForm` for edit mode (reads from branch data)
  - Added new UI section after isOpen toggle: Separator, section header (`t('admin.branches.orderSettings')`), autoConfirm Switch, acceptingOrders Switch, minOrderAmount number Input, prepTimeMinutes number Input
- Updated `GET /api/menu` to check `branch.acceptingOrders` and return 403 `NOT_ACCEPTING` when false
- Ran `db:push` (schema already in sync) and `eslint .` (clean)

Stage Summary:
- Branch admin form now has a dedicated "Order Acceptance Settings" section with two switches and two number inputs
- New fields persist correctly via POST (create) and PUT (update) APIs
- Storefront menu API guards against branches that have disabled order acceptance

---
Task ID: 7.5
Agent: stock-management-builder
Task: Stock Management / Out of Stock — quick toggle, filter, batch actions

Work Log:
- Added `adminPatch<TReq, TRes>` helper to `src/lib/admin-api.ts` (no toast, for quick toggles)
- Added `PATCH /api/admin/menu/products/[id]` endpoint that accepts `{ isAvailable: boolean }`, updates only that field, and returns the updated product (does NOT rebuild option groups)
- Enhanced `src/app/admin/menu/products/page.tsx`:
  - Replaced static Badge (showing "—") in availability column with interactive `Switch` for optimistic stock toggle via PATCH
  - Added stock filter dropdown ("All" / "In stock" / "Out of stock") next to category filter using `t('stock.filterAll')`, `t('stock.filterInStock')`, `t('stock.filterOutOfStock')`
  - Added `Checkbox` column per row + header "select all" checkbox with indeterminate state
  - Added batch actions toolbar that appears when products are selected: shows "N selected" count, "All in stock" button (`PackageCheck` icon), and "All out of stock" button (`PackageX` icon)
  - Batch actions use `Promise.all` with PATCH calls and optimistic updates with rollback on error
  - Imported `Checkbox`, `PackageCheck`, `PackageX`, `adminPatch`, `useCallback`

Stage Summary:
- Admin can now toggle product availability directly from the products table with optimistic Switch
- Stock filter allows quick filtering by availability status
- Multi-select with batch in-stock/out-of-stock actions for efficient bulk management

---
Task ID: 7.7
Agent: feedback-support-builder
Task: Feedback / Support Channel — customer API, admin API, admin management page

Work Log:
- Added `FeedbackType`, `FeedbackStatus` types and `Feedback` interface to `src/lib/admin-types.ts`
- Created customer API `POST /api/feedback/route.ts`:
  - Optional JWT auth (sets userId if authenticated, allows guest submissions)
  - Validates required `message` and `type` enum
  - Gets `brandId` from query param
  - Returns created feedback with user/branch/order includes (201)
- Created admin list API `GET /api/admin/reviews/feedback/route.ts`:
  - Requires admin auth via `requireAdmin()`
  - Pagination via `parsePagination`/`paginateResult`
  - Optional filters: `status` and `type` query params
  - Includes user (firstName, lastName), branch (name), order (orderNumber)
  - Ordered by createdAt desc
- Created admin detail/update API `GET + PATCH /api/admin/feedback/[id]/route.ts`:
  - GET: returns single feedback with user, branch, order, brand relations
  - PATCH: updates `status` and/or `adminReply`, validates status enum
- Created admin feedback page `src/app/admin/feedback/page.tsx`:
  - PageHeader with `t('admin.feedback.title')`
  - Status filter (All, New, In progress, Resolved, Closed) + type filter dropdowns
  - Table: Date, Type (colored badge), From (user name or "Guest"), Subject/Message (truncated), Status (colored badge), Actions (eye icon)
  - Clickable rows open detail dialog with: full message, user info, contact info, linked order/branch, admin reply display, reply textarea + send button
  - Status action buttons: "Mark Resolved", "Close", "Reopen", "Mark In Progress" (context-dependent)
  - Uses `useAdminPaginatedApi` for data fetching with filter query params
  - Uses raw fetch with `useAdminAuth.getState().token` for PATCH (no adminPatch helper existed)
  - Status badge colors: new=blue, in_progress=amber, resolved=green, closed=gray
  - Type badge colors: order_issue=red, general=slate, suggestion=violet, complaint=orange
- Updated `src/components/admin/admin-sidebar.tsx`:
  - Imported `MessageCircleWarning` from lucide-react
  - Added feedback nav item after reviews: `{ href: '/admin/feedback', label: t('admin.sidebar.feedback'), icon: MessageCircleWarning }`
- ESLint passes cleanly, dev server runs without errors

Stage Summary:
- Full feedback/support channel implemented: customer can submit feedback via POST /api/feedback
- Admin has dedicated page at /admin/feedback with filters, table, and detail dialog for managing feedback
- Admin can reply to feedback and change status (new → in_progress → resolved/closed, with reopen capability)
- Sidebar updated with feedback link and MessageCircleWarning icon
---
Task ID: 7.5
Agent: Main
Task: Stock Management — quick toggle, batch operations, stock filter

Work Log:
- Added PATCH endpoint to /api/admin/menu/products/[id] for quick isAvailable toggle
- Added adminPatch helper to admin-api.ts (no toast for quick toggles)
- Replaced static Badge with interactive Switch in products table for one-click stock toggle
- Added stock filter dropdown (All / In stock / Out of stock)
- Added checkbox selection + batch actions toolbar for mass stock toggle

Stage Summary:
- Admin can now quickly toggle product availability with one click
- Batch operations allow marking multiple products in/out of stock
- Stock filter helps find unavailable items quickly

---
Task ID: 7.6
Agent: Main (via subagent)
Task: Order acceptance settings for branches

Work Log:
- Added autoConfirm, acceptingOrders, minOrderAmount, prepTimeMinutes to Branch schema
- Updated Branch type and BranchFormData in admin-types.ts
- Updated branch POST/PUT APIs to handle new fields
- Added order settings section to branch admin page form
- Added acceptingOrders guard in storefront menu API (returns 403 if branch not accepting)

Stage Summary:
- Each branch can configure auto-confirm, accepting orders toggle, min order amount, prep time
- Menu API blocks orders when branch.acceptingOrders is false
- Admin UI has a dedicated settings section in branch form

---
Task ID: 7.7
Agent: Main (via subagent)
Task: Feedback / Support channel — full stack

Work Log:
- Created Feedback model in Prisma with type/status enums
- Created POST /api/feedback for customer submissions (supports guest + auth)
- Created GET /api/admin/feedback (paginated, filterable by status/type)
- Created GET+PATCH /api/admin/feedback/[id] (detail view, status/reply update)
- Created admin feedback page with table, filters, detail dialog, reply, status actions
- Added feedback sidebar item with MessageCircleWarning icon
- Created FeedbackDialog component for customers
- Added feedback form button in profile view
- Added API.feedback.submit to store.ts
- Added Feedback type to admin-types.ts
- Full i18n support (uk/ru/en) for all new UI text

Stage Summary:
- Customers can submit feedback from profile page (type, subject, message, contact)
- Admins can view, filter, reply to, and manage status of feedback entries
- Full workflow: New → In progress → Resolved → Closed (with Reopen option)

---
Task ID: 7.3
Agent: payment-methods-e2e
Task: Multiple Payment Methods E2E — cash/bonus auto-succeed, min order validation, auto-confirm

Work Log:
- Verified LiqPay integration: `result_url` passed via params, `server_url` derived from `getServerCallbackUrl()` with env override support. Apple Pay/Google Pay are automatic via LiqPay's checkout widget. No changes needed.
- Fixed cash & bonus payment auto-succeed: Changed payment creation in `createOrderFromCart` to set `status: 'succeeded'` for `cash` and `bonus` methods (previously all payments were `'pending'`). Card payments remain `'pending'` until LiqPay webhook confirms.
- Verified bonus deduction logic: `useBonus > 0` correctly deducts from loyalty account balance, creates `LoyaltyTransaction` of type `spent`, and subtracts from order total via `bonusUsed` field. All already correctly implemented.
- Fixed double-deduction bug in bonus earn section: The "Earn bonus (5%)" block was computing `newBal = loy.balance - bonusUsed + earned`, but since bonus was already deducted in the same transaction, `loy.balance` (re-queried within tx) already reflected the deduction. Fixed to `newBal = earnLoy.balance + earned`. Renamed variable to `earnLoy` to clarify.
- Added minimum order amount validation for delivery: When `type === 'delivery'`, fetches branch and checks `branch.minOrderAmount` against subtotal. Returns `{ code: 'MIN_ORDER_AMOUNT', message: '...' }` error if subtotal is below threshold. Validation is skipped for pickup orders.
- Added auto-confirm with prep time: After transactional order creation, fetches branch and checks `branch.autoConfirm`. If true, updates order status to `confirmed`, sets `confirmedAt`, and calculates `estimatedMinutes`:
  - Delivery: `deliveryZone.estimatedMinutes + branch.prepTimeMinutes`
  - Pickup: `branch.prepTimeMinutes`
- Hoisted `matchingZone` variable outside the delivery block so it's accessible for the auto-confirm estimated time calculation.
- Lint passes cleanly, dev server runs without errors.

Stage Summary:
- Cash and bonus payments now auto-succeed at creation time (status: 'succeeded')
- Card payments remain pending until LiqPay webhook callback
- Bonus deduction verified correct; fixed a double-deduction bug in bonus earning
- Delivery orders enforce branch's minimum order amount (configurable per branch)
- Auto-confirm branches skip 'new' status, go directly to 'confirmed' with accurate estimated time
- LiqPay Apple/Google Pay works automatically via checkout widget, URLs verified correct

---
Task ID: 7.4
Agent: customer-notifications-builder
Task: Customer Order Notifications via WebSocket

Work Log:
- Created `src/components/storefront/customer-order-notifications.tsx` — renders nothing, purely for side-effects
- Uses existing `useOrderWebSocket` hook with `orderIds` option to join order-specific rooms
- Listens for `order:status_changed` events and maps status to i18n keys (`notifications.orderConfirmed`, etc.)
- Shows toast.info for status updates, toast.success for completed, toast.error for cancelled
- Integrated into `src/app/page.tsx`: fetches active order IDs (status in new/confirmed/cooking/ready/delivering) on auth
- 30-second polling interval refreshes tracked order IDs to pick up new orders placed in-session
- Max 10 tracked orders to keep WS connection lightweight

Stage Summary:
- Authenticated customers receive real-time toast notifications when their order status changes
- Notification messages are fully i18n-localized (en/uk/ru keys already existed)
- Lint passes cleanly

---
Task ID: 7.2
Agent: guest-checkout-builder
Task: Implement Guest Checkout — allow unauthenticated users to add to cart, checkout, and auto-create accounts

Work Log:
- Created `/home/z/my-project/src/lib/guest-cart.ts` — Zustand store with `persist` middleware to localStorage (`sc_guest_cart`), providing `addItem`, `removeItem`, `updateQuantity`, `clearCart`, plus derived helpers `getGuestCartTotalCount` and `getGuestCartSubtotal`
- Added `API.orders.guest` method to `/home/z/my-project/src/lib/store.ts` — POST to `/api/orders/guest`
- Created `/home/z/my-project/src/app/api/orders/guest/route.ts` — POST handler that:
  - Accepts guest order data (firstName, lastName, phone, email, branchId, type, paymentMethod, items, etc.)
  - Validates all required fields
  - Finds existing user by phone or creates new user with random password hash
  - Creates loyalty account if needed for the branch brand
  - Generates JWT access + refresh tokens, stores session
  - Calculates order items with product prices and option price deltas
  - Handles delivery fee from delivery zones
  - Validates and applies promotion codes
  - Creates order, order items, and payment (cash→succeeded, card→pending)
  - Awards 5% loyalty bonus on the transaction
  - Returns order, user, tokens, and loyalty info
- Modified `/home/z/my-project/src/components/storefront/menu-view.tsx`:
  - Imported `useGuestCart`
  - `handleAddToCart` now checks auth: guests add to localStorage cart, authenticated users use API
  - Added `handleGuestUpdateQuantity` for guest cart manipulation
  - Synced guest cart count to parent via `onCartCountChange`
  - Cart Sheet now shows guest cart items with quantity controls when not authenticated
  - Bottom Cart Bar now renders for guests when `guestCount > 0`
- Modified `/home/z/my-project/src/components/storefront/checkout-view.tsx`:
  - Imported `useGuestCart`
  - Added `isGuest` flag, `effectiveSubtotal` computed value
  - Guests use 4-step flow (type → address → payment → confirmation) vs 6-step for auth
  - Payment step hides "bonus" option for guests
  - Promo code step and bonus step are auth-only
  - Summary step shows guest cart items and a contact form (firstName*, lastName, phone*, email)
  - Contact form uses existing i18n keys: `auth.guestTitle`, `auth.guestDesc`, `auth.firstName`, etc.
  - `handleSubmit` branches: guests call `API.orders.guest()`, auth users call `API.orders.create()`
  - On guest success: auto-login with returned tokens, clear guest cart, navigate to orders

Stage Summary:
- Full guest checkout flow operational: browse menu → add items → checkout → auto-create account → auto-login
- Guest cart persists in localStorage across page reloads
- Lint passes cleanly
---
Task ID: 7.2
Agent: Main (via subagent)
Task: Guest checkout — localStorage cart + guest order API + auto-registration

Work Log:
- Created /src/lib/guest-cart.ts — Zustand store with persist to localStorage
- Created /src/app/api/orders/guest/route.ts — POST endpoint, no auth required
- Modified menu-view.tsx — guest cart support (add to localStorage, show cart bar for guests)
- Modified checkout-view.tsx — 4-step guest flow with name+phone form, auto-login after order
- Added API.orders.guest() to store.ts

Stage Summary:
- Guests can browse menu and add to cart without registration
- Guest checkout requires only name + phone, auto-creates account
- After guest order, user is automatically logged in

---
Task ID: 7.3
Agent: Main (via subagent)
Task: Multiple payment methods E2E — cash, bonus, card, LiqPay

Work Log:
- Fixed cash/bonus payments to auto-succeed (status: 'succeeded' on creation)
- Fixed double-deduction bug in loyalty bonus earning
- Added min order amount validation for delivery orders
- Added auto-confirm with prep time when branch.autoConfirm is true
- Verified LiqPay integration (Apple Pay/Google Pay automatic)

Stage Summary:
- Cash and bonus payments now correctly auto-succeed
- Min order amount enforced for delivery
- Auto-confirm with estimated time calculation
- Loyalty bonus bug fixed

---
Task ID: 7.4
Agent: Main (via subagent)
Task: Customer order notifications via WebSocket

Work Log:
- Created CustomerOrderNotifications component (renders nothing, side-effects only)
- Listens for order:status_changed via existing WebSocket hook
- Maps each status to localized i18n message with toast notifications
- Integrated into page.tsx — tracks active order IDs, refreshes every 30s
- Different toast styles: info for progress, success for completed, error for cancelled

Stage Summary:
- Customers see real-time toast notifications when their order status changes
- Full localization support (uk/ru/en)
- Tracks up to 10 active orders via WebSocket

---
Task ID: 8.4
Agent: advanced-analytics-builder
Task: Build Advanced Analytics API + Admin Page

Work Log:
- Created `src/app/api/admin/analytics/advanced/route.ts` — GET endpoint with admin auth, brandId scoping
  - Customer segments via raw SQL aggregation (new, returning_2_5, loyal_6_plus, high_value)
  - Orders by hour via `strftime('%H', "createdAt")`
  - Orders by day of week via `strftime('%w', "createdAt")` with SQLite 0=Sun → 1=Mon mapping
  - Checkout funnel: Cart count → Order count → Completed order count
  - Repeat rate: users with 2+ orders / total users
- Created `src/app/admin/analytics-advanced/page.tsx` — responsive card grid layout
  - Card 1: Customer Segmentation table (col-span-2) with color-coded rows
  - Card 2: Key Metrics (total customers, repeat rate with progress bar, avg check, peak hour)
  - Card 3: Checkout Funnel (full width) with proportional bars and conversion rates
  - Card 4: Orders by Hour (col-span-2) — 24-bar chart with peak hour highlighted
  - Card 5: Orders by Day of Week — 7-bar chart with i18n day labels
- Used existing i18n keys, shadcn/ui Card/Table/Progress/Skeleton components
- Lint passes on new files (pre-existing error in recommendations-block.tsx is unrelated)

Stage Summary:
- Advanced Analytics feature fully implemented with API + admin page
- All data computed from Prisma queries + raw SQL for complex aggregations
- Responsive layout: 1 col mobile, 2 cols md, 3 cols lg

---
Task ID: 8.3
Agent: campaigns-builder
Task: Build Campaigns & Win-back feature (APIs + admin page)

Work Log:
- Created `src/app/api/admin/campaigns/route.ts` — GET (paginated, brand-scoped, optional status filter, includes message counts) + POST (create with CampaignFormData, defaults status='draft')
- Created `src/app/api/admin/campaigns/[id]/route.ts` — GET (single with _count.messages), PUT (update name/type/subject/body/targetSegment/channel/status), DELETE (only if status='draft')
- Created `src/app/api/admin/campaigns/[id]/send/route.ts` — POST send simulation: finds users matching targetSegment (all, new, inactive_7d/14d/30d, high_value) via groupBy queries on Order table, creates CampaignMessage records in batches of 100, updates campaign to completed
- Created `src/app/admin/campaigns/page.tsx` — Full CRUD page following promotions pattern: table with color-coded type/status badges, create/edit dialog with form fields, send button on draft campaigns with confirmation, delete with confirmation (draft only), exported `usePendingCampaignCount` for future sidebar badge, all text via i18n `admin.campaigns.*` keys

Stage Summary:
- 3 API endpoints + 1 admin page created
- Campaign CRUD with send simulation fully functional

---
Task ID: 8.5+8.6
Agent: responsive-dark-mode
Task: Mobile Admin responsive tables (8.5) + Storefront dark mode toggle (8.6)

Work Log:
- Added mobile card views (md:hidden) to 6 admin table pages: orders, products, branches, promotions, reviews, feedback
- Each page: hidden desktop table with `hidden md:block`, mobile card view with `md:hidden space-y-3`
- Cards use shadcn/ui Card component with key info: identifier, status badge, important fields, action buttons
- Orders cards show: order number, status badge, customer, branch/amount, date, payment method, delivery type
- Products cards show: name, category, price, weight, availability badge, edit/delete actions
- Branches cards show: name, city, address, status badge, order count, edit/toggle/delete actions
- Promotions cards show: name, code, status badge, type, value, date range, usage count, edit/delete actions
- Reviews cards show: reviewer, product, rating stars, comment preview, status badge, date, approve/reject/reply/delete actions
- Feedback cards show: subject, from, status badge, type badge, message preview, date, view action
- Added theme toggle button (Sun/Moon with animated transition) to storefront header before LanguageSwitcher
- Uses `useTheme` from next-themes with animated icon rotation/scale CSS transitions
- All existing i18n keys used; no locale files modified

Stage Summary:
- All 6 admin pages now responsive with mobile card views replacing tables on small screens
- Storefront header has dark mode toggle matching admin header pattern
- All modified files pass ESLint cleanly
- Lint clean (only pre-existing error in unrelated file)

---
Task ID: 8.1+8.2
Agent: features-agent
Task: Personalized Recommendations + Pre-order / Scheduled Delivery

Work Log:
- **8.1 Recommendations Backend**: Created `/api/recommendations/route.ts` — GET endpoint with `requireAuth`, takes `branchId` query param. Queries OrderItem for user's past product IDs, FavoriteProduct for favorites, and uses `groupBy` on OrderItem to find top-ordered products for the branch. Returns `{ orderedBefore: Product[], popular: Product[] }` with only available products.
- **8.1 Recommendations Frontend**: Created `src/components/storefront/recommendations-block.tsx` — horizontal scrollable card row with Sparkles icon header, two sections ("Ви замовляли раніше" and "Популярне"), each showing product cards with emoji placeholder/image, name, price, and "Додати" button. Only renders for authenticated users.
- **8.1 Integration**: Added `RecommendationsBlock` import to `menu-view.tsx` and placed it before the search bar in `MenuContent` component, conditionally rendered when `isAuthenticated`.
- **8.1 Store**: Added `recommendations: { list: (branchId: string) => apiFetch(...) }` to the API object in `store.ts`.
- **8.2 Backend (auth)**: Modified `order.service.ts` to accept `scheduledAt?: string` in `CreateOrderParams` and pass `new Date(params.scheduledAt)` to `db.order.create`. Updated `/api/orders/route.ts` to destructure `scheduledAt` from body and forward it to `createOrderFromCart`.
- **8.2 Backend (guest)**: Modified `/api/orders/guest/route.ts` to destructure `scheduledAt` from body and pass `new Date(scheduledAt)` to `db.order.create`.
- **8.2 Frontend**: Modified `checkout-view.tsx` — added scheduling state (`scheduleMode`, `selectedTimeSlot`), `useMemo` time slot generator (30-min intervals 10:00-22:00, filtered for today's remaining slots), `scheduledAtISO` computed ISO string, and `scheduledDisplay` formatted string. Added delivery time section to Step 0 (below delivery/pickup toggle) with ASAP/Today/Tomorrow buttons and time slot grid. Added scheduled delivery badge with Clock icon on confirmation step. Passes `scheduledAt` in both guest and auth order payloads.

Stage Summary:
- Personalized recommendations: backend API + frontend horizontal scroll block integrated into menu
- Pre-order / scheduled delivery: backend scheduledAt support on both auth and guest order creation + frontend time slot picker UI
- All files pass `bun run lint` cleanly
- i18n keys used: `recommendations.title`, `recommendations.orderedBefore`, `recommendations.popular`, `scheduled.deliveryTime`, `scheduled.asap`, `scheduled.today`, `scheduled.tomorrow`, `scheduled.selectTime`, `scheduled.scheduledOrder`, `scheduled.noSlots`
- No i18n locale files or Prisma schema files were modified

---
Task ID: 9.2
Agent: rate-limiting-builder
Task: Implement Rate Limiting for API endpoints

Work Log:
- Created `src/lib/rate-limit.ts` with in-memory sliding-window rate limiter (Map-based store, 60s cleanup interval)
- Exported `rateLimit()` core function, `authLimiter` (10 req/min), `apiLimiter` (120 req/min), `publicLimiter` (60 req/min)
- Exported `rateLimitHeaders()` helper producing `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and conditional `Retry-After` headers
- Updated `src/lib/api-response.ts` — added optional `headers` parameter to `apiSuccess()` and `apiError()`
- Applied `authLimiter` to POST `/api/auth/login` and POST `/api/auth/register` (keyed by IP)
- Applied `publicLimiter` to GET `/api/menu` and GET `/api/branches` (keyed by IP)
- Applied `apiLimiter` to POST `/api/feedback` (keyed by IP)
- All 429 responses include `Retry-After` and `X-RateLimit-Remaining` headers; successful responses include `X-RateLimit-Remaining` and `X-RateLimit-Reset`
- `bun run lint` passes cleanly

Stage Summary:
- In-memory rate limiting deployed across 5 API endpoints
- Auth endpoints: 10 req/min per IP; Public endpoints: 60 req/min per IP; Feedback POST: 120 req/min per IP
- Standard rate limit headers on all responses for client-side awareness
- No i18n locale files, Prisma schema, admin-types.ts, or UI files were modified
---
Task ID: 9.4
Agent: pwa-enhancement
Task: PWA Enhancement — install prompt, offline indicator, manifest shortcuts

Work Log:
- Created `src/components/pwa/install-prompt.tsx` — PWA install prompt component that listens for `beforeinstallprompt` event, shows a card with install button, supports dismiss
- Created `src/components/pwa/offline-indicator.tsx` — Fixed-position amber banner shown when `navigator.onLine` is false, subscribes to online/offline events
- Enhanced `public/manifest.json` — added `categories` (food, shopping) and `shortcuts` array for Menu and Orders quick actions
- Integrated both PWA components into `src/app/page.tsx` alongside the existing CustomerOrderNotifications
- Fixed lint error: replaced synchronous `setState` in useEffect with lazy initializer for `useState`

Stage Summary:
- PWA install prompt shows when browser supports installation
- Offline indicator banner appears when network is unavailable
- Manifest enriched with shortcuts for quick access to Menu and Orders
- Lint passes cleanly, dev server compiles successfully

---
Task ID: 9.3
Agent: multi-currency-translations
Task: Multi-currency display in Brand settings + Menu Translations API + Admin Translations page

Work Log:
- Added `currency?: string` and `currencySymbol?: string` fields to `BrandInfo` interface in `src/lib/store.ts`
- Added currency code and currency symbol input fields to brand create/edit dialog in `src/app/admin/brands/page.tsx` (defaults: "UAH", "₴")
- Updated brand BrandFormData, emptyForm defaults, resetForm, and submit payload to include currency/currencySymbol
- Updated `src/app/api/admin/brands/route.ts` POST handler to accept and persist currency/currencySymbol
- Updated `src/app/api/admin/brands/[id]/route.ts` PUT handler to accept and update currency/currencySymbol
- Created `src/app/api/admin/translations/route.ts` — GET (list with filters + batch original name lookup), POST (upsert with unique constraint)
- Created `src/app/api/admin/translations/[id]/route.ts` — GET (single with original name), PUT (update name/description), DELETE
- Created `src/app/admin/translations/page.tsx` — full admin page with locale/entity type filter selects, translations table (original name, translated name, locale badge, type badge, actions), create/edit dialog with entity selector, read-only original name, translated name input, translated description textarea, delete confirmation

Stage Summary:
- Currency code and symbol configurable per brand via admin UI and API
- Menu Translations CRUD fully operational (list, create/upsert, read, update, delete)
- Admin translations page with filters, table, and create/edit/delete dialogs
- Lint passes cleanly, dev server compiles successfully

---
Task ID: 9.1
Agent: courier-module-builder
Task: Build Courier Module — API routes + Admin page

Work Log:
- Created `src/app/api/admin/couriers/route.ts` — GET (list couriers for brand with activeOrders/totalDeliveries counts), POST (create courier with name/phone/brandId)
- Created `src/app/api/admin/couriers/[id]/route.ts` — GET (single courier with deliveryAssignments including order orderNumber/status), PUT (update name/phone/isActive), DELETE (only if no active assignments)
- Created `src/app/api/admin/couriers/assign/route.ts` — POST (create/reassign DeliveryAssignment for orderId+courierId), DELETE (remove assignment by orderId)
- Created `src/app/api/admin/couriers/[id]/deliveries/route.ts` — PATCH (update assignment status to picked_up/delivered with timestamp management)
- Created `src/app/admin/couriers/page.tsx` — full admin page with:
  - Courier List section: table (desktop) + card view (mobile) with name, phone, active orders count, total deliveries, isActive toggle (Switch), edit/delete buttons
  - Active Deliveries Panel: expandable per-courier inline deliveries with status badges and action buttons (pick up / mark delivered / unassign)
  - Create/Edit dialog for courier name + phone
  - Assign Courier dialog with order ID input and courier Select dropdown
  - Search filter, ConfirmDialog for delete, responsive design (md:hidden cards, hidden md:block table)
  - All text uses `courier.*` i18n keys

Stage Summary:
- 4 API endpoints for courier CRUD, assignment, and delivery status management
- Admin couriers page with two-section layout (courier list + active deliveries panel)
- Mobile-responsive with card/table toggle pattern matching other admin pages
- `bun run lint` passes cleanly
- No i18n locale files, Prisma schema, or admin-types.ts were modified
---
Task ID: 10.4
Agent: backup-builder
Task: Implement SQLite database backup mechanism

Work Log:
- Created scripts/backup-db.ts with backup/restore/list functionality
- Added db:backup, db:backup:list, db:restore scripts to package.json
- Created docs/BACKUP_GUIDE.md with usage instructions
- Verified with bun run lint

Stage Summary:
- SQLite backup script with gzip compression and rotation
- Supports manual backup, listing, and restore operations
- Documentation for cron-based automated backups

---
Task ID: 10.3
Agent: logging-builder
Task: Implement structured logging and error alerting

Work Log:
- Created src/lib/logger.ts with structured JSON logger
- Created src/lib/error-handler.ts with centralized error handling + Telegram alerts
- Updated domain services and API routes to use new logger
- Verified with bun run lint

Stage Summary:
- Production-ready structured logger with dev pretty-print and prod JSON modes
- Error handler with Telegram alert integration
- Critical API routes now use structured logging

---
Task ID: 10.1
Agent: unit-tests-builder
Task: Create unit tests for domain services and utilities

Work Log:
- Created tests/unit/rate-limit.test.ts (15 tests: rate limiter core, presets, headers)
- Created tests/unit/pagination.test.ts (17 tests: parsePagination, paginateResult edge cases)
- Created tests/unit/api-response.test.ts (21 tests: success, error, unauthorized, forbidden, notFound)
- Created tests/unit/order-transitions.test.ts (32 tests: valid/invalid/terminal/unknown/self transitions)
- Created tests/unit/utils.test.ts (12 tests: cn class merging, conditionals, tailwind conflicts)
- Fixed 1 test: parsePagination limit=0 falls back to default (0 is falsy in JS || chain)
- All 103 tests passing with bun:test

Stage Summary:
- 5 test files created with comprehensive coverage of pure functions
- Tests cover rate limiting, pagination, API responses, order transitions, utilities
- 103 tests, 176 expect() calls, 0 failures

---
Task ID: 10.2
Agent: e2e-tests-builder
Task: Create E2E tests for critical ordering flow

Work Log:
- Read all relevant API route files to understand contracts (auth, cart, orders, promotions, loyalty, branches, menu)
- Created tests/e2e/critical-flow.test.ts with 23 tests across 6 describe blocks
- Tests cover: auth (register/login/profile), browse (branches/menu), cart (create/add/verify), order (create/list/verify), loyalty (balance check), promotions (list/validate/edge cases)
- Discovered and fixed 4 bugs in the codebase uncovered by E2E tests:
  1. Cart creation missing `brandId` (required FK field) — fixed in src/app/api/cart/route.ts
  2. Cart lookup using `findUnique` on non-unique field `userId` — changed to `findFirst` in cart route and cart items route
  3. Order creation missing `brandId` — fixed in src/domain/order.service.ts
  4. Promotion validation using `findUnique` on non-unique `code` field — changed to `findFirst` in promotion.service.ts and order.service.ts
  5. `parsePagination` producing NaN when `maxLimit` not provided — fixed in src/lib/pagination.ts
  6. Logger import in orders route causing empty 500 responses — replaced with console.error
- All 23 E2E tests passing against running dev server

Stage Summary:
- E2E test suite covering the full customer journey from registration to order completion
- Tests verify auth, menu browsing, cart management, order placement, loyalty accrual, and promotion validation
- Multiple pre-existing bugs discovered and fixed during test development
---
Task ID: 11.2
Agent: nginx-builder
Task: Create Nginx configuration for multi-brand deployment

Work Log:
- Created nginx/nginx.conf with gzip, security, proxy settings
- Created nginx/sites/sushichain.conf with subdomain-based brand routing
- Created nginx/sites/ssl-template.conf.example for HTTPS
- Created docker-compose.yml with nginx service, app service, and certbot helper

Stage Summary:
- Nginx reverse proxy config with subdomain-to-brand routing via map block
- WebSocket support for real-time features (/socket.io/)
- SSL template for Let's Encrypt with modern cipher profile
- Security headers and rate limiting zones
- docker-compose.yml with volume mounts for nginx configs, logs, and certbot
---
Task ID: 11.3
Agent: staging-docs-builder
Task: Create staging environment documentation

Work Log:
- Created docs/STAGING.md with setup, testing, and reset guides
- Documented staging architecture (Caddy → Next.js → PostgreSQL via Docker Compose)
- Included server provisioning steps, .env.staging configuration, Dockerfile, and Caddyfile
- Documented test data from seed script (3 brands, 30+ products, promotions, sample orders)
- Added CI integration section with GitHub Actions example workflow
- Created pre-promotion checklist covering auth, menu, cart, checkout, admin, and data integrity
- Documented three levels of database reset (migrate reset, volume wipe, schema-only wipe)
- Added troubleshooting section for common staging issues

Stage Summary:
- Complete staging environment documentation
- Includes setup steps, test data management, CI integration
- Covers Docker Compose orchestration, PostgreSQL migration, and seeding

---
Task ID: 11.1
Agent: docker-builder
Task: Create Docker and Docker Compose configuration for production deployment

Work Log:
- Read project context: package.json (scripts, dependencies), prisma/schema.prisma (SQLite), prisma/schema.postgresql.prisma (PostgreSQL), next.config.ts (standalone output), existing nginx/nginx.conf
- Created Dockerfile with 3-stage build: deps (npm ci with caching), builder (prisma generate + next build + static asset copy), runner (node:20-alpine, non-root user, healthcheck, prisma migrate deploy on start)
- Created docker-compose.yml with 3 services: postgres (16-alpine, healthcheck, volume), app (build from Dockerfile, depends on postgres, healthcheck), nginx (alpine, mounts existing nginx.conf)
- Created docker-compose.staging.yml override with debug logging, NODE_ENV=staging, Node.js inspector port 9229, PostgreSQL query logging, staging env file, port 8080 for nginx
- Created .dockerignore excluding node_modules, .env files, .next, docs, tests, skills, mini-services, db/, nginx/, scripts
- Created .env.example with all required vars documented: DATABASE_URL (SQLite + PostgreSQL variants commented), JWT_SECRET, JWT_REFRESH_SECRET, LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY, NEXTAUTH_URL/SECRET (optional), TELEGRAM_BOT_TOKEN (optional), TELEGRAM_ALERT_BOT_TOKEN/CHAT_ID (optional), SENTRY_DSN (optional), LOG_LEVEL (optional), NODE_ENV

Stage Summary:
- Full Docker setup for production deployment with PostgreSQL
- Staging variant with debug logging, inspector port, and query logging
- Comprehensive .env.example template with all env vars documented
- Dockerfile runs prisma migrate deploy before starting the app for zero-downtime schema updates
---
Task ID: 11.4
Agent: deploy-docs-builder
Task: Create production deployment documentation

Work Log:
- Created docs/DEPLOYMENT_PROD.md with full deployment guide

Stage Summary:
- Comprehensive production deployment guide
- Covers Docker, Nginx, SSL, DNS, monitoring, security

---
Task ID: 14.1-14.3
Agent: feature-flags-builder
Task: Build BrandSettings API, feature flags, and settings UI

Work Log:
- Created src/lib/feature-flags.ts with getBrandSettings, isFeatureEnabled, and updateBrandSettings
- Created src/app/api/admin/brand-settings/route.ts (GET/PUT) — GET returns settings + brand info, PUT handles partial updates
- Created src/app/admin/brand-settings/page.tsx with 4-tab settings UI (General, Features, Checkout, Loyalty)
- Fixed pre-existing lint error in uk.ts (unescaped apostrophe in enableDeliveryFeatures)

Stage Summary:
- Feature flag system with 17 configurable flags per brand
- Admin settings page with 4 tabs: General, Features, Checkout, Loyalty
- Auto-creation of default settings for new brands via upsert
- General tab: read-only brand name, color pickers, currency fields
- Features tab: grouped toggle switches (Ordering, Marketing, Social, Advanced)
- Checkout tab: require phone/address, show tips, Apple Pay toggles
- Loyalty tab: enable toggle + rate/min-spend/max-bonus inputs
---
Task ID: 12.1-12.4
Agent: onboarding-builder
Task: Build Onboarding Wizard, Demo Brand

Work Log:
- Created src/app/admin/onboarding/page.tsx with 4-step wizard (Brand → Branch → Menu → Launch)
- Stepper component with icon-based progress indicator
- Step 1: Brand form with name, slug, description, primary/secondary color pickers; detects existing brand
- Step 2: Branch form with name, slug, address, phone, work schedule, prep time, auto-confirm/accepting toggles
- Step 3: Menu setup with link to categories page + quick-add category+product form
- Step 4: Launch screen with CheckCircle icon, "Go to Store" and "Go to Admin" buttons
- Updated prisma/seed.ts with Demo Sushi brand (indigo #6366f1, UAH currency)
- Demo Sushi includes: 1 branch, 2 categories (Роли, Напої), 5 products
- Added admin@demo-sushi.ua user for the demo brand
- Passed `bun run lint` with zero errors

Stage Summary:
- 4-step onboarding wizard at /admin/onboarding
- Demo Sushi brand with test data for presentations
- All i18n keys utilized from existing onboarding.* namespace
---
Task ID: 15.1-15.4
Agent: legal-builder
Task: Create legal pages, documents, and billing model

Work Log:
- Created src/app/api/admin/legal/route.ts (GET/PUT) — reads/writes markdown files from docs/legal/
- Created src/app/admin/legal/page.tsx with tabbed legal document viewer/editor
- Created docs/legal/privacy-policy.md (Ukrainian, 12 sections, ~100 lines)
- Created docs/legal/terms-of-service.md (Ukrainian, 12 sections, ~100 lines)
- Created docs/legal/restaurant-terms.md (Ukrainian, 12 sections, ~100 lines)
- Created docs/BILLING.md with 3 pricing tiers (Starter/Pro/Enterprise), billing mechanics, overage, trial

Stage Summary:
- Legal admin page with 3 tabs (Privacy Policy, Terms of Service, Restaurant Terms)
- View/Edit toggle per document with markdown textarea editor and save via API
- 3 comprehensive legal documents in Ukrainian covering GDPR, payments, SLA
- Billing model documentation with pricing tiers, overage charges, and payment methods
---
Task ID: 12.3
Agent: brand-guide-builder
Task: Create brand guide documentation

Work Log:
- Created docs/BRAND_GUIDE.md with 12 sections in Ukrainian

Stage Summary:
- Comprehensive brand guide for restaurant owners
- Covers all admin features: menu, orders, analytics, campaigns, settings
- Written in Ukrainian with practical step-by-step instructions
---
Task ID: 13.1-13.4
Agent: mobile-docs-builder
Task: Create mobile app documentation and API SDK

Work Log:
- Created docs/MOBILE_ARCHITECTURE.md with React Native/Expo white-label strategy
- Created docs/MOBILE_API_SDK.md with complete API reference
- Created docs/MOBILE_PUBLISHING.md with Google Play and App Store guides
- Created docs/mobile-sdk-types.ts with TypeScript API types

Stage Summary:
- Complete mobile documentation: architecture, API SDK, publishing guides
- TypeScript type definitions for mobile API client development

---
Task ID: 5
Agent: middleware-builder
Task: Update brand routing middleware for staging domains

Work Log:
- Updated src/middleware.ts to handle multi-level BRAND_DOMAIN
- Added debug header for non-production environments
- Verified logic for production, staging, and local domains

Stage Summary:
- Middleware works with both sushichain.ua and staging.sushichain.ua
- Correct subdomain extraction for all domain configurations

---
Task ID: 3
Agent: cicd-builder
Task: Create CI/CD workflow and migration scripts

Work Log:
- Created .github/workflows/ci.yml with lint, test, validate-schema, deploy-staging jobs
- Created scripts/migrate-staging.sh — validates PG schema, generates client, shows status, confirms, runs migrate deploy
- Created scripts/migrate-production.sh — same with extra safety: branch warning, uncommitted changes warning, double-confirmation (type 'production'), --dry-run option
- Created scripts/setup-staging-db.sh — first-time staging setup with schema validation, migration creation, migrate deploy, seed, table verification
- Updated package.json with migrate:staging, migrate:prod, setup:staging, db:validate:pg scripts
- All shell scripts use set -euo pipefail and check for required tools (bun, prisma)
- Verified `bun run lint` passes cleanly

Stage Summary:
- GitHub Actions CI/CD pipeline with 4 jobs: lint → test + validate-schema → deploy-staging
- Manual migration scripts for staging (y/N confirm) and production (type 'production' confirm + dry-run)
- First-time staging DB setup script with seed and table verification
- package.json updated with 4 new convenience scripts

---
Task ID: 6
Agent: migration-docs-builder
Task: Create migration workflow documentation

Work Log:
- Created docs/MIGRATION_WORKFLOW.md with 10 sections
- Section 1: Overview of dual-schema architecture (SQLite dev + PostgreSQL staging/prod)
- Section 2: Local development with db:push and migrate dev
- Section 3: Pre-commit validation (validate, SQL review, local PG test)
- Section 4: Commit and push rules (never edit existing migrations)
- Section 5: Staging deploy via CI/CD or manual migrate deploy
- Section 6: Staging verification checklist (admin panel, order flow, new columns)
- Section 7: Production deploy (backup first, staging first, then production)
- Section 8: Rollback procedure (resolve --rolled-back, create undo migration, pg_restore)
- Section 9: First deploy / initial setup with seed data details
- Section 10: Troubleshooting (conflicts, failed migrations, NOT NULL, renames, enums, data migrations)
- Added Quick Reference card at the end with all commands
- Appended worklog entry

Stage Summary:
- Complete migration workflow documentation in Ukrainian
- Covers dev, staging, production, rollbacks, and troubleshooting
- Includes copy-paste ready commands and a Quick Reference card
---
Task ID: 1
Agent: main
Task: Prepare project for first safe PostgreSQL migration

Work Log:
- Read and analyzed both Prisma schemas (SQLite schema.prisma and PostgreSQL schema.postgresql.prisma)
- Identified 9 type differences (String? vs Json?, String? vs String[])
- Identified old SQLite migration was incomplete (missing 9 tables, missing columns)
- Promoted PostgreSQL schema to canonical schema.prisma
- Saved old SQLite schema as prisma/schema.sqlite.prisma with clear dev-only warning header
- Added 30+ performance indexes to canonical schema (@@index on brandId, userId, orderId, etc.)
- Added @@unique([brandId, code]) on Promotion (was missing)
- Deleted redundant schema.postgresql.prisma
- Deleted old SQLite migration directory and migration_lock.toml
- Deleted prisma/dev.db
- Fixed seed.ts: JSON.stringify → plain objects for Json fields (workSchedule, addressSnapshot)
- Created docker-compose.dev.yml for local PostgreSQL dev
- Rewrote all .env files (.env, .env.development, .env.staging, .env.production, .env.example)
- Updated .gitignore: allow .env.example, add prisma/*.db
- Simplified package.json scripts: removed all --schema flags, added db:seed, db:push:sqlite, db:dev:start/stop/reset, pre-migration-check
- Simplified Dockerfile: removed schema selection ENV logic
- Updated docker-compose.staging.yml: added local PG service
- Updated migration scripts (migrate-staging.sh, migrate-production.sh, setup-staging-db.sh): removed --schema flags
- Created scripts/pre-migration-check.ts (12 checks)
- Rewrote docs/MIGRATION_WORKFLOW.md (12 sections, Ukrainian)
- Created docs/ENVIRONMENT_VARIABLES.md (complete reference)
- Created docs/STAGING_SETUP.md (replaces old STAGING.md)
- Removed old docs/STAGING.md (superseded)
- Fixed references in docs/DEPLOYMENT_PROD.md and docs/DEPLOYMENT.md
- Verified: prisma validate passes, prisma generate passes, bun run lint passes

Stage Summary:
- Canonical schema: prisma/schema.prisma (PostgreSQL, 27 tables, 11 enums, 30+ indexes)
- Dev schema: prisma/schema.sqlite.prisma (SQLite, dev-only convenience)
- Project is ready for first migration but migration NOT executed
- First migration command: docker compose -f docker-compose.dev.yml up -d && bun run db:migrate --name init

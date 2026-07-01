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
# SushiChain — White-Label Food Ordering Platform

Мульти-тенантная платформа для заказа еды. Один бэкенд, много брендов.

## Стек
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: Prisma ORM (SQLite dev / PostgreSQL prod)
- **UI**: Tailwind CSS 4 + shadcn/ui (New York)
- **State**: Zustand
- **Auth**: JWT (jose)
- **Charts**: Recharts

## Быстрый старт
```bash
bun install
bun run db:push
bun run prisma/seed.ts
bun run dev
```

## Аккаунты (password: 12345678)
| Роль | Email |
|------|-------|
| Super Admin | super@sushichain.ua |
| Sushi Admin | admin@sushi-master.ua |
| Pizza Admin | admin@pizza-napoli.ua |
| Customer | customer@example.com |

## Структура
```
src/
  app/           # Next.js App Router (pages + API routes)
  components/    # React components (admin/, storefront/, ui/)
  domain/        # Business logic services
  lib/           # Utilities (auth, db, tenant, api-response)
  hooks/         # Custom React hooks
prisma/
  schema.prisma  # Database schema
  seed.ts        # Seed data (3 brands)
docs/
  openapi.yaml   # Swagger API contract
  API.md         # Mobile developer guide
  DEPLOYMENT.md  # PostgreSQL setup guide
```

## Документация
- [API Contract](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [CHANGELOG](CHANGELOG.md)
- [ROADMAP](ROADMAP.md)
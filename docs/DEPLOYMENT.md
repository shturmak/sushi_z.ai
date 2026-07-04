# SushiChain — Deployment Guide

## Overview

SushiChain uses **SQLite for local development** and **PostgreSQL for staging/production**. The Prisma schema is configured for SQLite by default. Switching to PostgreSQL requires changing the `provider` in the schema and updating the `DATABASE_URL`.

---

## Environment: Local vs. Staging/Production

| Aspect | Local Development | Staging / Production |
|--------|------------------|---------------------|
| Database | SQLite (`file:db/custom.db`) | PostgreSQL |
| Schema provider | `sqlite` | `postgresql` |
| JSON fields | Stored as `String` (text) | Native `Json` type |
| Migrations | `prisma db push` (prototyping) | `prisma migrate deploy` (production) |
| Seeding | `bun run prisma/seed.ts` | `bun run prisma/seed.ts` |

---

## Setting Up PostgreSQL

### Option 1: Railway

1. Create a new project at [railway.app](https://railway.app)
2. Add a **PostgreSQL** service from the marketplace
3. Railway provides a `DATABASE_URL` automatically — copy it from the service's Variables tab
4. Add it to your Railway project environment variables (or your deployment platform's env config)

### Option 2: Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string**
3. Copy the connection string (use the "URI" format)
4. Replace `[YOUR-PASSWORD]` with your database password
5. Add `?schema=public` to the end of the URL

### Option 3: AWS RDS

1. Create an RDS instance (PostgreSQL 15+ recommended) via AWS Console or Terraform
2. Configure security group to allow inbound traffic on port 5432
3. Create a database and user:
   ```sql
   CREATE DATABASE sushichain;
   CREATE USER sushichain WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE sushichain TO sushichain;
   ```
4. Connection string: `postgresql://sushichain:your-password@your-instance.rds.amazonaws.com:5432/sushichain?schema=public`

### Option 4: Docker (local PostgreSQL)

```bash
docker run --name sushichain-pg \
  -e POSTGRES_USER=sushichain \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=sushichain \
  -p 5432:5432 \
  -d postgres:16-alpine
```

---

## Switching from SQLite to PostgreSQL

### Step 1: Update the Prisma schema

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Also ensure JSON string fields use native `Json` type (see `prisma/schema.prisma` for reference):
- `Branch.workSchedule`: `String?` → `Json?`
- `DeliveryZone.polygonData`: `String?` → `Json?`
- `CartItem.selectedOptions`: `String?` → `Json?`
- `Order.addressSnapshot`: `String?` → `Json?`
- `OrderItem.selectedOptions`: `String?` → `Json?`
- `Payment.providerPayload`: `String?` → `Json?`

> **Note:** When changing `String` → `Json`, you'll need to update any application code that does `JSON.parse(field)` — with the native `Json` type, Prisma returns parsed objects directly.

### Step 2: Update DATABASE_URL

```bash
DATABASE_URL="postgresql://user:password@host:5432/sushichain?schema=public"
```

### Step 3: Install the PostgreSQL client library

```bash
bun add @prisma/adapter pg
# or if you prefer the driver adapter approach:
bun add @prisma/adapter-pg pg
```

---

## Running Migrations

### Prisma Migrate (recommended for production)

Migrate creates a history of schema changes and is the safest approach:

```bash
# First migration (or after schema changes):
npx prisma migrate dev --name init

# Deploy pending migrations in production (no interactive prompts):
npx prisma migrate deploy

# Our shortcut script:
bun run db:migrate:deploy
```

### db:push (prototyping only)

`db:push` syncs the schema without creating migration files. It's fast but **not recommended for production** because it doesn't track history:

```bash
# Local dev only:
bun run db:push
```

### When to use which?

| Command | Use Case | Creates migration files? |
|---------|----------|------------------------|
| `prisma migrate dev` | Development — apply & record schema changes | ✅ Yes |
| `prisma migrate deploy` | Production — apply pending migrations | ❌ No (applies existing) |
| `prisma db push` | Prototyping — quick schema sync | ❌ No |

---

## Seeding the Database

```bash
bun run prisma/seed.ts
```

This populates the database with sample branches, categories, products, and promotions.

---

## Required Environment Variables (Production)

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/sushichain?schema=public"

# Auth
JWT_SECRET="your-random-256-bit-secret"
JWT_REFRESH_SECRET="your-random-256-bit-refresh-secret"

# App
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NODE_ENV="production"
```

---

## Deployment Checklist

- [ ] PostgreSQL database provisioned (Railway / Supabase / RDS)
- [ ] `DATABASE_URL` set in deployment environment
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` set (use strong random values)
- [ ] Schema provider changed to `postgresql` in `prisma/schema.prisma`
- [ ] JSON fields changed from `String` to `Json` type
- [ ] Application code updated to not `JSON.parse()` Json-typed fields
- [ ] `prisma migrate deploy` runs as a build step or startup command
- [ ] `bun run prisma/seed.ts` executed (if seeding is desired)
- [ ] Health check endpoint responding
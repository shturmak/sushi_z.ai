# SushiChain — Staging Environment Guide

## Overview

The staging environment is a **mirror of production** that runs on its own server with a PostgreSQL database, isolated from real users and live payment providers. It serves as the final validation gate before any code reaches production.

**Why staging?**

- Validate schema migrations and data integrity with PostgreSQL (dev uses SQLite)
- Test new features end-to-end with realistic data
- Run the full deployment pipeline without risk
- QA sign-off happens here, not on production

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Staging Server (Ubuntu 22.04)                   │
│                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Caddy    │→│  Next.js 16  │→│  PostgreSQL │  │
│  │  (port 80)│  │  (port 3000)│  │  (port 5432)│ │
│  └──────────┘  └──────────────┘  └────────────┘  │
│                                                  │
│  docker-compose.staging.yml orchestrates all      │
└──────────────────────────────────────────────────┘
```

| Component | Dev (local) | Staging |
|-----------|-------------|---------|
| Database | SQLite (`file:db/custom.db`) | PostgreSQL 16 (Docker) |
| Schema | `prisma/schema.prisma` (sqlite provider) | Same file, provider → `postgresql` |
| JSON fields | Stored as `String` | Native `Json` type |
| Migrations | `prisma db push` | `prisma migrate deploy` |
| Runtime | `bun run dev` | `NODE_ENV=production bun server.js` |
| Reverse proxy | None | Caddy |

---

## 1. Provision the Server

### Minimum requirements

- **OS:** Ubuntu 22.04 LTS
- **CPU:** 2 vCPU
- **RAM:** 2 GB
- **Disk:** 20 GB SSD

### Initial server setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Git, curl, basic utils
sudo apt install -y git curl ufw

# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Caddy auto-provisions HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin (included with get.docker.com)
docker compose version

# Log out and back in for docker group to take effect
exit
```

---

## 2. Clone & Configure

```bash
# Clone the repository
git clone git@github.com:your-org/sushichain.git /opt/sushichain
cd /opt/sushichain

# Checkout the staging branch
git checkout staging
```

### Create `.env.staging`

```bash
cat > .env.staging << 'EOF'
# ── Database ──────────────────────────────────────
DATABASE_URL=postgresql://sushichain:s3cret@postgres:5432/sushichain_staging?schema=public
POSTGRES_USER=sushichain
POSTGRES_PASSWORD=s3cret
POSTGRES_DB=sushichain_staging

# ── Auth ──────────────────────────────────────────
JWT_SECRET=staging-jwt-secret-change-me-in-production-32chars
JWT_REFRESH_SECRET=staging-refresh-secret-change-me-32chars

# ── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://staging.sushichain.app
NODE_ENV=production
EOF
```

> **Important:** Never reuse staging secrets in production. Generate fresh secrets with:
> ```bash
> openssl rand -base64 32
> ```

### Switch Prisma schema to PostgreSQL

The schema file (`prisma/schema.prisma`) defaults to SQLite. For staging, change the provider:

```bash
# Change provider from sqlite to postgresql
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
```

Also update JSON fields from `String?` to `Json?` (see `prisma/schema.postgresql.prisma` for the complete reference):

```bash
# Fields that need String → Json for PostgreSQL
# - Branch.workSchedule
# - DeliveryZone.polygonData
# - CartItem.selectedOptions
# - Order.addressSnapshot
# - OrderItem.selectedOptions
# - Payment.providerPayload
```

---

## 3. Docker Compose for Staging

Create `docker-compose.staging.yml` in the project root:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    env_file: .env.staging
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile.staging:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  pg_data:
  caddy_data:
  caddy_config:
```

### Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM node:20-slim AS base

# Install Bun
RUN npm install -g bun

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (PostgreSQL)
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate

# Build Next.js
RUN bun run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Caddyfile for staging

Create `Caddyfile.staging`:

```
staging.sushichain.app {
    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
    }
}
```

---

## 4. Deploy

```bash
cd /opt/sushichain

# Build and start all services
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Run database migrations
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy

# Seed with test data
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

### Verify deployment

```bash
# Check all containers are running
docker compose -f docker-compose.staging.yml ps

# Check app logs
docker compose -f docker-compose.staging.yml logs -f app

# Quick health check
curl -s http://localhost:3000/api | head -c 200
```

---

## 5. Test Data

The seed script (`prisma/seed.ts`) populates the database with:

| Entity | Count | Details |
|--------|-------|---------|
| Brands | 3 | Суші Мастер, Піца Наполі, Бургер Лаб |
| Branches | 3+ | One per brand with work schedules |
| Categories | 9+ | Rolls, Sushi, Pizza, Burgers, Drinks, etc. |
| Products | 30+ | With option groups (size, spiciness) |
| Promotions | 3 | Percentage, fixed, free delivery |
| Users | 1 | Demo customer with password `password123` |
| Orders | 3 | Various statuses (new, completed, cancelled) |

### Re-seed between test cycles

```bash
# Full reset: wipe DB, re-run migrations, re-seed
docker compose -f docker-compose.staging.yml exec app sh -c \
  "npx prisma migrate reset --force && bun run prisma/seed.ts"

# Seed only (without reset, adds duplicates — use for specific data only)
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

---

## 6. CI Integration

### Deployment pipeline

```
push to staging branch
        │
        ▼
   GitHub Actions
        │
        ├─ Lint & Type Check
        ├─ Unit Tests
        ├─ Build Docker Image
        └─ Push to Registry
              │
              ▼
      SSH to staging server
              │
              ├─ docker compose pull
              ├─ docker compose up -d
              ├─ prisma migrate deploy
              └─ (manual) prisma/seed.ts
```

### Example GitHub Actions workflow

Create `.github/workflows/staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint
        run: bun run lint

      - name: Build
        run: bun run build

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/sushichain
            git pull origin staging
            docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
            docker compose -f docker-compose.staging.yml exec -T app npx prisma migrate deploy
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | Server IP or hostname |
| `STAGING_USER` | SSH username (e.g. `deploy`) |
| `STAGING_SSH_KEY` | Private SSH key for the deploy user |

---

## 7. Testing on Staging — Pre-Promotion Checklist

Run through this checklist before merging `staging` into `main`/`production`:

### Core functionality

- [ ] **Auth**: Register, login, token refresh, logout all work
- [ ] **Menu**: Browse brands → branches → categories → products
- [ ] **Cart**: Add items, update quantity, apply options, view totals
- [ ] **Checkout**: Place delivery and pickup orders successfully
- [ ] **Order flow**: Full status lifecycle (new → confirmed → cooking → ready → delivering → completed)
- [ ] **Cancel**: Order cancellation works and refunds loyalty points

### Admin functionality

- [ ] **Dashboard**: Loads with KPI cards and charts
- [ ] **Menu management**: Create/edit/deactivate products and categories
- [ ] **Orders**: List, filter, status transitions, detail view
- [ ] **Promotions**: Create/edit promotions, validate codes at checkout
- [ ] **Branches**: CRUD operations, delivery zones

### Data integrity

- [ ] **PostgreSQL JSON fields**: Address snapshots, work schedules, cart options parse correctly
- [ ] **Migrations**: `prisma migrate status` shows no pending migrations
- [ ] **Seed data**: All seed entities present and relationships intact

### Performance & security

- [ ] **Page load**: Homepage loads in < 3s
- [ ] **Rate limiting**: Repeated requests return 429 after threshold
- [ ] **Auth guards**: Admin routes return 401 without valid token
- [ ] **No data leaks**: Staging URLs not indexed (robots.txt blocks crawlers)

---

## 8. Resetting Staging

### Full database reset

Wipes all data, re-runs all migrations from scratch, and re-seeds:

```bash
docker compose -f docker-compose.staging.yml exec app sh -c \
  "npx prisma migrate reset --force && bun run prisma/seed.ts"
```

### Nuclear reset (including volumes)

Destroys PostgreSQL data volume entirely:

```bash
# Stop everything
docker compose -f docker-compose.staging.yml down

# Remove the database volume
docker volume rm sushichain_pg_data

# Start fresh
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Wait for PostgreSQL to be ready, then migrate and seed
sleep 10
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

### Quick data-only wipe (preserves schema)

```bash
docker compose -f docker-compose.staging.yml exec postgres psql -U sushichain -d sushichain_staging \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.staging.yml exec app bun run prisma/seed.ts
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.staging.yml logs app
docker compose -f docker-compose.staging.yml logs postgres

# Common issue: Prisma client not generated for PostgreSQL
docker compose -f docker-compose.staging.yml exec app npx prisma generate
```

### Migration conflicts

```bash
# If migrations are out of sync, resolve on your dev machine first:
npx prisma migrate dev
git add prisma/migrations/
git commit -m "add migration"
git push origin staging

# Then on staging:
docker compose -f docker-compose.staging.yml exec app npx prisma migrate deploy
```

### Database connection refused

```bash
# Verify PostgreSQL is healthy
docker compose -f docker-compose.staging.yml exec postgres pg_isready

# Check the DATABASE_URL in the app container
docker compose -f docker-compose.staging.yml exec app printenv DATABASE_URL
```
# SushiChain — Production Deployment Guide

Complete step-by-step guide for deploying SushiChain to a production server with Docker, PostgreSQL, Nginx, and SSL.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Prerequisites](#2-prerequisites)
3. [Step-by-Step Deployment](#3-step-by-step-deployment)
4. [Domain Setup](#4-domain-setup)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Common Operations](#6-common-operations)
7. [Monitoring](#7-monitoring)
8. [Security Checklist](#8-security-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Server Requirements

### Minimum Specifications

| Resource  | Minimum       | Recommended        |
|-----------|---------------|--------------------|
| CPU       | 2 cores       | 4 cores            |
| RAM       | 4 GB          | 8 GB               |
| Storage   | 20 GB SSD     | 50 GB SSD          |
| OS        | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Bandwidth | 10 Mbps       | 100 Mbps           |

### Software Stack

| Component        | Version           |
|------------------|-------------------|
| Docker           | 24.0+             |
| Docker Compose   | 2.20+             |
| Nginx            | 1.24+             |
| Certbot          | 2.7+              |
| PostgreSQL       | 16 (via Docker)   |
| Bun              | 1.1+              |
| Node.js          | 20+ (for npm/npx) |

### Architecture Overview

```
Internet
    │
    ▼
┌─────────────┐
│  Nginx :80  │──── Let's Encrypt (certbot)
│  Nginx :443 │
└──────┬──────┘
       │ reverse_proxy
       ▼
┌──────────────────┐
│  Next.js App     │  port 3000
│  (standalone)    │
│  Bun runtime     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  PostgreSQL 16   │  port 5432 (internal only)
│  (Docker)        │
└──────────────────┘
```

---

## 2. Prerequisites

### 2.1 Install Docker

```bash
# Install Docker CE
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (log out/in after)
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

### 2.2 Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### 2.3 Install Nginx and Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2.4 Install Git

```bash
sudo apt install -y git
```

### 2.5 Configure DNS

Before starting deployment, configure your DNS records (see [Section 4 — Domain Setup](#4-domain-setup) for full details).

---

## 3. Step-by-Step Deployment

### 3.1 Clone the Repository

```bash
# Create application directory
sudo mkdir -p /opt/sushichain
sudo chown $USER:$USER /opt/sushichain

# Clone
cd /opt/sushichain
git clone https://github.com/your-org/sushichain.git .

# If using a private repo with SSH:
# git clone git@github.com:your-org/sushichain.git .
```

### 3.2 Configure Environment Variables

```bash
# Copy the example (create one if it doesn't exist)
cp .env.example .env

# Edit with your production values
nano .env
```

Set the following minimum variables for production:

```bash
# ── Database (PostgreSQL) ──────────────────────────────────────
DATABASE_URL="postgresql://sushichain:YOUR_DB_PASSWORD@db:5432/sushichain?schema=public"

# ── Runtime ────────────────────────────────────────────────────
NODE_ENV="production"

# ── Auth (generate strong secrets — see below) ─────────────────
JWT_SECRET="YOUR_RANDOM_256_BIT_SECRET"
JWT_REFRESH_SECRET="YOUR_RANDOM_256_BIT_REFRESH_SECRET"

# ── Domain ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://sushichain.example.com"
BRAND_DOMAIN="sushichain.example.com"

# ── Optional: Payments ────────────────────────────────────────
# LIQPAY_PUBLIC_KEY=""
# LIQPAY_PRIVATE_KEY=""

# ── Optional: Telegram Bot ────────────────────────────────────
# TELEGRAM_BOT_TOKEN=""
# TELEGRAM_ADMIN_CHAT_ID=""
```

**Generate strong secrets:**

```bash
# JWT_SECRET (64 hex chars = 256 bits)
openssl rand -hex 32

# JWT_REFRESH_SECRET
openssl rand -hex 32
```

> **See [Section 5](#5-environment-variables-reference) for the full reference table.**

### 3.3 Create Docker Compose Configuration

Create `docker-compose.yml` in the project root:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: sushichain-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: sushichain
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
      POSTGRES_DB: sushichain
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      # Bind to localhost only — not exposed to the internet
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sushichain"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sushichain-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://sushichain:${DB_PASSWORD:-changeme}@db:5432/sushichain?schema=public
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
      - BRAND_DOMAIN=${BRAND_DOMAIN:-sushichain.example.com}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
    driver: local
```

### 3.4 Create Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
# ── Stage 1: Dependencies ──────────────────────────────────────
FROM oven/bun:1.1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ── Stage 2: Build ────────────────────────────────────────────
FROM oven/bun:1.1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for PostgreSQL
RUN bunx prisma generate --schema=prisma/schema.postgresql.prisma

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# ── Stage 3: Production ───────────────────────────────────────
FROM oven/bun:1.1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Copy Prisma PostgreSQL schema for migrations
COPY --from=builder /app/prisma/schema.postgresql.prisma ./prisma/schema.postgresql.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
```

### 3.5 Switch Schema to PostgreSQL

Before building, ensure the Prisma schema uses PostgreSQL:

```bash
# The Dockerfile already references schema.postgresql.prisma for generate.
# But if you need to run commands locally, swap the provider:
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### 3.6 Build and Start

```bash
# Build the Docker image
docker compose build

# Start PostgreSQL first and wait for it to be ready
docker compose up -d db

# Run database migrations
docker compose exec app npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# (Optional) Seed the database with sample data
docker compose exec app bun run prisma/seed.ts

# Start the application
docker compose up -d
```

### 3.7 Verify the Application Is Running

```bash
# Check container status
docker compose ps

# Check application logs
docker compose logs -f app

# Test the health endpoint
curl http://localhost:3000/api
# Expected: {"message":"Hello, world!"}
```

### 3.8 Configure Nginx Reverse Proxy

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/sushichain
```

```nginx
# ── HTTP → HTTPS redirect ──────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name sushichain.example.com *.sushichain.example.com;

    # Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# ── HTTPS ─────────────────────────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sushichain.example.com *.sushichain.example.com;

    # SSL certificates (will be configured by certbot)
    ssl_certificate     /etc/letsencrypt/live/sushichain.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sushichain.example.com/privkey.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets — longer cache
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    # Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Upload size limit
    client_max_body_size 10M;
}
```

Enable the site and test the configuration:

```bash
# Create certbot directory
sudo mkdir -p /var/www/certbot

# Enable the site (first without SSL to get the certificate)
# Temporarily use a simple config without SSL blocks:

sudo ln -sf /etc/nginx/sites-available/sushichain /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config (will warn about missing certs — that's OK for now)
sudo nginx -t
```

### 3.9 Set Up SSL with Let's Encrypt

```bash
# Obtain the SSL certificate (wildcard certificate)
sudo certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d "sushichain.example.com" \
  -d "*.sushichain.example.com" \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email

# If wildcard DNS is not set up yet, get a single certificate first:
# sudo certbot certonly \
#   --webroot \
#   --webroot-path=/var/www/certbot \
#   -d "sushichain.example.com" \
#   --email admin@example.com \
#   --agree-tos \
#   --no-eff-email

# Test nginx again (should pass now)
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test the renewal process (dry run)
sudo certbot renew --dry-run
```

### 3.10 Final Verification

```bash
# 1. Check all services are running
docker compose ps

# 2. Test HTTP → HTTPS redirect
curl -I http://sushichain.example.com
# Should return 301 with Location: https://...

# 3. Test HTTPS
curl -I https://sushichain.example.com
# Should return 200

# 4. Test API health endpoint
curl https://sushichain.example.com/api
# Expected: {"message":"Hello, world!"}

# 5. Test a brand subdomain
curl -I https://sushi-master.sushichain.example.com
# Should return 200

# 6. Check SSL certificate
curl -vI https://sushichain.example.com 2>&1 | rg "SSL certificate|expire|subject"
```

---

## 4. Domain Setup

### 4.1 DNS Configuration

SushiChain uses **subdomain-based multi-tenancy**. Each brand gets its own subdomain.

Configure the following DNS records with your domain registrar:

| Type  | Name                      | Value              | TTL   |
|-------|---------------------------|--------------------|-------|
| A     | `sushichain`              | `YOUR_SERVER_IP`   | 300   |
| A     | `*.sushichain`            | `YOUR_SERVER_IP`   | 300   |

> **Wildcard record (`*.sushichain`)** — This single record covers all brand subdomains.

### 4.2 Domain Routing

The middleware (`src/middleware.ts`) resolves the brand from the subdomain:

```
sushichain.example.com          → Brand picker (home page)
sushi-master.sushichain.example.com  → Brand "sushi-master" storefront
tokyo-rolls.sushichain.example.com   → Brand "tokyo-rolls" storefront
admin.sushichain.example.com    → Admin panel (reserved)
api.sushichain.example.com      → API (reserved)
www.sushichain.example.com      → Redirects to main domain (reserved)
```

### 4.3 `BRAND_DOMAIN` Environment Variable

Set this to your base domain so the middleware can extract brand slugs from subdomains:

```bash
# In .env
BRAND_DOMAIN="sushichain.example.com"
```

### 4.4 Path-Based Fallback

If subdomain routing is not available, SushiChain also supports path-based routing:

```
sushichain.example.com/b/sushi-master/     → Brand "sushi-master" storefront
sushichain.example.com/b/tokyo-rolls/      → Brand "tokyo-rolls" storefront
```

### 4.5 Adding a New Brand Domain

When you create a new brand in the admin panel with slug `my-brand`, it becomes accessible at:

```
https://my-brand.sushichain.example.com
```

No additional DNS or Nginx configuration is needed — the wildcard record and Nginx `server_name` directive handle all subdomains automatically.

---

## 5. Environment Variables Reference

### Required Variables

| Variable               | Example                                              | Description                                                    |
|------------------------|------------------------------------------------------|----------------------------------------------------------------|
| `DATABASE_URL`         | `postgresql://sushichain:pw@db:5432/sushichain?schema=public` | PostgreSQL connection string (use `db` as host inside Docker) |
| `JWT_SECRET`           | `a1b2c3d4...` (64 hex chars)                         | Secret for signing JWT access tokens (generate with `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET`   | `e5f6g7h8...` (64 hex chars)                         | Secret for signing JWT refresh tokens                          |
| `NODE_ENV`             | `production`                                         | Must be set to `production`                                    |
| `NEXT_PUBLIC_APP_URL`  | `https://sushichain.example.com`                     | Public URL of the application (used for links, redirects)      |
| `BRAND_DOMAIN`         | `sushichain.example.com`                             | Base domain for subdomain-based brand routing                  |

### Optional Variables

| Variable                | Default      | Description                                              |
|-------------------------|--------------|----------------------------------------------------------|
| `DB_PASSWORD`           | —            | PostgreSQL password (referenced in docker-compose.yml)   |
| `LIQPAY_PUBLIC_KEY`     | —            | LiqPay payment gateway public key                        |
| `LIQPAY_PRIVATE_KEY`    | —            | LiqPay payment gateway private key                       |
| `TELEGRAM_BOT_TOKEN`    | —            | Telegram bot token for notifications                     |
| `TELEGRAM_ADMIN_CHAT_ID`| —            | Telegram chat ID for admin alerts                        |

### Variable Precedence

Environment variables are loaded in this order (later overrides earlier):

1. `.env` file in the project root
2. Docker Compose `environment:` section
3. Shell environment variables (when running outside Docker)

---

## 6. Common Operations

### 6.1 Updating the Application

```bash
cd /opt/sushichain

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker compose up -d --build

# Verify
docker compose ps
docker compose logs --tail=50 app
```

### 6.2 Running Database Migrations

```bash
# Apply pending migrations
docker compose exec app npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# If you need to create a new migration (during development):
# docker compose exec app npx prisma migrate dev --name your_change --schema=prisma/schema.postgresql.prisma
```

### 6.3 Viewing Logs

```bash
# Application logs (follow mode)
docker compose logs -f app

# Database logs
docker compose logs -f db

# Last 100 lines of app logs
docker compose logs --tail=100 app

# Logs since a specific time
docker compose logs --since="2025-01-15T10:00:00" app
```

### 6.4 Database Backups

SushiChain uses PostgreSQL in production. Use `pg_dump` for backups:

```bash
# Manual backup
docker compose exec db pg_dump -U sushichain -Fc sushichain > /opt/sushichain/backups/sushichain-$(date +%Y%m%d-%H%M%S).dump

# Create backup directory if it doesn't exist
mkdir -p /opt/sushichain/backups
```

#### Automated Backups with Cron

```bash
# Edit crontab
crontab -e

# Daily backup at 3:00 AM, keep last 30 days
0 3 * * * mkdir -p /opt/sushichain/backups && docker compose -f /opt/sushichain/docker-compose.yml exec -T db pg_dump -U sushichain -Fc sushichain > /opt/sushichain/backups/sushichain-$(date +\%Y\%m\%d-\%H\%M\%S).dump && find /opt/sushichain/backups -name "*.dump" -mtime +30 -delete
```

#### Restoring from Backup

```bash
# List available backups
ls -lh /opt/sushichain/backups/

# Restore (WARNING: this overwrites the current database)
docker compose exec -T db pg_restore -U sushichain -d sushichain --clean --if-exists < /opt/sushichain/backups/sushichain-20250115-030000.dump

# Or restore to a fresh database:
docker compose exec db psql -U sushichain -c "DROP DATABASE sushichain;"
docker compose exec db psql -U sushichain -c "CREATE DATABASE sushichain;"
docker compose exec -T db pg_restore -U sushichain -d sushichain < /opt/sushichain/backups/sushichain-20250115-030000.dump
```

> **Note:** The `bun run db:backup` command is designed for SQLite. For PostgreSQL, use `pg_dump`/`pg_restore` as shown above. See `docs/BACKUP_GUIDE.md` for SQLite backup details.

### 6.5 Restarting Services

```bash
# Restart everything
docker compose restart

# Restart only the app
docker compose restart app

# Stop everything
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
# docker compose down -v
```

### 6.6 Seeding the Database

```bash
# Run the seed script
docker compose exec app bun run prisma/seed.ts
```

### 6.7 Accessing the Database

```bash
# Open a PostgreSQL shell
docker compose exec db psql -U sushichain -d sushichain

# Useful queries:
# \dt                    -- list all tables
# SELECT count(*) FROM orders;
# SELECT * FROM brands;
# \q                     -- quit
```

---

## 7. Monitoring

### 7.1 Log Files and Locations

| Source            | How to Access                                          |
|-------------------|--------------------------------------------------------|
| Application logs  | `docker compose logs -f app`                           |
| Database logs     | `docker compose logs -f db`                            |
| Nginx access log  | `sudo tail -f /var/log/nginx/access.log`               |
| Nginx error log   | `sudo tail -f /var/log/nginx/error.log`                |
| System log        | `sudo journalctl -u docker -f`                         |
| Certbot log       | `sudo tail -f /var/log/letsencrypt/letsencrypt.log`    |

### 7.2 Health Check Endpoint

The `/api` endpoint returns a JSON response indicating the application is running:

```bash
# Check health
curl -s https://sushichain.example.com/api

# With status code
curl -s -o /dev/null -w "%{http_code}" https://sushichain.example.com/api
# Expected: 200
```

### 7.3 Monitoring Script

Create a simple monitoring script at `/opt/sushichain/monitor.sh`:

```bash
#!/bin/bash
# SushiChain Health Monitor
# Run via cron: */5 * * * * /opt/sushichain/monitor.sh

APP_URL="https://sushichain.example.com/api"
LOG="/var/log/sushichain-monitor.log"

response=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")
timestamp=$(date +"%Y-%m-%d %H:%M:%S")

if [ "$response" != "200" ]; then
    echo "[$timestamp] FAIL: HTTP $response" >> "$LOG"
    # Optionally: send alert (e.g., Telegram)
    # curl -s "https://api.telegram.org/bot$TOKEN/sendMessage" -d "chat_id=$CHAT_ID&text=SushiChain DOWN: HTTP $response"
else
    echo "[$timestamp] OK" >> "$LOG"
fi
```

```bash
chmod +x /opt/sushichain/monitor.sh

# Add to crontab for every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sushichain/monitor.sh") | crontab -
```

### 7.4 Disk Usage Monitoring

```bash
# Check Docker disk usage
docker system df

# Check PostgreSQL data volume
docker compose exec db psql -U sushichain -c "SELECT pg_size_pretty(pg_database_size('sushichain'));"
```

---

## 8. Security Checklist

### 8.1 Firewall (UFW)

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT: do this first to avoid locking yourself out)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

Expected output:

```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
22/tcp (v6)                ALLOW IN    Anywhere
80/tcp (v6)                ALLOW IN    Anywhere
443/tcp (v6)               ALLOW IN    Anywhere
```

### 8.2 SSH Key Authentication

```bash
# On your local machine — generate a key pair (if you don't have one)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy the public key to the server
ssh-copy-id user@YOUR_SERVER_IP

# On the server — disable password authentication
sudo nano /etc/ssh/sshd_config

# Set these values:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin prohibit-password

# Restart SSH
sudo systemctl restart sshd
```

### 8.3 Fail2Ban

```bash
# Install
sudo apt install -y fail2ban

# Create a local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Ensure these settings are present:
# [sshd]
# enabled = true
# port = ssh
# filter = sshd
# logpath = /var/log/auth.log
# maxretry = 5
# bantime = 3600
# findtime = 600

# [nginx-http-auth]
# enabled = true

# Start and enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 8.4 Environment Secrets Security

```bash
# Set strict permissions on .env
chmod 600 /opt/sushichain/.env

# Verify no secrets are in git
cd /opt/sushichain
git ls-files | xargs rg -l "PASSWORD\|SECRET\|PRIVATE_KEY" || echo "No secrets in tracked files"

# Ensure .env is in .gitignore
rg "^\.env$" /opt/sushichain/.gitignore
```

### 8.5 Security Checklist Summary

- [ ] Firewall (UFW) configured — only ports 22, 80, 443 open
- [ ] SSH key authentication enabled, password login disabled
- [ ] Fail2Ban installed and running
- [ ] `.env` file has `600` permissions
- [ ] No secrets committed to Git
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong random values (64 hex chars)
- [ ] PostgreSQL port 5432 is NOT exposed to the internet (bound to `127.0.0.1` only)
- [ ] SSL/TLS enabled with HSTS header
- [ ] Nginx security headers configured (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] `client_max_body_size` set appropriately in Nginx
- [ ] Docker containers run as non-root user
- [ ] Automatic security updates enabled: `sudo apt install unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades`

---

## 9. Troubleshooting

### 9.1 Container Won't Start

**Symptom:** `docker compose up` fails or containers exit immediately.

```bash
# Check container logs
docker compose logs app

# Check if port 3000 is already in use
sudo ss -tlnp | rg 3000

# Check if PostgreSQL is reachable from the app container
docker compose exec app sh -c "wget -qO- db:5432 || echo 'DB not reachable'"
```

**Common causes:**
- Port 3000 already in use by another process
- `DATABASE_URL` is incorrect (check host, credentials)
- Missing or invalid `.env` variables

### 9.2 Database Connection Errors

**Symptom:** `PrismaClientInitializationError: Can't reach database server`

```bash
# Check if PostgreSQL is running
docker compose ps db

# Check PostgreSQL logs
docker compose logs db

# Test connection manually
docker compose exec db psql -U sushichain -d sushichain -c "SELECT 1;"

# If using external DB, test from the server:
pg_isready -h YOUR_DB_HOST -p 5432 -U sushichain
```

**Common causes:**
- PostgreSQL container not running
- Wrong `DATABASE_URL` (host should be `db` inside Docker, or external IP/host)
- Database not yet created (run migrations first)

### 9.3 Migration Errors

**Symptom:** `prisma migrate deploy` fails

```bash
# Check migration status
docker compose exec app npx prisma migrate status --schema=prisma/schema.postgresql.prisma

# If migrations are out of sync, you may need to:
# 1. Resolve manually
# 2. Or reset (DESTRUCTIVE — only for fresh deployments):
docker compose exec app npx prisma migrate reset --force --schema=prisma/schema.postgresql.prisma
```

### 9.4 SSL Certificate Issues

**Symptom:** Browser shows "Not Secure" or certificate errors

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/sushichain.example.com/fullchain.pem -noout -dates

# If wildcard certificate fails, ensure DNS has a wildcard record:
dig +short *.sushichain.example.com
```

### 9.5 Nginx 502 Bad Gateway

**Symptom:** Nginx returns 502 when accessing the site

```bash
# Check if the app is running
curl http://127.0.0.1:3000/api

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Common causes:
# 1. App container crashed — restart it:
docker compose restart app

# 2. Nginx proxy_pass pointing to wrong port — check config:
sudo nginx -t
```

### 9.6 Subdomain Routing Not Working

**Symptom:** Brand subdomains show the default page instead of the brand storefront

```bash
# Verify BRAND_DOMAIN is set correctly
docker compose exec app printenv BRAND_DOMAIN

# Check Nginx server_name includes wildcard
sudo rg "server_name" /etc/nginx/sites-available/sushichain

# Test DNS resolution
dig +short sushi-master.sushichain.example.com

# Check if the middleware is receiving the correct Host header
curl -v https://sushi-master.sushichain.example.com 2>&1 | rg "Host:"
```

### 9.7 High Memory Usage

```bash
# Check container resource usage
docker stats

# Limit container memory in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 1G

# Restart with resource limits
docker compose up -d
```

### 9.8 Useful Diagnostic Commands

```bash
# Full system overview
docker compose ps
docker system df
df -h
free -h
uptime

# Network connectivity test
docker compose exec app sh -c "wget -qO- http://db:5432 || echo 'unreachable'"

# Check DNS from inside container
docker compose exec app nslookup db

# Quick restart of everything
docker compose down && docker compose up -d
```

---

## Quick Reference Card

```bash
# ── Deploy from scratch ───────────────────────────────────────
git clone https://github.com/your-org/sushichain.git /opt/sushichain
cd /opt/sushichain && cp .env.example .env && nano .env
docker compose up -d --build
docker compose exec app npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# ── Update ───────────────────────────────────────────────────
cd /opt/sushichain && git pull && docker compose up -d --build

# ── Backup ───────────────────────────────────────────────────
docker compose exec -T db pg_dump -U sushichain -Fc sushichain > backup.dump

# ── Restore ──────────────────────────────────────────────────
docker compose exec -T db pg_restore -U sushichain -d sushichain --clean < backup.dump

# ── Logs ─────────────────────────────────────────────────────
docker compose logs -f app

# ── Restart ──────────────────────────────────────────────────
docker compose restart app

# ── SSL Renewal ──────────────────────────────────────────────
sudo certbot renew
```
#!/usr/bin/env bash
# Usage: ./scripts/setup-staging-db.sh
# First-time staging database setup.
# Requires: DATABASE_URL in .env.staging or passed as argument
#
# Make executable: chmod +x scripts/setup-staging-db.sh

set -euo pipefail

ENV_FILE=".env.staging"
SEED_SCRIPT="prisma/seed.ts"

# ─── Check required tools ───────────────────────────────────
command -v bun >/dev/null 2>&1 || { echo "Error: bun is required but not installed."; exit 1; }
command -v bunx >/dev/null 2>&1 || { echo "Error: prisma CLI (bunx prisma) is required."; exit 1; }

# ─── Resolve DATABASE_URL ───────────────────────────────────
if [[ -n "${1:-}" ]]; then
  export DATABASE_URL="$1"
elif [[ -f "$ENV_FILE" ]]; then
  export DATABASE_URL="$(rg '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Pass it as an argument or add it to $ENV_FILE"
  exit 1
fi

echo "=== Staging Database First-Time Setup ==="
echo ""

# Step 1: Validate schema
echo "[1/4] Validating schema..."
bunx prisma validate
echo "  Schema is valid."

# Step 2: Apply all pending migrations
echo "[2/4] Applying migrations to staging database..."
bunx prisma migrate deploy
echo "  Migrations applied."

# Step 3: Seed data
echo "[3/4] Seeding data..."
if [[ -f "$SEED_SCRIPT" ]]; then
  DATABASE_URL="$DATABASE_URL" bun run prisma/seed.ts 2>&1 || {
    echo "  Warning: Seed encountered issues. Database tables are ready but seed data may be incomplete."
  }
else
  echo "  Warning: Seed script not found at $SEED_SCRIPT — skipping seed."
fi

# Step 4: Verify tables exist
echo "[4/4] Verifying tables..."
TABLES=$(bunx prisma db execute --stdin <<'SQL'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SQL
)
echo "  Tables in database:"
echo "$TABLES" | sed 's/^/    /'

echo ""
echo "=== Staging database setup complete ==="
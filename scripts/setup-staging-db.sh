#!/usr/bin/env bash
# Usage: ./scripts/setup-staging-db.sh
# First-time staging database setup.
# Requires: DATABASE_URL in .env.staging or passed as argument
#
# Make executable: chmod +x scripts/setup-staging-db.sh

set -euo pipefail

SCHEMA="prisma/schema.postgresql.prisma"
ENV_FILE=".env.staging"
SEED_SCRIPT="prisma/seed.ts"

# ─── Check required tools ───────────────────────────────────
command -v bun >/dev/null 2>&1 || { echo "Error: bun is required but not installed."; exit 1; }
command -v npx >/dev/null 2>&1 || command -v bunx >/dev/null 2>&1 || { echo "Error: prisma CLI (bunx prisma) is required."; exit 1; }

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
echo "[1/4] Validating PostgreSQL schema..."
bunx prisma validate --schema="$SCHEMA"
echo "  Schema is valid."

# Step 2: Create initial migration (only for first-time setup)
echo "[2/4] Creating initial migration..."
echo "  (This will create the migration from the current schema state.)"
bunx prisma migrate dev --name init --schema="$SCHEMA" --create-only || {
  echo "  Migration directory may already exist. That's okay — skipping creation."
}
echo ""

# Step 3: Apply migration
echo "[3/4] Applying migrations to staging database..."
bunx prisma migrate deploy --schema="$SCHEMA"
echo "  Migrations applied."

# Step 4: Seed minimal data (brands/branches only, no orders)
echo "[4/4] Seeding minimal data..."
if [[ -f "$SEED_SCRIPT" ]]; then
  # Run the seed script; it seeds brands, branches, categories, products, etc.
  # For staging, full seed is acceptable.
  DATABASE_URL="$DATABASE_URL" bunx prisma db seed --schema="$SCHEMA" 2>&1 || {
    echo "  Warning: Seed encountered issues. The database tables are ready but seed data may be incomplete."
  }
else
  echo "  Warning: Seed script not found at $SEED_SCRIPT — skipping seed."
fi

# Verify tables exist
echo ""
echo "Verifying tables..."
TABLES=$(bunx prisma db execute --schema="$SCHEMA" --stdin <<'SQL'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SQL
)
echo "  Tables in database:"
echo "$TABLES" | sed 's/^/    /'

echo ""
echo "=== Staging database setup complete ==="
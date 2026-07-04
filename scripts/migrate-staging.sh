#!/usr/bin/env bash
# Usage: ./scripts/migrate-staging.sh
# Requires: DATABASE_URL in .env.staging or passed as argument
#
# Make executable: chmod +x scripts/migrate-staging.sh

set -euo pipefail

SCHEMA="prisma/schema.postgresql.prisma"
ENV_FILE=".env.staging"

# ─── Check required tools ───────────────────────────────────
command -v bun >/dev/null 2>&1 || { echo "Error: bun is required but not installed."; exit 1; }

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

echo "=== Staging Migration Deploy ==="
echo ""

# Step 1: Validate PostgreSQL schema
echo "[1/4] Validating PostgreSQL schema..."
bunx prisma validate --schema="$SCHEMA"
echo "  Schema is valid."

# Step 2: Generate Prisma client
echo "[2/4] Generating Prisma client..."
bunx prisma generate --schema="$SCHEMA"
echo "  Client generated."

# Step 3: Show migration status
echo "[3/4] Checking migration status..."
bunx prisma migrate status --schema="$SCHEMA" || true
echo ""

# Step 4: Confirm and deploy
echo "[4/4] Ready to deploy pending migrations to staging."
read -rp "Proceed? (y/N): " confirm
if [[ "$confirm" != [yY] ]]; then
  echo "Aborted."
  exit 0
fi

echo "Deploying migrations..."
bunx prisma migrate deploy --schema="$SCHEMA"

echo ""
echo "=== Staging migration complete ==="
#!/usr/bin/env bash
# Usage: ./scripts/migrate-production.sh [--dry-run]
# Requires: DATABASE_URL in .env.production or passed as first argument
#
# Make executable: chmod +x scripts/migrate-production.sh
#
# --dry-run: Shows pending migrations without applying them

set -euo pipefail

ENV_FILE=".env.production"
DRY_RUN=false

# Parse arguments
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ -n "${1:-}" ]]; then
  export DATABASE_URL="$1"
fi

# ─── Check required tools ───────────────────────────────────
command -v bun >/dev/null 2>&1 || { echo "Error: bun is required but not installed."; exit 1; }

# ─── Resolve DATABASE_URL ───────────────────────────────────
if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  export DATABASE_URL="$(rg '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set. Pass it as an argument or add it to $ENV_FILE"
  exit 1
fi

echo "=== Production Migration Deploy ==="
echo ""

# ─── Safety checks ──────────────────────────────────────────

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  BRANCH="$(git branch --show-current 2>/dev/null || echo 'detached')"
  if [[ "$BRANCH" == "main" ]]; then
    echo "WARNING: You are on the 'main' branch."
    echo "Consider deploying from a tagged release instead."
    echo ""
  fi
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git diff --quiet 2>/dev/null; then
    echo "WARNING: You have uncommitted changes in your working directory."
    echo ""
  fi
fi

# Step 1: Validate schema
echo "[1/5] Validating schema..."
bunx prisma validate
echo "  Schema is valid."

# Step 2: Generate Prisma client
echo "[2/5] Generating Prisma client..."
bunx prisma generate
echo "  Client generated."

# Step 3: Show migration status
echo "[3/5] Checking migration status..."
bunx prisma migrate status || true
echo ""

# Step 4: Dry-run check
if $DRY_RUN; then
  echo "[4/5] Dry-run mode — skipping confirmation and deploy."
  echo "[5/5] No migrations were applied (dry-run)."
  echo ""
  echo "=== Dry-run complete ==="
  exit 0
fi

# Step 4: Double confirmation for production
echo "[4/5] PRODUCTION SAFETY CHECK"
echo "  You are about to deploy migrations to PRODUCTION."
echo "  This action cannot be undone."
echo ""
read -rp "Type 'production' to confirm: " confirm
if [[ "$confirm" != "production" ]]; then
  echo "Aborted. Confirmation did not match."
  exit 0
fi

echo ""

# Step 5: Deploy
echo "[5/5] Deploying migrations to production..."
bunx prisma migrate deploy

echo ""
echo "=== Production migration complete ==="
#!/usr/bin/env bun
// =============================================================================
// Pre-Migration Check Script
// Run: bun run scripts/pre-migration-check.ts
//
// Validates that the project is ready for the first PostgreSQL migration.
// ALL checks must pass before running `prisma migrate dev`.
// =============================================================================

import { readFileSync, existsSync, readdirSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { exit } from "node:process";

// ─── Configuration ──────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, "..");

const REQUIRED_TABLES = [
  "brands",
  "users",
  "user_sessions",
  "user_addresses",
  "branches",
  "delivery_zones",
  "categories",
  "products",
  "product_option_groups",
  "product_options",
  "favorite_products",
  "carts",
  "cart_items",
  "orders",
  "order_items",
  "payments",
  "promotions",
  "loyalty_accounts",
  "loyalty_transactions",
  "reviews",
  "feedbacks",
  "campaigns",
  "campaign_messages",
  "couriers",
  "delivery_assignments",
  "menu_translations",
  "brand_settings",
];

const REQUIRED_ENUMS = [
  "OrderType",
  "OrderStatus",
  "PaymentStatus",
  "PaymentMethod",
  "PromotionType",
  "PromotionStatus",
  "LoyaltyTransactionType",
  "FeedbackType",
  "FeedbackStatus",
  "CampaignType",
  "CampaignStatus",
];

const BRAND_INDEX_MODELS = [
  "Product",
  "Order",
  "Promotion",
  "Review",
  "Feedback",
  "Campaign",
  "Courier",
  "User",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

interface CheckResult {
  label: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function pass(label: string, detail?: string) {
  results.push({ label, passed: true, detail });
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail: string) {
  results.push({ label, passed: false, detail });
  console.log(`  ❌ ${label} — ${detail}`);
}

/**
 * Extract the body of each `model Foo { ... }` block as a map of model name → body string.
 */
function parseModelBodies(schema: string): Map<string, string> {
  const bodies = new Map<string, string>();
  const modelRegex = /model\s+(\w+)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const start = match.index + match[0].length;
    let depth = 1;
    let pos = start;
    while (pos < schema.length && depth > 0) {
      if (schema[pos] === "{") depth++;
      else if (schema[pos] === "}") depth--;
      pos++;
    }
    bodies.set(modelName, schema.slice(start, pos - 1));
  }

  return bodies;
}

/**
 * Collect all table names from `@@map("...")` directives.
 */
function collectMappedTables(schema: string): Set<string> {
  const tables = new Set<string>();
  const mapRegex = /@@map\("(\w+)"\)/g;
  let match: RegExpExecArray | null;
  while ((match = mapRegex.exec(schema)) !== null) {
    tables.add(match[1]);
  }
  return tables;
}

/**
 * Collect all enum names from `enum Foo {` declarations.
 */
function collectEnums(schema: string): Set<string> {
  const enums = new Set<string>();
  const enumRegex = /^enum\s+(\w+)\s*\{/gm;
  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(schema)) !== null) {
    enums.add(match[1]);
  }
  return enums;
}

/**
 * For a given model body, check whether it contains `@@index([brandId])`.
 */
function hasBrandIndex(modelBody: string): boolean {
  return /@@index\(\[brandId\]\)/.test(modelBody);
}

// ─── Env helper ───────────────────────────────────────────────────────────
// Prisma WASM config parser may fail to read DATABASE_URL from .env in some
// environments (Bun sandbox).  We read .env manually and inject it so that
// schema-only checks (validate, generate) always succeed even without a
// running PostgreSQL instance.

function loadDotEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

const dotEnvVars = loadDotEnv(join(ROOT, ".env"));
const envPath = join(ROOT, ".env");
const envBackup = join(ROOT, ".env.__pre_migration_backup__");

/** Spawn prisma with DATABASE_URL injected directly.
 *  Prisma WASM config can fail to parse .env in some Bun environments,
 *  so we temporarily hide .env and pass the URL via process.env. */
function prismaCmd(args: string[]) {
  let hid = false;
  if (existsSync(envPath)) {
    renameSync(envPath, envBackup);
    hid = true;
  }
  try {
    return Bun.spawnSync(["bunx", "prisma", ...args], {
      cwd: ROOT,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        DATABASE_URL: dotEnvVars.DATABASE_URL || process.env.DATABASE_URL || "",
      },
    });
  } finally {
    if (hid && existsSync(envBackup)) {
      renameSync(envBackup, envPath);
    }
  }
}

// ─── Checks ─────────────────────────────────────────────────────────────────

console.log("\n🔍 Pre-Migration Checklist\n");

// 1. Schema validation via `prisma validate`
{
  const label = "Schema validation (prisma validate)";
  const proc = prismaCmd(["validate"]);
  const stdout = new TextDecoder().decode(proc.stdout).trim();
  if (proc.exitCode === 0 && stdout.includes("is valid")) {
    pass(label);
  } else {
    const stderr = new TextDecoder().decode(proc.stderr).trim();
    fail(label, stderr || stdout || `exit code ${proc.exitCode}`);
  }
}

// 2. Prisma client generation via `prisma generate`
{
  const label = "Prisma client generation (prisma generate)";
  const proc = prismaCmd(["generate"]);
  if (proc.exitCode === 0) {
    pass(label);
  } else {
    const stderr = new TextDecoder().decode(proc.stderr).trim();
    fail(label, stderr || `exit code ${proc.exitCode}`);
  }
}

// 3. No SQLite provider in canonical schema
{
  const label = 'Schema uses provider = "postgresql"';
  const schemaPath = join(ROOT, "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");
  if (/provider\s*=\s*"postgresql"/.test(schema)) {
    pass(label);
  } else if (/provider\s*=\s*"sqlite"/.test(schema)) {
    fail(label, 'Schema still uses provider = "sqlite"');
  } else {
    fail(label, 'Could not find provider = "postgresql" in datasource');
  }
}

// 4. No schema.postgresql.prisma file exists
{
  const label = "No schema.postgresql.prisma file exists";
  const legacyPath = join(ROOT, "prisma", "schema.postgresql.prisma");
  if (!existsSync(legacyPath)) {
    pass(label);
  } else {
    fail(label, "File still exists at prisma/schema.postgresql.prisma — delete it");
  }
}

// 5. migration_lock.toml matches provider
{
  const label = "migration_lock.toml matches provider";
  const migrationsDir = join(ROOT, "prisma", "migrations");

  if (!existsSync(migrationsDir)) {
    pass(label, "No migrations directory yet (expected before first migration)");
  } else {
    const lockPath = join(migrationsDir, "migration_lock.toml");
    if (!existsSync(lockPath)) {
      pass(label, "migration_lock.toml does not exist yet");
    } else {
      const lockContent = readFileSync(lockPath, "utf-8");
      if (/provider\s*=\s*"postgresql"/.test(lockContent)) {
        pass(label);
      } else {
        fail(label, 'lock file does not say provider = "postgresql"');
      }
    }
  }
}

// 6. seed.ts uses plain objects for Json fields (no JSON.stringify)
{
  const label = "seed.ts has no JSON.stringify calls";
  const seedPath = join(ROOT, "prisma", "seed.ts");
  const seed = readFileSync(seedPath, "utf-8");
  if (!/JSON\.stringify/.test(seed)) {
    pass(label);
  } else {
    fail(label, "Found JSON.stringify — use plain objects for PG Json type instead");
  }
}

// 7. No old SQLite migration files
{
  const label = "No SQLite-specific migration SQL files";
  const migrationsDir = join(ROOT, "prisma", "migrations");

  if (!existsSync(migrationsDir)) {
    pass(label, "No migrations directory yet");
  } else {
    // Recursively find all .sql files
    const sqlitePatterns = [
      /\bDATETIME\b/gi,
      /\bINTEGER\s+PRIMARY\s+KEY\s+[^"']/gi, // TEXT PK without quotes
      /\bAUTOINCREMENT\b/gi,
      /\bWITHOUT\s+ROWID\b/gi,
    ];

    function walkSqlFiles(dir: string): string[] {
      const files: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...walkSqlFiles(full));
        } else if (entry.name.endsWith(".sql")) {
          files.push(full);
        }
      }
      return files;
    }

    const sqlFiles = walkSqlFiles(migrationsDir);
    if (sqlFiles.length === 0) {
      pass(label, "No .sql files found");
    } else {
      let foundIssue = false;
      for (const file of sqlFiles) {
        const content = readFileSync(file, "utf-8");
        for (const pattern of sqlitePatterns) {
          if (pattern.test(content)) {
            fail(label, `SQLite syntax found in ${file}`);
            foundIssue = true;
            break;
          }
        }
        if (foundIssue) break;
      }
      if (!foundIssue) {
        pass(label);
      }
    }
  }
}

// 8. Dockerfile has no --schema flag pointing to old file
{
  const label = "Dockerfile has no --schema flag for old schema file";
  const dockerfile = join(ROOT, "Dockerfile");
  const content = readFileSync(dockerfile, "utf-8");
  if (!/--schema=prisma\/schema\.postgresql\.prisma/.test(content)) {
    pass(label);
  } else {
    fail(label, 'Found --schema=prisma/schema.postgresql.prisma in Dockerfile');
  }
}

// 9. Scripts have no --schema flag pointing to old file
{
  const label = "Shell scripts have no --schema flag for old schema file";
  const scriptsDir = join(ROOT, "scripts");

  let foundIssue = false;
  if (existsSync(scriptsDir)) {
    for (const entry of readdirSync(scriptsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".sh")) {
        const content = readFileSync(join(scriptsDir, entry.name), "utf-8");
        if (/--schema=prisma\/schema\.postgresql\.prisma/.test(content)) {
          fail(label, `Found --schema flag in scripts/${entry.name}`);
          foundIssue = true;
          break;
        }
      }
    }
  }
  if (!foundIssue) {
    pass(label);
  }
}

// 10. All required tables are defined in schema
{
  const label = "All tables defined in schema";
  const schemaPath = join(ROOT, "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");
  const mappedTables = collectMappedTables(schema);

  const missing = REQUIRED_TABLES.filter((t) => !mappedTables.has(t));
  if (missing.length === 0) {
    pass(label, `${REQUIRED_TABLES.length} tables found`);
  } else {
    fail(label, `Missing tables: ${missing.join(", ")}`);
  }
}

// 11. All required enums are defined
{
  const label = "All enums defined in schema";
  const schemaPath = join(ROOT, "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");
  const foundEnums = collectEnums(schema);

  const missing = REQUIRED_ENUMS.filter((e) => !foundEnums.has(e));
  if (missing.length === 0) {
    pass(label, `${REQUIRED_ENUMS.length} enums found`);
  } else {
    fail(label, `Missing enums: ${missing.join(", ")}`);
  }
}

// 12. Performance indexes present (@@index([brandId]))
{
  const label = 'Performance @@index([brandId]) on key models';
  const schemaPath = join(ROOT, "prisma", "schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");
  const modelBodies = parseModelBodies(schema);

  const missing = BRAND_INDEX_MODELS.filter((model) => {
    const body = modelBodies.get(model);
    return !body || !hasBrandIndex(body);
  });

  if (missing.length === 0) {
    pass(label, `${BRAND_INDEX_MODELS.length} models indexed`);
  } else {
    fail(label, `Missing @@index([brandId]) on: ${missing.join(", ")}`);
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log("\n" + "─".repeat(50));
console.log(`  Total checks: ${total}`);
console.log(`  Passed:       ${passed}`);
console.log(`  Failed:       ${failed}`);
console.log("─".repeat(50) + "\n");

if (failed > 0) {
  console.log("⚠️  Some checks failed. Fix the issues above before running the first migration.\n");
  exit(1);
}

console.log("🚀 All checks passed! Ready for the first migration.\n");
exit(0);
#!/usr/bin/env bun
/**
 * SushiChain — SQLite Database Backup / Restore Utility
 *
 * Usage:
 *   bun run scripts/backup-db.ts                # create a gzipped backup
 *   bun run scripts/backup-db.ts --list         # list available backups
 *   bun run scripts/backup-db.ts --restore <file>  # restore from a backup
 *   bun run scripts/backup-db.ts --keep 10      # keep only last 10 backups
 */

import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import { createGunzip, createGzip } from "node:zlib";
import { createReadStream, createWriteStream, pipeline } from "node:stream";
import { promisify } from "node:util";

const pipelineAsync = promisify(pipeline);

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const ENV_PATH = join(PROJECT_ROOT, ".env");
const DEFAULT_KEEP = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function loadEnv(): Promise<Record<string, string>> {
  if (!existsSync(ENV_PATH)) {
    console.error(`Error: .env file not found at ${ENV_PATH}`);
    process.exit(1);
  }
  const text = await Bun.file(ENV_PATH).text();
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

function parseDbPath(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) {
    console.error(
      `Error: DATABASE_URL must use the "file:" protocol for SQLite backups.\n` +
        `  Got: ${databaseUrl}`
    );
    process.exit(1);
  }
  let dbPath = databaseUrl.slice(5); // remove "file:"
  if (!dbPath.startsWith("/")) {
    dbPath = resolve(PROJECT_ROOT, dbPath);
  }
  return dbPath;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timestamp(): string {
  const d = new Date();
  // ISO-like but with dashes instead of colons for filesystem safety
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function getBackupDir(dbPath: string): string {
  return join(dirname(dbPath), "backups");
}

function getBackupFileName(dbPath: string): string {
  const dbName = basename(dbPath, ".db");
  return `${dbName}-${timestamp()}.db.gz`;
}

// ─── Backup ─────────────────────────────────────────────────────────────────

async function createBackup(dbPath: string, keep: number): Promise<void> {
  if (!existsSync(dbPath)) {
    console.error(`Error: Database file not found at ${dbPath}`);
    process.exit(1);
  }

  const backupDir = getBackupDir(dbPath);
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }

  const backupFile = join(backupDir, getBackupFileName(dbPath));
  const originalSize = statSync(dbPath).size;

  // Use SQLite's backup API via a direct copy (safe for single-writer SQLite)
  // For production with concurrent writes, consider using the sqlite3 backup API
  console.log(`Backing up: ${dbPath}`);
  console.log(`  Original size: ${formatBytes(originalSize)}`);

  await pipelineAsync(
    createReadStream(dbPath),
    createGzip(),
    createWriteStream(backupFile)
  );

  const compressedSize = statSync(backupFile).size;
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(`  Compressed size: ${formatBytes(compressedSize)} (${ratio}% reduction)`);
  console.log(`  Saved: ${backupFile}`);

  // Rotate old backups
  rotateBackups(backupDir, keep);
}

function rotateBackups(backupDir: string, keep: number): void {
  const files = readdirSync(backupDir)
    .filter((f) => f.endsWith(".db.gz"))
    .sort()
    .reverse(); // newest first

  if (files.length <= keep) return;

  const toRemove = files.slice(keep);
  for (const file of toRemove) {
    const fullPath = join(backupDir, file);
    unlinkSync(fullPath);
    console.log(`  Removed old backup: ${file}`);
  }

  if (toRemove.length > 0) {
    console.log(`  Rotation: removed ${toRemove.length} old backup(s), keeping ${keep}`);
  }
}

// ─── List ───────────────────────────────────────────────────────────────────

function listBackups(dbPath: string): void {
  const backupDir = getBackupDir(dbPath);

  if (!existsSync(backupDir)) {
    console.log("No backups directory found. Run a backup first.");
    return;
  }

  const files = readdirSync(backupDir)
    .filter((f) => f.endsWith(".db.gz"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No backups found.");
    return;
  }

  console.log(`\nAvailable backups (${files.length}):\n`);
  console.log("  #   File                                  Size        Date");
  console.log("  ─── ──────────────────────────────────── ─────────── ────────────────────");

  let totalSize = 0;
  for (let i = 0; i < files.length; i++) {
    const fullPath = join(backupDir, files[i]);
    const stat = statSync(fullPath);
    totalSize += stat.size;
    const date = stat.mtime.toISOString().replace("T", " ").slice(0, 19);
    console.log(`  ${String(i + 1).padStart(3)} ${files[i].padEnd(37)} ${formatBytes(stat.size).padStart(10)}  ${date}`);
  }

  console.log(`\n  Total: ${files.length} backups, ${formatBytes(totalSize)}\n`);
}

// ─── Restore ────────────────────────────────────────────────────────────────

async function restoreBackup(backupFilePath: string, dbPath: string): Promise<void> {
  const resolvedPath = resolve(backupFilePath);

  if (!existsSync(resolvedPath)) {
    console.error(`Error: Backup file not found: ${resolvedPath}`);
    process.exit(1);
  }

  if (!resolvedPath.endsWith(".db.gz")) {
    console.error('Error: Backup file must have a ".db.gz" extension.');
    process.exit(1);
  }

  if (!existsSync(dbPath)) {
    console.error(`Error: Target database file not found at ${dbPath}`);
    process.exit(1);
  }

  const backupStat = statSync(resolvedPath);
  console.log(`Restoring from: ${resolvedPath}`);
  console.log(`  Backup size: ${formatBytes(backupStat.size)}`);
  console.log(`  Target: ${dbPath}`);

  // Create a pre-restore backup for safety
  const backupDir = getBackupDir(dbPath);
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const safetyBackup = join(backupDir, `${basename(dbPath, ".db")}-pre-restore-${timestamp()}.db.gz`);
  console.log(`\n  Creating safety backup: ${safetyBackup}`);

  await pipelineAsync(
    createReadStream(dbPath),
    createGzip(),
    createWriteStream(safetyBackup)
  );

  console.log(`  Safety backup created: ${formatBytes(statSync(safetyBackup).size)}`);

  // Restore by overwriting the database file
  // First decompress to a temp file, then replace
  const tempPath = dbPath + ".tmp";

  await pipelineAsync(
    createReadStream(resolvedPath),
    createGunzip(),
    createWriteStream(tempPath)
  );

  // Replace the original database with the restored one
  renameSync(dbPath, dbPath + ".pre-restore");
  renameSync(tempPath, dbPath);

  const restoredSize = statSync(dbPath).size;
  console.log(`\n  Restored database size: ${formatBytes(restoredSize)}`);
  console.log(`  Previous database saved as: ${dbPath}.pre-restore`);
  console.log(`\n  Restore complete!`);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const env = await loadEnv();

  const databaseUrl = env["DATABASE_URL"];
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL not found in .env file.');
    process.exit(1);
  }

  const dbPath = parseDbPath(databaseUrl);

  // Parse --keep N
  let keep = DEFAULT_KEEP;
  const keepIndex = args.indexOf("--keep");
  if (keepIndex !== -1 && args[keepIndex + 1]) {
    keep = parseInt(args[keepIndex + 1], 10);
    if (isNaN(keep) || keep < 1) {
      console.error("Error: --keep must be a positive integer.");
      process.exit(1);
    }
  }

  // Parse flags
  if (args.includes("--list")) {
    listBackups(dbPath);
    return;
  }

  const restoreIndex = args.indexOf("--restore");
  if (restoreIndex !== -1) {
    const backupFile = args[restoreIndex + 1];
    if (!backupFile) {
      console.error("Error: --restore requires a backup file path.");
      console.error('  Usage: bun run scripts/backup-db.ts --restore db/backups/custom-2024-01-15T10-30-00.db.gz');
      process.exit(1);
    }
    await restoreBackup(backupFile, dbPath);
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
SushiChain — SQLite Database Backup Utility

Usage:
  bun run scripts/backup-db.ts                Create a gzipped backup
  bun run scripts/backup-db.ts --list         List available backups
  bun run scripts/backup-db.ts --restore <file>  Restore from a backup file
  bun run scripts/backup-db.ts --keep <N>      Keep only the last N backups (default: ${DEFAULT_KEEP})
  bun run scripts/backup-db.ts --help          Show this help message

Database: ${dbPath}
Backups:  ${getBackupDir(dbPath)}
`);
    return;
  }

  // Default: create backup
  console.log("SushiChain DB Backup");
  console.log("====================\n");
  await createBackup(dbPath, keep);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
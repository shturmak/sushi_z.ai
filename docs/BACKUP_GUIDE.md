# Database Backup Guide

## How Backups Work

The backup utility (`scripts/backup-db.ts`) creates **gzip-compressed copies** of the SQLite database file. It reads the database path from `DATABASE_URL` in `.env` (parses the `file:` protocol), creates a timestamped `.db.gz` file in `db/backups/`, and automatically rotates old backups (default: keep last 30).

The script is self-contained with no external dependencies — it uses Bun's file API and Node.js built-in `zlib` for compression.

## Manual Backup

```bash
# Create a backup
bun run db:backup

# Create a backup keeping only the last 10
bun run db:backup -- --keep 10

# List all available backups
bun run db:backup:list

# Show help
bun run scripts/backup-db.ts --help
```

### Backup File Naming

Files are stored in `db/backups/` with the pattern:

```
custom-2025-01-15T10-30-00.db.gz
```

The name is derived from the database filename + ISO timestamp (colons replaced with dashes for filesystem compatibility).

## Restore

```bash
# List backups first to find the right one
bun run db:backup:list

# Restore from a specific backup
bun run db:restore -- db/backups/custom-2025-01-15T10-30-00.db.gz
```

**Safety measures during restore:**

1. A **safety backup** of the current database is automatically created before overwriting (named `custom-pre-restore-<timestamp>.db.gz`)
2. The previous database is saved as `db/custom.db.pre-restore` alongside the restored file

## Automated Backups (Cron)

### Daily backup at 3:00 AM

Add this to your crontab (`crontab -e`):

```cron
0 3 * * * cd /home/z/my-project && bun run db:backup >> /home/z/my-project/db/backup-cron.log 2>&1
```

### Every 6 hours, keep last 7

```cron
0 */6 * * * cd /home/z/my-project && bun run scripts/backup-db.ts --keep 7 >> /home/z/my-project/db/backup-cron.log 2>&1
```

### Hourly during business hours

```cron
0 9-21 * * * cd /home/z/my-project && bun run db:backup >> /home/z/my-project/db/backup-cron.log 2>&1
```

## PostgreSQL Migration Note

When migrating from SQLite to PostgreSQL, replace this backup approach with native PostgreSQL tools:

- **Backup:** `pg_dump -Fc -f backup.dump $DATABASE_URL`
- **Restore:** `pg_restore -d $DATABASE_URL backup.dump`
- **Automated:** Use `pg_dump` with cron, or PostgreSQL's continuous WAL archiving for point-in-time recovery

The `pg_dump`/`pg_restore` approach handles schema, data, indexes, and sequences in a single consistent snapshot.
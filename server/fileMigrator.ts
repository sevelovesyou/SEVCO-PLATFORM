import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { pool } from "./db";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS __file_migrations (
      name TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
  return entries
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

// Stable 64-bit key for pg_advisory_lock — derived from a fixed string so all
// app instances pick the same lock and serialize their migration runs.
const MIGRATION_LOCK_KEY = 884509173;

export async function runFileMigrations(): Promise<void> {
  await ensureTrackingTable();
  const files = await listMigrationFiles();
  if (files.length === 0) {
    console.log("[file-migrations] no migration files found");
    return;
  }

  // Hold a session-level Postgres advisory lock for the duration of the run
  // so concurrent app startups can't race to apply the same migration.
  const lockClient = await pool.connect();
  try {
    await lockClient.query(`SELECT pg_advisory_lock($1)`, [MIGRATION_LOCK_KEY]);

    const appliedRes = await lockClient.query<{ name: string }>(
      `SELECT name FROM __file_migrations`,
    );
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    let ranCount = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = await readFile(fullPath, "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");

      try {
        await lockClient.query("BEGIN");
        await lockClient.query(sql);
        await lockClient.query(
          `INSERT INTO __file_migrations (name, hash) VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
          [file, hash],
        );
        await lockClient.query("COMMIT");
        console.log(`[file-migrations] applied ${file}`);
        ranCount++;
      } catch (err) {
        await lockClient.query("ROLLBACK").catch(() => {});
        console.error(`[file-migrations] failed to apply ${file}:`, err);
        throw err;
      }
    }

    if (ranCount === 0) {
      console.log(
        `[file-migrations] all ${files.length} migration(s) already applied`,
      );
    } else {
      console.log(
        `[file-migrations] applied ${ranCount} new migration(s) (${files.length} total)`,
      );
    }
  } finally {
    try {
      await lockClient.query(`SELECT pg_advisory_unlock($1)`, [
        MIGRATION_LOCK_KEY,
      ]);
    } catch {
      // ignore — releasing on a broken connection is fine
    }
    lockClient.release();
  }
}

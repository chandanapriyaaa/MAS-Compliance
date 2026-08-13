/**
 * Apply SQL migrations in supabase/migrations/ against DATABASE_URL, in order.
 *
 *   npm run db:migrate
 *
 * Migrations are written to be idempotent (IF NOT EXISTS / OR REPLACE), so this
 * is safe to re-run. Uses a single connection and runs each file in one batch.
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

loadEnvLocal();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.local).");

  const dir = resolve(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`Connected. Applying ${files.length} migration(s)…`);

  try {
    for (const f of files) {
      const sql = readFileSync(resolve(dir, f), "utf-8");
      process.stdout.write(`  • ${f} … `);
      await client.query(sql);
      console.log("ok");
    }
    console.log("Done.");
  } finally {
    await client.end();
  }
}

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message ?? err);
  process.exit(1);
});

/**
 * Applique les migrations Prisma (prisma/migrations/<nom>/migration.sql) sur une base Turso/libSQL.
 * Prisma 6 ne sait pas migrer libSQL directement : on rejoue les mêmes fichiers SQL, une seule fois chacun.
 * Sans TURSO_DATABASE_URL (build local), le script ne fait rien.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.log("TURSO_DATABASE_URL absent : migrations Turso ignorées.");
  process.exit(0);
}

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await db.execute("CREATE TABLE IF NOT EXISTS _turso_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
const done = new Set((await db.execute("SELECT name FROM _turso_migrations")).rows.map((r) => String(r.name)));

const dir = path.resolve("prisma/migrations");
const pending = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !done.has(d.name))
  .map((d) => d.name)
  .sort();

for (const name of pending) {
  const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  // PRAGMA foreign_keys est sans effet dans une transaction : on le coupe avant, comme le fait Prisma,
  // sinon la reconstruction d'une table (DROP TABLE) déclencherait les suppressions en cascade.
  // La migration et son enregistrement restent atomiques.
  await db.executeMultiple(
    `PRAGMA foreign_keys=OFF;\nBEGIN;\n${sql}\nINSERT INTO _turso_migrations (name, applied_at) VALUES ('${name.replace(/'/g, "''")}', datetime('now'));\nCOMMIT;\nPRAGMA foreign_keys=ON;`,
  );
  console.log(`✔ ${name}`);
}
console.log(pending.length ? `${pending.length} migration(s) appliquée(s).` : "Base Turso à jour.");
db.close();

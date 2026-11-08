import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/** Base SQLite dédiée aux tests (data/test.db), recréée à chaque exécution — jamais la base de dev. */
export default function setup() {
  const db = path.resolve(__dirname, "../../data/test.db");
  for (const f of [db, `${db}-journal`, `${db}-wal`, `${db}-shm`])
    rmSync(f, { force: true });
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: "file:../data/test.db" },
  });
}

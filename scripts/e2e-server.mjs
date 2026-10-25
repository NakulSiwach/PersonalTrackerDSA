// Test server for `npm run test:e2e`: starts a throwaway local Postgres (embedded-postgres),
// applies the migrations, then runs `next start`. Your real Neon database is never touched.
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.PORT ?? 3200);
const PG_PORT = 5433;
const url = `postgresql://postgres:password@localhost:${PG_PORT}/e2e`;
const dataDir = path.resolve(".pg-e2e");

rmSync(dataDir, { recursive: true, force: true });
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "password", port: PG_PORT, persistent: false });
await pg.initialise();
await pg.start();
await pg.createDatabase("e2e");

const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
execSync("npx prisma migrate deploy", { stdio: "inherit", env });

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "inherit", env, shell: true });
const shutdown = async () => {
  server.kill();
  await pg.stop().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", shutdown);

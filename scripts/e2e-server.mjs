// Test server for `npm run test:e2e`: starts a throwaway local Postgres (embedded-postgres),
// applies the migrations, then runs `next start`. Your real Neon database is never touched.
import { execSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.PORT ?? 3200);
const PG_PORT = 5433;
const url = `postgresql://postgres:password@localhost:${PG_PORT}/e2e`;
const dataDir = path.resolve(".pg-e2e");

// A previous run that was killed abruptly can leave its Postgres running; stop it first.
const plat = { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform];
const pgDir = path.resolve("node_modules/@embedded-postgres", `${plat}-${process.arch}`);
const pgCtl = path.join(pgDir, "native/bin", process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl");
if (existsSync(path.join(dataDir, "postmaster.pid")) && existsSync(pgCtl)) {
  try {
    execSync(`"${pgCtl}" stop -D "${dataDir}" -m immediate`, { stdio: "ignore" });
  } catch {
    /* already stopped */
  }
}
if (process.platform === "win32") {
  // Orphaned child processes of that Postgres can keep holding the port on Windows. Only
  // processes running this project's embedded-postgres binary are stopped.
  // Command lines may use / or \, so every path separator is a ? wildcard.
  const match = pgDir.replace(/'/g, "''").replace(/[\\/]/g, "?");
  try {
    execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='postgres.exe'\\" | Where-Object { $_.CommandLine -like '*${match}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`,
      { stdio: "ignore" },
    );
  } catch {
    /* nothing to stop */
  }
}
rmSync(dataDir, { recursive: true, force: true });
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "password", port: PG_PORT, persistent: false });
await pg.initialise();
await pg.start();
await pg.createDatabase("e2e");

const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, NEXT_DIST_DIR: ".next-e2e" };
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

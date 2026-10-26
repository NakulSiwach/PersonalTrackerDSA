import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Playwright force-kills the web server on Windows, so scripts/e2e-server.mjs never gets to stop
 * its throwaway Postgres. Stop it here, after the tests.
 */
export default function globalTeardown() {
  const dataDir = path.resolve(".pg-e2e");
  const plat = { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform as string];
  const pgDir = path.resolve("node_modules/@embedded-postgres", `${plat}-${process.arch}`);
  const pgCtl = path.join(pgDir, "native/bin", process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl");
  if (existsSync(path.join(dataDir, "postmaster.pid")) && existsSync(pgCtl)) {
    try {
      execSync(`"${pgCtl}" stop -D "${dataDir}" -m fast`, { stdio: "ignore", timeout: 30_000 });
    } catch {
      /* already stopped */
    }
  }
  if (process.platform === "win32") {
    // Only this project's embedded-postgres processes; command lines may use / or \, so each
    // path separator becomes a ? wildcard.
    const match = pgDir.replace(/'/g, "''").replace(/[\\/]/g, "?");
    try {
      execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='postgres.exe'\\" | Where-Object { $_.CommandLine -like '*${match}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`,
        { stdio: "ignore" },
      );
    } catch {
      /* nothing left */
    }
  }
}

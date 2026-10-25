import { defineConfig } from "@playwright/test";

const PORT = 3200;
/** The throwaway Postgres started by scripts/e2e-server.mjs. */
export const E2E_DB_URL = "postgresql://postgres:password@localhost:5433/e2e";

// Runs the spec's §8 acceptance tests against `npm run build` output, with an isolated DB.
export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      AUTH_SECRET: "e2e-only-secret-that-is-at-least-32-characters-long",
      ALLOW_REGISTRATION: "true",
    },
  },
});

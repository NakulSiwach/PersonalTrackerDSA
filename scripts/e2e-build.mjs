// Production build for the e2e tests, written to .next-e2e so it doesn't clash with `npm run dev`.
import { execSync } from "node:child_process";
execSync("npx next build", { stdio: "inherit", env: { ...process.env, NEXT_DIST_DIR: ".next-e2e" } });

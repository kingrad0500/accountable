import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

// The end-to-end tests start their own backend (:8100) and frontend (:5174)
// against a test database, so `npm run dev` and your data are never touched.
// They use the installed Google Chrome. If it's missing, install Chrome, or run
// `npx playwright install chrome`.
const API_PORT = "8100";
const WEB_PORT = "5174";
// The speed checks run against a production build, served on its own port.
const PROD_PORT = "5176";
const TEST_DB = join(__dirname, "e2e", ".tmp", "accountable-e2e.db");
const TODAY = "2026-11-18";

const backendEnv = {
  ACCOUNTABLE_DB: TEST_DB,
  ACCOUNTABLE_TODAY: TODAY,
  ACCOUNTABLE_TEST: "1",
};

export default defineConfig({
  testDir: "e2e",
  // Tests share one database and reset it before each test, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chrome",
      testIgnore: /performance\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "performance",
      testMatch: /performance\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 900 },
        baseURL: `http://localhost:${PROD_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: `uv run python -m accountable.seed && uv run uvicorn accountable.main:app --port ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: backendEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run build:vite --workspace frontend && npm run preview --workspace frontend -- --port ${PROD_PORT} --strictPort`,
      url: `http://localhost:${PROD_PORT}`,
      env: { API_PORT },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev --workspace frontend",
      url: `http://localhost:${WEB_PORT}`,
      env: { WEB_PORT, API_PORT },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

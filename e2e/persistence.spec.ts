import { spawn, execSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test, expect } from "./fixtures";

// These tests run their own backend on :8101 against their own database, so they can
// stop and restart it. The browser's /api calls are routed to it.
const PORT = 8101;
const ROOT = resolve(__dirname, "..");
const PYTHON = join(ROOT, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");

let dir: string;
let env: NodeJS.ProcessEnv;
let server: ChildProcess | null = null;

async function start() {
  server = spawn(PYTHON, ["-m", "uvicorn", "accountable.main:app", "--port", String(PORT)], { cwd: ROOT, env, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("The test backend didn't start");
}

async function stop() {
  if (!server) return;
  const exited = new Promise((r) => server!.once("exit", r));
  server.kill();
  await exited;
  server = null;
}

test.beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "accountable-persist-"));
  env = { ...process.env, ACCOUNTABLE_DB: join(dir, "persist.db"), ACCOUNTABLE_TODAY: "2026-11-18" };
});

test.afterAll(async () => {
  await stop();
  rmSync(dir, { recursive: true, force: true });
});

test.beforeEach(async ({ page }) => {
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:${PORT}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
});

test("changes are still there after a restart and a reload (SC2, G4)", async ({ page }) => {
  await start(); // a new database: created and seeded on startup (G2)
  await page.goto("/organizations");
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();
  await page.getByRole("button", { name: "Add organization" }).first().click();
  await page.getByRole("dialog").getByLabel("Name").fill("Kept After Restart");
  await page.getByRole("dialog").getByRole("button", { name: "Add organization" }).click();
  await expect(page.getByText("Showing 16 of 16 organizations")).toBeVisible();

  await page.goto("/pipeline");
  await page.getByRole("button", { name: "Move Robotics telemetry to" }).click();
  await page.getByRole("menuitem", { name: "Won" }).click();
  await expect(page.getByTestId("column-won")).toContainText("Robotics telemetry");
  await page.waitForLoadState("networkidle");

  await stop();
  await start();
  await page.goto("/organizations");
  await expect(page.getByRole("link", { name: "Kept After Restart" })).toBeVisible();
  await page.goto("/pipeline");
  await expect(page.getByTestId("column-won")).toContainText("Robotics telemetry");
});

test("npm run seed brings back the sample data (SC2, G3)", async ({ page }) => {
  if (!server) await start();
  execSync("npm run seed", { cwd: ROOT, env, stdio: "ignore" });
  await page.goto("/organizations");
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();
  await expect(page.getByRole("link", { name: "Kept After Restart" })).toHaveCount(0);
  await page.goto("/pipeline");
  await expect(page.getByTestId("column-proposal")).toContainText("Robotics telemetry");
});

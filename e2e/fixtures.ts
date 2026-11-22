import { test as base, expect, type Page } from "@playwright/test";

export const API = "http://127.0.0.1:8100/api";
/** The test "today": the backend has ACCOUNTABLE_TODAY set to the same date. */
export const TODAY = new Date("2026-11-18T14:00:00");

type Fixtures = {
  /** Set to true in a test (test.use) to load the large dataset instead. */
  largeData: boolean;
};

/**
 * Every test starts from freshly seeded data, with the browser clock fixed on
 * TODAY, and fails on any console error or warning (G9).
 */
export const test = base.extend<Fixtures>({
  largeData: [false, { option: true }],
  page: async ({ page, request, largeData }, use) => {
    const reset = await request.post(`${API}/test/reset${largeData ? "?large=true" : ""}`, {
      timeout: 60_000,
    });
    expect(reset.ok()).toBeTruthy();
    await page.clock.install({ time: TODAY });

    const problems: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning")
        problems.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));

    await use(page);
    expect(problems, "the browser console should have no errors or warnings").toEqual([]);
  },
});

export { expect };

/** Reload and wait for the app to settle. */
export async function reload(page: Page) {
  await page.reload();
  await page.waitForLoadState("networkidle");
}

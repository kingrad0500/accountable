import { test, expect } from "./fixtures";

// On the large dataset (3,000 deals, 3,000 contacts, 10,000 activities), against a
// production build: each screen loads in under a second, sorts and drags answer in
// under 500 ms, and tables render only the rows in view (SC9, G7).
test.use({ largeData: true });
test.describe.configure({ timeout: 90_000 });

const SCREENS: [string, string][] = [
  ["/", "kpi-revenue"],
  ["/pipeline", "deal-card"],
  ["/deals", "table-row"],
  ["/contacts", "table-row"],
  ["/organizations", "table-row"],
];

test("each screen loads in under a second", async ({ page }) => {
  await page.goto("/"); // warm up the browser cache for the app's files
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
  for (const [path, testId] of SCREENS) {
    const start = Date.now();
    await page.goto(path);
    await page.getByTestId(testId).first().waitFor();
    const ms = Date.now() - start;
    expect(ms, `${path} took ${ms} ms`).toBeLessThan(1000);
  }
});

test("table sorts answer in under 500 ms and scrolling stays virtualized", async ({ page }) => {
  for (const [path, header, noun] of [
    ["/deals", /Value/, "deals"],
    ["/contacts", /Organization/, "contacts"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByText(`Showing 3,000 of 3,000 ${noun}`)).toBeVisible();
    const button = page.getByRole("columnheader", { name: header }).getByRole("button");
    const start = Date.now();
    await button.click();
    await expect(page.getByRole("columnheader", { name: header })).not.toHaveAttribute("aria-sort", "none");
    const ms = Date.now() - start;
    expect(ms, `sorting ${noun} took ${ms} ms`).toBeLessThan(500);

    const table = page.getByRole("table");
    await table.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await expect(page.getByTestId("table-row").first()).toBeVisible();
    expect(await page.getByTestId("table-row").count()).toBeLessThan(60);
  }
});

test("a drag on the board with Closed deals set to All answers in under 500 ms", async ({ page }) => {
  await page.goto("/pipeline");
  await page.getByLabel("Closed deals:").selectOption("all");
  await expect(page.getByTestId("deal-card")).toHaveCount(300); // 50 per column, with "Show more"
  const card = page.getByTestId("column-new").getByTestId("deal-card").first();
  const name = await card.locator("a").textContent();
  const src = (await card.boundingBox())!;
  const dst = (await page.getByTestId("column-qualified").getByTestId("deal-card").nth(2).boundingBox())!;

  await page.mouse.move(src.x + 20, src.y + src.height / 2);
  await page.mouse.down();
  let start = Date.now();
  await page.mouse.move(src.x + 30, src.y + src.height / 2 + 10, { steps: 3 });
  expect(Date.now() - start, "picking up").toBeLessThan(500);
  start = Date.now();
  await page.mouse.move(dst.x + 40, dst.y + dst.height * 0.2, { steps: 5 });
  expect(Date.now() - start, "moving across").toBeLessThan(500);
  start = Date.now();
  await page.mouse.up();
  await expect(page.getByTestId("column-qualified")).toContainText(name!);
  expect(Date.now() - start, "dropping").toBeLessThan(500);
});

import { test, expect, reload } from "./fixtures";
import { card, columnEl, drag, names, openPipeline } from "./pipeline-helpers";

test.beforeEach(async ({ page }) => openPipeline(page));

test("drag a card to another column: stage and probability change (SC4)", async ({ page }) => {
  await drag(page, card(page, "Data warehouse build"), card(page, "Managed cloud contract"), "above");
  await expect.poll(() => names(page, "negotiation")).toContain("Data warehouse build");
  await expect(card(page, "Data warehouse build")).toContainText("75%");
  await expect(page.getByTestId("count-negotiation")).toHaveText("4 deals");
  await expect(page.getByTestId("count-proposal")).toHaveText("3 deals");

  await page.getByRole("link", { name: "Deals", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search deals" }).fill("Data warehouse");
  const row = page.getByTestId("table-row").first();
  await expect(row).toContainText("Negotiation");
  await expect(row).toContainText("75%");
});

test("a card dropped higher, lower or mid-column stays there after a reload (SC4)", async ({ page }) => {
  expect(await names(page, "new")).toEqual(["Customer portal discovery", "Fleet tracking dashboard", "Security review", "Inventory API pilot"]);

  // Lower in its own column
  await drag(page, card(page, "Customer portal discovery"), card(page, "Security review"), "below");
  await expect.poll(() => names(page, "new")).toEqual(["Fleet tracking dashboard", "Security review", "Customer portal discovery", "Inventory API pilot"]);

  // Higher in its own column
  await drag(page, card(page, "Inventory API pilot"), card(page, "Fleet tracking dashboard"), "above");
  await expect.poll(() => names(page, "new")).toEqual(["Inventory API pilot", "Fleet tracking dashboard", "Security review", "Customer portal discovery"]);

  // Into the middle of another column
  await drag(page, card(page, "Security review"), card(page, "Claims workflow automation"), "above");
  await expect.poll(() => names(page, "qualified")).toEqual(["ERP integration", "Security review", "Claims workflow automation", "Learning platform rollout", "Analytics retainer"]);

  await page.waitForLoadState("networkidle");
  await reload(page);
  expect(await names(page, "new")).toEqual(["Inventory API pilot", "Fleet tracking dashboard", "Customer portal discovery"]);
  expect(await names(page, "qualified")).toEqual(["ERP integration", "Security review", "Claims workflow automation", "Learning platform rollout", "Analytics retainer"]);
});

test("column and board totals change before the server replies (SC4)", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/deals/*/move", async (route) => {
    await held;
    await route.continue();
  });
  await expect(page.getByTestId("total-negotiation")).toHaveText("$185,500");
  await expect(page.getByTestId("board-expected")).toHaveText("$360,700");

  await drag(page, card(page, "Robotics telemetry"), columnEl(page, "negotiation"), "into");
  // The server hasn't answered yet.
  await expect(page.getByTestId("total-negotiation")).toHaveText("$240,500");
  await expect(page.getByTestId("total-proposal")).toHaveText("$251,500");
  await expect(page.getByTestId("board-expected")).toHaveText("$368,950");
  await expect(page.getByTestId("board-open-value")).toHaveText("$775,500");
  release();
  await page.waitForResponse("**/api/deals/*/move");
});

test("a refused move goes back and says why (P7)", async ({ page }) => {
  await page.route("**/api/deals/*/move", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "Deal not found" }) }),
  );
  // The browser logs failed requests; that's expected here.
  page.removeAllListeners("console");
  await drag(page, card(page, "Robotics telemetry"), columnEl(page, "negotiation"), "into");
  await expect(page.getByText("Robotics telemetry couldn't move to Negotiation. Deal not found")).toBeVisible();
  await expect.poll(() => names(page, "proposal")).toContain("Robotics telemetry");
  await expect(page.getByTestId("total-negotiation")).toHaveText("$185,500");
});

test("dragging to Won sets today's close date and the card stays in view", async ({ page }) => {
  await drag(page, card(page, "Managed cloud contract"), card(page, "Route planning module"), "above");
  await expect.poll(() => names(page, "won")).toContain("Managed cloud contract");
  await expect(card(page, "Managed cloud contract")).toContainText("18 Nov");
  await expect(card(page, "Managed cloud contract")).toContainText("$118k");
  await expect(page.getByTestId("board-open-count")).toHaveText("14");
  await reload(page);
  await expect(columnEl(page, "won")).toContainText("Managed cloud contract");
});

test("add a deal in a column: it starts at that stage, at the top (SC4, P4)", async ({ page }) => {
  await page.getByRole("button", { name: "Add deal to Qualified" }).click();
  const form = page.getByRole("group", { name: "New deal in Qualified" });
  await form.getByRole("button", { name: "Add to Qualified" }).click();
  await expect(form.getByText("Required")).toHaveCount(3);
  await form.getByLabel("Deal name").fill("Payroll integration");
  await form.getByLabel("Organization").selectOption({ label: "Tallow & Finch" });
  await form.getByLabel("Value (USD)").fill("36000");
  await form.getByLabel("Close date").fill("2027-02-20");
  await form.getByRole("button", { name: "Add to Qualified" }).click();
  await expect(form).toBeHidden();
  await expect.poll(async () => (await names(page, "qualified"))[0]).toBe("Payroll integration");
  await expect(card(page, "Payroll integration")).toContainText("25%");
  await expect(page.getByTestId("total-qualified")).toHaveText("$237,500");
});

test("More details opens the full form with what was typed", async ({ page }) => {
  await page.getByRole("button", { name: "Add deal to Proposal" }).click();
  const form = page.getByRole("group", { name: "New deal in Proposal" });
  await form.getByLabel("Deal name").fill("Big one");
  await form.getByRole("button", { name: "More details" }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await expect(dialog.getByLabel("Deal name")).toHaveValue("Big one");
  await expect(dialog.getByLabel("Stage")).toHaveValue("proposal");
  await expect(dialog.getByLabel("Probability of close (%)")).toHaveValue("50");
});

test("late cards stand out (SC4, DL2)", async ({ page }) => {
  const late = card(page, "Website rebuild");
  await expect(late.getByText("Late", { exact: true })).toBeVisible();
  const bg = await late.locator("> div > div").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(255, 243, 245)");
  await expect(card(page, "Data warehouse build").getByText("Late", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("board-late")).toHaveText("3");
});

test("the Closed deals filter changes Won and Lost and is remembered (P1a)", async ({ page }) => {
  const filter = page.getByLabel("Closed deals:");
  await expect(filter).toHaveValue("90");
  const won90 = (await names(page, "won")).length;
  await expect(columnEl(page, "won")).toContainText("more closed earlier");
  const openBefore = await page.getByTestId("board-open-value").textContent();

  await filter.selectOption("all");
  await expect.poll(async () => (await names(page, "won")).length).toBeGreaterThan(won90);
  await expect(columnEl(page, "won")).not.toContainText("more closed earlier");
  await expect(page.getByTestId("board-open-value")).toHaveText(openBefore!);

  await filter.selectOption("30");
  await expect.poll(async () => (await names(page, "won")).length).toBeLessThan(won90);
  await reload(page);
  await expect(page.getByLabel("Closed deals:")).toHaveValue("30");

  await columnEl(page, "won").getByRole("link", { name: "See in Deals" }).click();
  await expect(page).toHaveURL(/\/deals\?filter=won/);
  await expect(page.getByLabel("Show")).toHaveValue("won");
});

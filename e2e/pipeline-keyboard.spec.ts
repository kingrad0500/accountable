import { test, expect, reload } from "./fixtures";
import { card, names, openPipeline } from "./pipeline-helpers";

test.beforeEach(async ({ page }) => openPipeline(page));

test("move a card with Space and the arrow keys (P6)", async ({ page }) => {
  const c = card(page, "Customer portal discovery");
  await c.focus();
  await expect(c).toBeFocused();
  // A screen reader hears each step (P6).
  const live = page.locator('[id^="DndLiveRegion"]');
  await page.keyboard.press("Space");
  await expect(live).toHaveText("Picked up Customer portal discovery. New, position 1 of 4.");
  await page.keyboard.press("ArrowDown");
  await expect(live).toHaveText("Customer portal discovery is over New, position 2 of 4.");
  await page.keyboard.press("Space");
  await expect(live).toHaveText("Dropped Customer portal discovery in New.");
  await expect
    .poll(() => names(page, "new"))
    .toEqual([
      "Fleet tracking dashboard",
      "Customer portal discovery",
      "Security review",
      "Inventory API pilot",
    ]);

  // To the next column
  await card(page, "Customer portal discovery").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(live).toContainText("Customer portal discovery is over Qualified");
  await page.keyboard.press("Space");
  await expect.poll(() => names(page, "qualified")).toContain("Customer portal discovery");
  await expect(card(page, "Customer portal discovery")).toContainText("25%");

  // Escape cancels
  await card(page, "Security review").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(live).toContainText("Security review is over Qualified");
  await page.keyboard.press("Escape");
  await expect(live).toHaveText("Cancelled. Security review went back to New.");
  await expect.poll(() => names(page, "new")).toContain("Security review");

  await page.waitForLoadState("networkidle");
  await reload(page);
  expect(await names(page, "qualified")).toContain("Customer portal discovery");
});

test("move a card with the Move to menu (P6)", async ({ page }) => {
  const c = card(page, "Analytics retainer");
  await c.focus();
  await page.keyboard.press("Tab");
  const trigger = page.getByRole("button", { name: "Move Analytics retainer to" });
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText([
    "New",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost",
  ]);
  // Opening from the keyboard focuses the first stage; one step down is Proposal.
  await expect(menu.getByRole("menuitem", { name: "New" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Proposal" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await names(page, "proposal"))[0]).toBe("Analytics retainer");
  await expect(card(page, "Analytics retainer")).toContainText("50%");
});

test("Enter opens the deal, and focus is visible throughout (SC8)", async ({ page }) => {
  const c = card(page, "Security review");
  await c.focus();
  const outline = await c.evaluate(
    (el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth,
  );
  expect(outline).toBe("solid 2px");
  await page.keyboard.press("Tab");
  const trigger = page.getByRole("button", { name: "Move Security review to" });
  expect(await trigger.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/deals\/\d+$/);
});

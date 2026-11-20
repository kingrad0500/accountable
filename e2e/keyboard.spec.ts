import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

/** The focused element, or the wrapper that draws its ring, has a visible 2px outline (SC8). */
async function expectFocusVisible(page: Page) {
  const visible = await page.evaluate(() => {
    let el = document.activeElement as HTMLElement | null;
    for (let i = 0; el && i < 3; i++, el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) return true;
    }
    return false;
  });
  expect(visible, `focus ring on ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))}`).toBe(true);
}

async function tabTo(page: Page, name: RegExp | string, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement;
      return (el.getAttribute("aria-label") || el.labels?.[0]?.textContent || el.textContent || "").trim();
    });
    if (typeof name === "string" ? label === name : name.test(label)) {
      await expectFocusVisible(page);
      return;
    }
  }
  throw new Error(`Couldn't reach ${name} with Tab`);
}

test("every action works from the keyboard, with a visible focus (SC8)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();

  // Tabs
  await tabTo(page, "Organizations");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();

  // Add a record: top-bar button, form, Enter to save; focus returns.
  await tabTo(page, "Add organization");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByLabel("Name")).toBeFocused();
  await page.keyboard.type("Keyboard Co");
  await page.keyboard.press("Tab");
  await expectFocusVisible(page);
  await page.keyboard.type("keyboard.co");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("banner").getByRole("button", { name: "Add organization" })).toBeFocused();

  // Tables: search, sort, open a row.
  await tabTo(page, "Search organizations");
  await page.keyboard.type("keyboard");
  await expect(page.getByText("Showing 1 of 16 organizations")).toBeVisible();
  await tabTo(page, /^Name/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "descending");
  await tabTo(page, "Keyboard Co");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Keyboard Co" })).toBeVisible();

  // Add a contact from the record page, then open it.
  await tabTo(page, "Add contact");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Kim Keys");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeHidden();
  await tabTo(page, "Kim Keys");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Kim Keys" })).toBeVisible();

  // Timeline: log a call.
  await tabTo(page, "Note");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Call" })).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.type("Called from the keyboard");
  await tabTo(page, "Log activity");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("timeline-entry").first()).toContainText("Called from the keyboard");

  // Delete the contact: Cancel has focus, so Tab to Delete.
  await tabTo(page, "Delete");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Cancel" })).toBeFocused();
  await expectFocusVisible(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/contacts$/);

  // Follow-ups: mark one done on the dashboard with Space.
  await page.goto("/");
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
  await tabTo(page, /^Mark done: /);
  const label = await page.evaluate(() => document.activeElement!.getAttribute("aria-label"));
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox", { name: label! })).toHaveCount(0);

  // Quick search: "/" then type, arrows and Enter.
  await page.keyboard.press("/");
  await expectFocusVisible(page);
  await page.keyboard.type("lumen");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Lumen Retail" })).toBeVisible();
});

test("focus is visible on links, buttons, inputs, selects and cards (SC8)", async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByTestId("table-row").first()).toBeVisible();
  for (const target of [
    page.getByRole("link", { name: "Deals", exact: true }),
    page.getByRole("searchbox", { name: "Search deals" }),
    page.getByLabel("Show"),
    page.getByRole("main").getByRole("button", { name: "Add deal" }),
    page.getByRole("columnheader", { name: /Value/ }).getByRole("button"),
    page.getByTestId("table-row").first().getByRole("link").first(),
  ]) {
    await target.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expectFocusVisible(page);
  }
  await page.goto("/pipeline");
  await page.getByTestId("deal-card").first().focus();
  await expectFocusVisible(page);
});

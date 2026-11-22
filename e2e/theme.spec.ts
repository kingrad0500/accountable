import { test, expect, reload } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

// The resolved role colors (docs/spec.md, Colors).
const LIGHT_PAGE = "rgb(240, 244, 245)";
const DARK_PAGE = "rgb(4, 35, 46)";
const DARK_SURFACE = "rgb(0, 0, 0)";
const DARK_RAISED = "rgb(15, 54, 68)";

const html = (page: Page) => page.locator("html");
const background = (target: Locator) =>
  target.evaluate((el) => getComputedStyle(el).backgroundColor);
const toggle = (page: Page, mode: "dark" | "light") =>
  page.getByRole("banner").getByRole("button", { name: `Switch to ${mode} mode` });

async function openDashboard(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
}

test("dark mode switches straight away, survives a reload, and switches back (G11)", async ({
  page,
}) => {
  await openDashboard(page);
  await expect(html(page)).not.toHaveAttribute("data-theme");
  expect(await background(page.locator("body"))).toBe(LIGHT_PAGE);

  await toggle(page, "dark").click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  expect(await background(page.locator("body"))).toBe(DARK_PAGE);
  await expect(toggle(page, "light")).toBeVisible();

  await reload(page);
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(toggle(page, "light")).toBeVisible();
  expect(await background(page.locator("body"))).toBe(DARK_PAGE);

  await toggle(page, "light").click();
  await expect(html(page)).not.toHaveAttribute("data-theme");
  await reload(page);
  await expect(html(page)).not.toHaveAttribute("data-theme");
  expect(await background(page.locator("body"))).toBe(LIGHT_PAGE);
  await expect(toggle(page, "dark")).toBeVisible();
});

test("the stored mode is applied before the app runs, so a reload never flashes light (G11)", async ({
  page,
}) => {
  await openDashboard(page);
  await toggle(page, "dark").click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");

  // With the app's script answered by an empty one, only index.html's inline script runs.
  await page.route("**/src/main.tsx", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
  await page.reload();
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
});

test("every section and layer follows dark mode (G11)", async ({ page }) => {
  await openDashboard(page);
  await toggle(page, "dark").click();

  // A panel in the page content is a black well; the top bar above it is raised.
  const well = page.getByRole("main").locator(".panel").first();
  for (const path of ["/", "/pipeline", "/deals", "/contacts", "/organizations"]) {
    await page.goto(path);
    await expect(well).toBeVisible();
    expect(await background(page.getByRole("banner")), path).toBe(DARK_RAISED);
    expect(await background(well), path).toBe(DARK_SURFACE);
  }

  await page.getByTestId("table-row").first().getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await background(well)).toBe(DARK_SURFACE);

  await page.getByRole("combobox", { name: "Search deals, contacts and organizations" }).fill("an");
  const results = page.getByRole("listbox", { name: "Search results" });
  await expect(results).toBeVisible();
  expect(await background(results.locator(".."))).toBe(DARK_RAISED);
  await page.keyboard.press("Escape");

  await page.goto("/organizations");
  await page.getByRole("banner").getByRole("button", { name: "Add organization" }).click();
  const dialog = page.getByRole("dialog", { name: "Add organization" });
  expect(await background(dialog)).toBe(DARK_RAISED);
  await dialog.getByLabel("Name").fill("Night Shift Ltd");
  await dialog.getByRole("button", { name: "Add organization" }).click();
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Organization added" });
  await expect(toast).toBeVisible();
  expect(await background(toast)).toBe(DARK_RAISED);
});

test("the toggle works from the keyboard (G11, SC8)", async ({ page }) => {
  await openDashboard(page);
  await toggle(page, "dark").focus();
  await page.keyboard.press("Enter");
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(toggle(page, "light")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(html(page)).not.toHaveAttribute("data-theme");
});

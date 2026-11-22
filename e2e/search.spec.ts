import { test, expect } from "./fixtures";

const box = (page: import("@playwright/test").Page) =>
  page.getByRole("combobox", { name: "Search deals, contacts and organizations" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
});

test("quick search finds a deal, a contact and an organization (G10)", async ({ page }) => {
  await box(page).fill("kestrel");
  const results = page.getByRole("listbox", { name: "Search results" });
  await expect(
    results.getByRole("group", { name: "Organizations" }).getByRole("option"),
  ).toHaveText(/Kestrel Capital/);
  await results.getByRole("option", { name: /Kestrel Capital/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Kestrel Capital" })).toBeVisible();

  await box(page).fill("hana");
  await expect(page.getByRole("group", { name: "Contacts" }).getByRole("option")).toHaveText(
    /Hana Brooks/,
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Hana Brooks" })).toBeVisible();

  await box(page).fill("rebuild");
  await expect(page.getByRole("group", { name: "Deals" }).getByRole("option")).toHaveText(
    /Website rebuild/,
  );
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Website rebuild" })).toBeVisible();
});

test("results are grouped, capped at 8, and work with the arrow keys", async ({ page }) => {
  await box(page).fill("a");
  await expect(page.getByRole("option")).toHaveCount(8);
  await expect(page.getByRole("group")).toHaveText([/.+/, /.+/, /.+/]);
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(box(page)).toHaveValue("");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("/ focuses the box, but not while typing elsewhere (G10)", async ({ page }) => {
  await page.keyboard.press("/");
  await expect(box(page)).toBeFocused();
  await expect(box(page)).toHaveValue("");

  await page.goto("/deals");
  const search = page.getByRole("searchbox", { name: "Search deals" });
  await search.fill("a/b");
  await expect(search).toHaveValue("a/b");
  await expect(search).toBeFocused();
});

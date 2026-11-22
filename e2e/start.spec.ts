import { test, expect } from "./fixtures";

test("the app opens on the dashboard", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const tab of ["Dashboard", "Pipeline", "Deals", "Contacts", "Organizations"]) {
    await expect(nav.getByRole("link", { name: tab })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("region", { name: "How sales are going" })).toBeVisible();
});

test("every screen shows sample data (SC1)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-open")).toHaveText("$775,500");
  await expect(page.getByTestId("follow-up").first()).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Pipeline" }).click();
  await expect(page.getByTestId("deal-card")).not.toHaveCount(0);
  await nav.getByRole("link", { name: "Deals" }).click();
  await expect(page.getByText("Showing 34 of 34 deals")).toBeVisible();
  await nav.getByRole("link", { name: "Contacts" }).click();
  await expect(page.getByText("Showing 40 of 40 contacts")).toBeVisible();
  await nav.getByRole("link", { name: "Organizations" }).click();
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();
  await page.getByRole("link", { name: "Quarry Software", exact: true }).click();
  await expect(page.getByTestId("timeline-entry")).not.toHaveCount(0);
});

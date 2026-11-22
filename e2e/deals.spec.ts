import { test, expect, reload } from "./fixtures";
import type { Page } from "@playwright/test";

const rows = (page: Page) => page.getByTestId("table-row");
const row = (page: Page, name: string) =>
  rows(page).filter({ has: page.getByRole("link", { name, exact: true }) });

test.beforeEach(async ({ page }) => {
  await page.goto("/deals");
  await expect(page.getByText("Showing 34 of 34 deals")).toBeVisible();
});

test("add, search, sort, edit and delete a deal (SC2)", async ({ page }) => {
  // Add
  await page.getByRole("main").getByRole("button", { name: "Add deal" }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await dialog.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog.getByText("Required")).toHaveCount(3); // name, organization, value
  await dialog.getByLabel("Deal name").fill("Payroll integration");
  await dialog.getByLabel("Organization").selectOption({ label: "Tallow & Finch" });
  await dialog.getByLabel("Main contact (optional)").selectOption({ label: "Lucy Tran" });
  await dialog.getByLabel("Stage").selectOption({ label: "Proposal" });
  await expect(dialog.getByLabel("Probability of close (%)")).toHaveValue("50");
  await dialog.getByLabel("Value (USD)").fill("$36,000");
  await dialog.getByLabel("Close date").fill("2027-02-20");
  await dialog.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Deal added")).toBeVisible();
  await expect(page.getByText("Showing 35 of 35 deals")).toBeVisible();

  // Search
  await page.getByRole("searchbox", { name: "Search deals" }).fill("payroll");
  await expect(page.getByText("Showing 1 of 35 deals")).toBeVisible();
  await expect(row(page, "Payroll integration")).toContainText("Tallow & Finch");
  await expect(row(page, "Payroll integration")).toContainText("$36,000");
  await expect(row(page, "Payroll integration")).toContainText("20 Feb 2027");

  // Search that matches nothing
  await page.getByRole("searchbox", { name: "Search deals" }).fill("zzz");
  await expect(page.getByText('No deals match "zzz"')).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByText("Showing 35 of 35 deals")).toBeVisible();

  // Sort by value, highest first
  const valueHeader = page.getByRole("columnheader", { name: /Value/ });
  await valueHeader.getByRole("button").click(); // numbers sort highest first
  await expect(valueHeader).toHaveAttribute("aria-sort", "descending");
  await expect(rows(page).first()).toContainText("Data warehouse build");

  // Edit
  await page.getByRole("searchbox", { name: "Search deals" }).fill("payroll");
  await row(page, "Payroll integration").hover();
  await page.getByRole("button", { name: "Edit Payroll integration" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Payroll integration" });
  await edit.getByLabel("Value (USD)").fill("40000");
  await edit.getByRole("button", { name: "Save deal" }).click();
  await expect(edit).toBeHidden();
  await expect(row(page, "Payroll integration")).toContainText("$40,000");

  // Still there after a reload
  await reload(page);
  await page.getByRole("searchbox", { name: "Search deals" }).fill("payroll");
  await expect(row(page, "Payroll integration")).toContainText("$40,000");

  // Delete
  await row(page, "Payroll integration").hover();
  await page.getByRole("button", { name: "Delete Payroll integration" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Delete Payroll integration?");
  await expect(confirm).toContainText("Its stage history will be deleted.");
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText('No deals match "payroll"')).toBeVisible();
  await reload(page);
  await expect(page.getByText("Showing 34 of 34 deals")).toBeVisible();
});

test("field errors show next to the field (V5)", async ({ page }) => {
  await page.getByRole("main").getByRole("button", { name: "Add deal" }).click();
  const dialog = page.getByRole("dialog", { name: "Add deal" });
  await dialog.getByLabel("Deal name").fill("Probe");
  await dialog.getByLabel("Organization").selectOption({ label: "Lumen Retail" });
  await dialog.getByLabel("Value (USD)").fill("12.5");
  await dialog.getByRole("button", { name: "Add deal" }).click();
  await expect(dialog.getByText("Enter a whole number")).toBeVisible();
  await expect(dialog.getByLabel("Value (USD)")).toHaveAttribute("aria-invalid", "true");
});

test("late deals show the Late label (DL2)", async ({ page }) => {
  await page.getByLabel("Show").selectOption("late");
  await expect(page.getByText("Showing 3 of 34 deals")).toBeVisible();
  for (const name of ["Learning platform rollout", "Website rebuild", "Patient intake redesign"]) {
    await expect(row(page, name).getByText("Late", { exact: true })).toBeVisible();
  }
  await page.getByLabel("Show").selectOption("all");
  await expect(row(page, "Data warehouse build").getByText("Late", { exact: true })).toHaveCount(0);
});

test("the No organization filter finds deals whose organization was deleted", async ({
  page,
  request,
}) => {
  const orgs = await (await request.get("http://127.0.0.1:8100/api/organizations")).json();
  const halcyon = orgs.find((o: { name: string }) => o.name === "Halcyon Studios");
  await request.delete(`http://127.0.0.1:8100/api/organizations/${halcyon.id}`);
  await reload(page);
  await page.getByLabel("Show").selectOption("no-org");
  await expect(page.getByText("Showing 3 of 34 deals")).toBeVisible();
  await expect(row(page, "Website rebuild")).toContainText("No organization");

  // Saving it from the edit form asks for an organization (concern 3).
  await row(page, "Website rebuild").hover();
  await page.getByRole("button", { name: "Edit Website rebuild" }).click();
  const edit = page.getByRole("dialog");
  await edit.getByRole("button", { name: "Save deal" }).click();
  await expect(edit.getByText("Required")).toBeVisible();
  await edit.getByLabel("Organization").selectOption({ label: "Lumen Retail" });
  await edit.getByRole("button", { name: "Save deal" }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByText("Showing 2 of 34 deals")).toBeVisible();
});

test("changing the stage in the edit form updates the probability", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search deals" }).fill("Analytics retainer");
  await row(page, "Analytics retainer").hover();
  await page.getByRole("button", { name: "Edit Analytics retainer" }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Stage").selectOption({ label: "Negotiation" });
  await expect(edit.getByLabel("Probability of close (%)")).toHaveValue("75");
  await edit.getByRole("button", { name: "Save deal" }).click();
  await expect(row(page, "Analytics retainer")).toContainText("Negotiation");
  await expect(row(page, "Analytics retainer")).toContainText("75%");
});

test("the Deals table works from the keyboard (SC8)", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search deals" }).focus();
  await page.keyboard.type("security");
  await expect(page.getByText("Showing 1 of 34 deals")).toBeVisible();
  // Tab to the filter, the Add button, the headings, then into the row.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Show")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("main").getByRole("button", { name: "Add deal" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("columnheader", { name: /Name/ }).getByRole("button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  const editButton = page.getByRole("button", { name: "Edit Security review" });
  for (
    let i = 0;
    i < 12 && !(await editButton.evaluate((el) => el === document.activeElement));
    i++
  ) {
    await page.keyboard.press("Tab");
  }
  await expect(editButton).toBeFocused();
  await expect(editButton).toBeVisible();
  await page.keyboard.press("Enter");
  const edit = page.getByRole("dialog");
  await expect(edit.getByLabel("Deal name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(edit).toBeHidden();
  await expect(editButton).toBeFocused();
});

test("the deal page shows details, links and timeline (DL3)", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search deals" }).fill("Website rebuild");
  await page.getByRole("link", { name: "Website rebuild", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Website rebuild" })).toBeVisible();
  const header = page.getByRole("main").locator("header").first();
  await expect(header).toContainText("Late");
  await expect(header).toContainText("$32,000");
  await expect(page.getByRole("link", { name: "Halcyon Studios" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Grace Fischer" }).first()).toBeVisible();
  await expect(
    page.getByTestId("timeline-entry").filter({ hasText: "Moved from Qualified to Proposal" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "and its stage history will be deleted.",
  );
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(page.getByText("Showing 33 of 33 deals")).toBeVisible();
});

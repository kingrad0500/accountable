import { test, expect, reload } from "./fixtures";
import type { Page } from "@playwright/test";

const row = (page: Page, name: string) =>
  page.getByTestId("table-row").filter({ has: page.getByRole("link", { name, exact: true }) });

test.beforeEach(async ({ page }) => {
  await page.goto("/organizations");
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();
});

test("add, search, sort, edit and delete an organization (SC2)", async ({ page }) => {
  await page.getByRole("button", { name: "Add organization" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add organization" });
  await dialog.getByLabel("Name").fill("Harbor Analytics");
  await dialog.getByLabel("Website").fill("harbor");
  await dialog.getByRole("button", { name: "Add organization" }).click();
  await expect(dialog.getByText("Enter a website such as acme.com")).toBeVisible();
  await dialog.getByLabel("Website").fill("harbor-analytics.com");
  await dialog.getByLabel("Industry").fill("Software");
  await dialog.getByRole("button", { name: "Add organization" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Showing 16 of 16 organizations")).toBeVisible();

  await page.getByRole("searchbox", { name: "Search organizations" }).fill("software");
  await expect(page.getByText("Showing 2 of 16 organizations")).toBeVisible();
  await expect(row(page, "Harbor Analytics")).toContainText("harbor-analytics.com");
  await page.getByRole("searchbox", { name: "Search organizations" }).fill("");

  const openValue = page.getByRole("columnheader", { name: /Open value/ });
  await openValue.getByRole("button").click();
  await expect(openValue).toHaveAttribute("aria-sort", "descending");
  await expect(page.getByTestId("table-row").first()).toContainText("Kestrel Capital");
  await expect(page.getByTestId("table-row").first()).toContainText("$148,000");

  await row(page, "Harbor Analytics").hover();
  await page.getByRole("button", { name: "Edit Harbor Analytics" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Harbor Analytics" });
  await edit.getByLabel("Name").fill("Harbor Data");
  await edit.getByRole("button", { name: "Save organization" }).click();
  await expect(row(page, "Harbor Data")).toBeVisible();
  await reload(page);
  await expect(row(page, "Harbor Data")).toBeVisible();

  await row(page, "Harbor Data").hover();
  await page.getByRole("button", { name: "Delete Harbor Data" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("It has no contacts or deals.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Showing 15 of 15 organizations")).toBeVisible();
});

test("the delete dialog says what happens to linked records (D1)", async ({ page }) => {
  await row(page, "Northwind Partners").hover();
  await page.getByRole("button", { name: "Delete Northwind Partners" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Delete Northwind Partners?");
  await expect(confirm).toContainText("Its 2 contacts and 3 deals will be kept, with no organization.");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole("button", { name: "Delete Northwind Partners" })).toBeFocused();

  await page.getByRole("button", { name: "Delete Northwind Partners" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Showing 14 of 14 organizations")).toBeVisible();
  await page.goto("/contacts");
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("Liam Murphy");
  await expect(page.getByTestId("table-row").first()).toContainText("None");
});

test("the table shows contacts, open deals and open value (O1)", async ({ page }) => {
  const kestrel = row(page, "Kestrel Capital");
  await expect(kestrel).toContainText("Finance");
  await expect(kestrel).toContainText("kestrelcapital.com");
  await expect(kestrel.getByRole("cell").nth(3)).toHaveText("3");
  await expect(kestrel.getByRole("cell").nth(4)).toHaveText("1");
  await expect(kestrel.getByRole("cell").nth(5)).toHaveText("$148,000");
});

test("the organization page shows its contacts, deals and timeline (SC3, O2)", async ({ page }) => {
  await page.getByRole("link", { name: "Solace Insurance", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Solace Insurance" })).toBeVisible();
  const contacts = page.getByRole("region", { name: "Contacts" });
  for (const name of ["Priya Desai", "George Lindqvist", "Isla Moreno"]) await expect(contacts.getByRole("link", { name })).toBeVisible();
  const deals = page.getByRole("region", { name: "Deals" });
  for (const name of ["Security review", "Claims workflow automation"]) await expect(deals.getByRole("link", { name })).toBeVisible();

  const timeline = page.getByTestId("timeline-entry");
  await expect(timeline.filter({ hasText: "Ask for the procurement contact" })).toContainText("George Lindqvist");
  await expect(timeline.filter({ hasText: "Claims workflow automation moved from New to Qualified" })).toBeVisible();
  const times = await timeline.locator("time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!));
  expect(times).toEqual([...times].sort().reverse());

  // Deleting from the record's page goes back to the table (D3).
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByText("Showing 14 of 14 organizations")).toBeVisible();
});

test("add a contact from the organization page", async ({ page }) => {
  await page.getByRole("link", { name: "Bluefin Logistics", exact: true }).click();
  await page.getByRole("region", { name: "Contacts" }).getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add contact" });
  await expect(dialog.getByLabel("Organization")).toHaveValue(/\d+/);
  await dialog.getByLabel("Name").fill("Pia Holm");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("region", { name: "Contacts" }).getByRole("link", { name: "Pia Holm" })).toBeVisible();
});

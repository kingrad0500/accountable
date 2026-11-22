import { test, expect, reload } from "./fixtures";
import type { Page } from "@playwright/test";

const row = (page: Page, name: string) =>
  page.getByTestId("table-row").filter({ has: page.getByRole("link", { name, exact: true }) });

async function addContact(page: Page, name: string, status: string, org?: string) {
  await page.getByRole("main").getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add contact" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Email").fill(`${name.split(" ")[0].toLowerCase()}@example.com`);
  if (org) await dialog.getByLabel("Organization").selectOption({ label: org });
  await dialog.getByLabel("Status").selectOption({ label: status });
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/contacts");
  await expect(page.getByText("Showing 40 of 40 contacts")).toBeVisible();
});

test("add a lead, a qualified contact and a customer, then filter by status (SC2, SC3)", async ({
  page,
}) => {
  await expect(page.getByLabel("Status")).toContainText("All (40)");
  const leads = await page.getByLabel("Status").locator("option[value=lead]").textContent();
  const before = Number(leads!.match(/\((\d+)\)/)![1]);

  await addContact(page, "Lena Park", "Lead", "Quarry Software");
  await addContact(page, "Quinn Ash", "Qualified");
  await addContact(page, "Cora Bell", "Customer", "Lumen Retail");
  await expect(page.getByText("Showing 43 of 43 contacts")).toBeVisible();

  await page.getByLabel("Status").selectOption("lead");
  await expect(page.getByText(`Showing ${before + 1} of 43 contacts`)).toBeVisible();
  await expect(row(page, "Lena Park")).toContainText("Quarry Software");
  await expect(row(page, "Cora Bell")).toHaveCount(0);

  // The filter combines with search.
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("lena");
  await expect(page.getByText("Showing 1 of 43 contacts")).toBeVisible();
  await page.getByLabel("Status").selectOption("customer");
  await expect(page.getByText('No contacts match "lena"')).toBeVisible();
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("cora");
  await expect(row(page, "Cora Bell")).toContainText("Customer");

  await reload(page);
  await page.getByLabel("Status").selectOption("qualified");
  await expect(row(page, "Quinn Ash")).toBeVisible();
});

test("an email that doesn't look like one is refused (V2)", async ({ page }) => {
  await page.getByRole("main").getByRole("button", { name: "Add contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Add contact" });
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog.getByText("Required")).toBeVisible();
  await dialog.getByLabel("Name").fill("Sam");
  await dialog.getByLabel("Email").fill("sam@acme");
  await dialog.getByRole("button", { name: "Add contact" }).click();
  await expect(dialog.getByText("Enter an email such as name@company.com")).toBeVisible();
});

test("search, sort, edit and delete a contact (SC2)", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("CEDAR");
  await expect(page.getByText("Showing 3 of 40 contacts")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("");

  const nameHeader = page.getByRole("columnheader", { name: /Name/ });
  await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(page.getByTestId("table-row").first()).toContainText("Aaron Cole");
  await nameHeader.getByRole("button").click();
  await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  await expect(page.getByTestId("table-row").first()).toContainText("Zara Hussain");

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("Ana Ruiz");
  await row(page, "Ana Ruiz").hover();
  await page.getByRole("button", { name: "Edit Ana Ruiz" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Ana Ruiz" });
  await edit.getByLabel("Job title").fill("Chief Patient Officer");
  await edit.getByRole("button", { name: "Save contact" }).click();
  await expect(row(page, "Ana Ruiz")).toContainText("Chief Patient Officer");
  await reload(page);
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("Ana Ruiz");
  await expect(row(page, "Ana Ruiz")).toContainText("Chief Patient Officer");

  // Delete: their activities go, their deals stay with no main contact.
  await row(page, "Ana Ruiz").hover();
  await page.getByRole("button", { name: "Delete Ana Ruiz" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("Delete Ana Ruiz?");
  await expect(confirm).toContainText("Their 1 deal stays, with no main contact.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText('No contacts match "Ana Ruiz"')).toBeVisible();

  await page.goto("/deals");
  await page.getByRole("searchbox", { name: "Search deals" }).fill("Patient intake");
  const deal = page.getByTestId("table-row").first();
  await expect(deal).toContainText("Patient intake redesign");
  await expect(deal).toContainText("None");
});

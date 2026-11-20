import { test, expect, reload } from "./fixtures";
import type { Page } from "@playwright/test";

const entries = (page: Page) => page.getByTestId("timeline-entry");

async function openContact(page: Page, name: string) {
  await page.goto("/contacts");
  await page.getByRole("searchbox", { name: "Search contacts" }).fill(name);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function openDeal(page: Page, name: string) {
  await page.goto("/deals");
  await page.getByRole("searchbox", { name: "Search deals" }).fill(name);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function log(page: Page, type: "Note" | "Call" | "Email", text: string, when?: string, followUp?: string) {
  await page.getByRole("group", { name: "Type" }).getByText(type, { exact: true }).click();
  await page.getByLabel("What happened").fill(text);
  if (when) await page.getByLabel("When").fill(when);
  if (followUp) await page.getByLabel("Follow-up date (optional)").fill(followUp);
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(entries(page).filter({ hasText: text })).toBeVisible();
}

test("log a note, call and email on a contact and a deal; newest first, and on the main contact's timeline (SC5)", async ({ page }) => {
  await openContact(page, "Ana Ruiz");
  await log(page, "Note", "Prefers email over calls", "2026-11-16T09:00");
  await log(page, "Call", "Talked through rollout dates", "2026-11-18T11:30");
  await expect(entries(page).first()).toContainText("Talked through rollout dates");

  await openDeal(page, "Patient intake redesign");
  await log(page, "Email", "Sent the revised order form", "2026-11-17T15:00", "2026-11-25");
  const deal = entries(page);
  await expect(deal.first()).toContainText("Sent the revised order form");
  await expect(deal.first()).toContainText("Follow up 25 Nov");

  // Ana Ruiz is the deal's main contact, so it shows on her timeline too, in date order.
  await openContact(page, "Ana Ruiz");
  const texts = await entries(page).evaluateAll((els) => els.map((e) => e.textContent ?? ""));
  const order = ["Talked through rollout dates", "Sent the revised order form", "Prefers email over calls"].map((t) =>
    texts.findIndex((x) => x.includes(t)),
  );
  expect(order.every((i) => i >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await reload(page);
  await expect(entries(page).filter({ hasText: "Sent the revised order form" })).toContainText("Patient intake redesign");

  // And on the organization's timeline.
  await page.getByRole("link", { name: "Cedar Health Group" }).first().click();
  await expect(entries(page).filter({ hasText: "Prefers email over calls" })).toBeVisible();
});

test("the activity form needs a description (V1)", async ({ page }) => {
  await openContact(page, "Emma Walsh");
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByText("Required")).toBeVisible();
});

test("a stage change adds an entry to the deal's timeline and the dashboard's recent activity (SC5)", async ({ page }) => {
  await openDeal(page, "Analytics retainer");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Stage").selectOption({ label: "Proposal" });
  await expect(dialog.getByLabel("Probability of close (%)")).toHaveValue("50");
  await dialog.getByRole("button", { name: "Save deal" }).click();
  await expect(entries(page).first()).toContainText("Moved from Qualified to Proposal");
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  // Stage changes are read-only.
  await expect(entries(page).first().getByRole("button")).toHaveCount(0);

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("region", { name: "Recent activity" })).toContainText("Analytics retainer moved from Qualified to Proposal");
});

test("edit and delete an activity, and mark a follow-up done and not done (A2)", async ({ page }) => {
  await openContact(page, "Emma Walsh");
  const item = entries(page).filter({ hasText: "Call back about budget" });
  await expect(item).toContainText("(overdue)");

  const done = item.getByRole("checkbox");
  await done.check();
  await expect(done).toBeChecked();
  await expect(item).not.toContainText("(overdue)");
  await reload(page);
  await expect(entries(page).filter({ hasText: "Call back about budget" }).getByRole("checkbox")).toBeChecked();
  await entries(page).filter({ hasText: "Call back about budget" }).getByRole("checkbox").uncheck();
  await expect(entries(page).filter({ hasText: "Call back about budget" })).toContainText("(overdue)");

  await item.hover();
  await page.getByRole("button", { name: "Edit call: Call back about budget" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit activity" });
  await dialog.getByLabel("What happened").fill("Call back about the Q1 budget");
  await dialog.getByRole("button", { name: "Save activity" }).click();
  await expect(dialog).toBeHidden();
  const edited = entries(page).filter({ hasText: "Call back about the Q1 budget" });
  await expect(edited).toBeVisible();

  await edited.hover();
  await page.getByRole("button", { name: "Delete call: Call back about the Q1 budget" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(/Delete this call from \d+ Nov 2026\?/);
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(edited).toHaveCount(0);
  await reload(page);
  await expect(entries(page).filter({ hasText: "Q1 budget" })).toHaveCount(0);
});

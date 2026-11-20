import { test, expect, API } from "./fixtures";
import { usd } from "./money";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("kpi-revenue")).toBeVisible();
});

test("the figures match the API and the database (SC6, DB7)", async ({ page, request }) => {
  const d = await (await request.get(`${API}/dashboard`)).json();
  const f = d.figures;
  await expect(page.getByTestId("kpi-revenue")).toHaveText(usd(f.revenue_won_12m));
  await expect(page.getByTestId("kpi-open")).toHaveText(usd(f.open_value));
  await expect(page.getByTestId("kpi-expected")).toHaveText(usd(f.expected_revenue));
  await expect(page.getByTestId("kpi-win-rate")).toHaveText(`${Math.round(f.win_rate * 100)}%`);
  await expect(page.getByTestId("kpi-attention")).toHaveText(String(f.late_deals + f.overdue_follow_ups));

  // Cross-check the open figures against the raw deals list.
  const deals: { stage: string; value: number; probability: number }[] = await (await request.get(`${API}/deals`)).json();
  const open = deals.filter((x) => ["new", "qualified", "proposal", "negotiation"].includes(x.stage));
  expect(f.open_value).toBe(open.reduce((s, x) => s + x.value, 0));
  expect(f.expected_revenue).toBe(Math.round(open.reduce((s, x) => s + (x.value * x.probability) / 100, 0)));
  expect(f.open_count).toBe(open.length);
  await expect(page.getByTestId("follow-up-counts")).toHaveText(
    `${d.follow_up_counts.overdue} overdue · ${d.follow_up_counts.today} today · ${d.follow_up_counts.upcoming} upcoming`,
  );
});

test("marking a deal won changes revenue, win rate and the charts (SC6)", async ({ page, request }) => {
  const before = (await (await request.get(`${API}/dashboard`)).json()).figures;
  const novBefore = (await page.getByRole("img", { name: /Deals won and lost by month/ }).getAttribute("aria-label"))!.match(/Nov: (\d+) won/)![1];

  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await page.getByRole("button", { name: "Move Managed cloud contract to" }).click();
  await page.getByRole("menuitem", { name: "Won" }).click();
  await expect(page.getByTestId("column-won")).toContainText("Managed cloud contract");
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();

  await expect(page.getByTestId("kpi-revenue")).toHaveText(usd(before.revenue_won_12m + 118000));
  const rate = Math.round(((before.won_12m + 1) / (before.won_12m + 1 + before.lost_12m)) * 100);
  await expect(page.getByTestId("kpi-win-rate")).toHaveText(`${rate}%`);
  await expect(page.getByTestId("kpi-open")).toHaveText(usd(before.open_value - 118000));
  await expect(page.getByRole("img", { name: /Deals won and lost by month/ })).toHaveAttribute(
    "aria-label",
    new RegExp(`Nov: ${Number(novBefore) + 1} won`),
  );
  await expect(page.getByRole("region", { name: "Recent activity" })).toContainText("Managed cloud contract moved from Negotiation to Won");
});

test("a new follow-up appears under Upcoming, and marking it done removes it (SC5, SC6)", async ({ page }) => {
  await page.getByRole("link", { name: "Deals", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search deals" }).fill("Mobile app phase 2");
  await page.getByRole("link", { name: "Mobile app phase 2" }).click();
  await page.getByRole("group", { name: "Type" }).getByText("Call", { exact: true }).click();
  await page.getByLabel("What happened").fill("Book the design review");
  await page.getByLabel("Follow-up date (optional)").fill("2026-11-23");
  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByTestId("timeline-entry").first()).toContainText("Book the design review");

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  const followUps = page.getByRole("region", { name: "Follow-ups" });
  const upcoming = followUps.getByRole("rowgroup", { name: "Upcoming" });
  await expect(upcoming).toContainText("Book the design review");
  await expect(upcoming.getByTestId("follow-up").filter({ hasText: "Book the design review" })).toContainText("23 Nov");
  await expect(followUps).toContainText("9 upcoming");

  await followUps.getByRole("checkbox", { name: "Mark done: Book the design review" }).check();
  await expect(followUps).not.toContainText("Book the design review");
  await expect(followUps).toContainText("8 upcoming");
  await page.reload();
  await expect(page.getByRole("region", { name: "Follow-ups" })).not.toContainText("Book the design review");
});

test("the line chart, bar chart and funnel are present (SC7)", async ({ page }) => {
  const line = page.getByRole("img", { name: /Revenue won by month/ });
  await expect(line.locator("svg path.recharts-area-curve")).toBeVisible();
  await expect(page.getByTestId("best-month")).toBeVisible();
  const bars = page.getByRole("img", { name: /Deals won and lost by month/ });
  expect(await bars.locator(".recharts-bar-rectangle").count()).toBeGreaterThan(12);
  const funnel = page.getByRole("region", { name: "Sales funnel" });
  for (const stage of ["New", "Qualified", "Proposal", "Negotiation", "Won"]) await expect(funnel).toContainText(stage);
  await expect(funnel).toContainText("carried on");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good afternoon");
  await expect(page.getByText("Wednesday, 18 November 2026 · all figures in USD")).toBeVisible();
});

test("a link in recent activity opens its record (DB5)", async ({ page }) => {
  const recent = page.getByRole("region", { name: "Recent activity" });
  const link = recent.getByRole("link").first();
  const name = await link.textContent();
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name!);
});

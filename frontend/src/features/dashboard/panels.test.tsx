import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Dashboard, FollowUp } from "../../api/types";
import { todayISO, addDays } from "../../lib/dates";
import { FollowUps } from "./FollowUps";
import { Funnel } from "./Funnel";
import { RecentActivity } from "./RecentActivity";
import { SummaryPanel } from "./SummaryPanel";

const wrap = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

const DATA: Dashboard = {
  today: "2026-11-18",
  figures: {
    revenue_won_12m: 949000, revenue_won_prior_12m: 0, open_value: 775500, open_count: 15, expected_revenue: 360700,
    won_12m: 14, lost_12m: 5, win_rate: 14 / 19, late_deals: 3, overdue_follow_ups: 6, needs_attention: 9,
  },
  months: [{ month: "2026-11", revenue: 58500, won: 1, lost: 1 }],
  funnel: {
    stages: [
      { stage: "new", value: 1879000, count: 34 },
      { stage: "qualified", value: 1777500, count: 29 },
      { stage: "proposal", value: 1568000, count: 24 },
      { stage: "negotiation", value: 1186500, count: 18 },
      { stage: "won", value: 949000, count: 14 },
    ],
    lost_value: 154500,
    lost_count: 5,
  },
  recent: [],
  follow_ups: [],
  follow_up_counts: { overdue: 0, today: 0, upcoming: 0 },
};

describe("dashboard panels render the figures they're given", () => {
  it("summary", () => {
    wrap(<SummaryPanel data={DATA} />);
    expect(screen.getByTestId("kpi-revenue")).toHaveTextContent("$949,000");
    expect(screen.getByTestId("kpi-open")).toHaveTextContent("$775,500");
    expect(screen.getByTestId("kpi-expected")).toHaveTextContent("$360,700");
    expect(screen.getByTestId("kpi-win-rate")).toHaveTextContent("74%");
    expect(screen.getByTestId("kpi-attention")).toHaveTextContent("9");
    expect(screen.getByText("3 late deals · 6 overdue")).toBeInTheDocument();
  });

  it("funnel", () => {
    wrap(<Funnel funnel={DATA.funnel} />);
    expect(screen.getByTestId("funnel-new")).toHaveTextContent("$1.88M");
    expect(screen.getByTestId("funnel-qualified")).toHaveTextContent("95% carried on");
    expect(screen.getByTestId("funnel-won")).toHaveTextContent("80% carried on");
    expect(screen.getByTestId("funnel-lost")).toHaveTextContent("Lost along the way: $154,500 across 5 deals");
  });

  it("follow-ups, grouped", () => {
    const today = todayISO();
    const base = { kind: "activity", type: "call", occurred_at: "2026-11-01T10:00:00Z", at: "2026-11-01T10:00:00Z", follow_up_done: false, contact_id: 1, contact_name: "Emma Walsh", deal_id: null, deal_name: null, organization_id: 2, organization_name: "Pinecrest Schools" } as const;
    const items: FollowUp[] = [
      { ...base, id: 1, description: "Later", follow_up_date: addDays(today, 3), group: "upcoming" },
      { ...base, id: 2, description: "Late one", follow_up_date: addDays(today, -2), group: "overdue" },
      { ...base, id: 3, description: "Now", follow_up_date: today, group: "today" },
    ];
    wrap(<FollowUps items={items} />);
    expect(screen.getByTestId("follow-up-counts")).toHaveTextContent("1 overdue · 1 today · 1 upcoming");
    const rows = screen.getAllByTestId("follow-up");
    expect(rows.map((r) => within(r).getAllByRole("cell")[2].textContent)).toEqual(["Late one", "Now", "Later"]);
    expect(within(rows[1]).getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mark done: Late one" })).not.toBeChecked();
  });

  it("recent activity, with stage changes linked to their deal", () => {
    wrap(
      <RecentActivity
        entries={[
          { kind: "stage_change", id: 1, at: "2026-11-18T10:00:00Z", changed_at: "2026-11-18T10:00:00Z", deal_id: 7, deal_name: "Route planning module", from_stage: "negotiation", to_stage: "won", organization_id: 1, organization_name: "Bluefin Logistics" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Route planning module" })).toHaveAttribute("href", "/deals/7");
    expect(screen.getByText(/moved from Negotiation to/)).toBeInTheDocument();
  });
});

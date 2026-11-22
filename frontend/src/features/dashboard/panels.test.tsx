import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Dashboard, FollowUp } from "../../api/types";
import { todayISO, addDays } from "../../lib/dates";
import { aDashboard, aFollowUp, anActivity, aStageChange } from "../../test/fixtures";
import { fakeBackend, renderScreen } from "../../test/render";
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
    revenue_won_12m: 949000,
    revenue_won_prior_12m: 0,
    open_value: 775500,
    open_count: 15,
    expected_revenue: 360700,
    won_12m: 14,
    lost_12m: 5,
    win_rate: 14 / 19,
    late_deals: 3,
    overdue_follow_ups: 6,
    needs_attention: 9,
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
    expect(screen.getByTestId("funnel-lost")).toHaveTextContent(
      "Lost along the way: $154,500 across 5 deals",
    );
  });

  it("follow-ups, grouped", () => {
    const today = todayISO();
    const base = {
      kind: "activity",
      type: "call",
      occurred_at: "2026-11-01T10:00:00Z",
      at: "2026-11-01T10:00:00Z",
      follow_up_done: false,
      contact_id: 1,
      contact_name: "Emma Walsh",
      deal_id: null,
      deal_name: null,
      organization_id: 2,
      organization_name: "Pinecrest Schools",
    } as const;
    const items: FollowUp[] = [
      {
        ...base,
        id: 1,
        description: "Later",
        follow_up_date: addDays(today, 3),
        group: "upcoming",
      },
      {
        ...base,
        id: 2,
        description: "Late one",
        follow_up_date: addDays(today, -2),
        group: "overdue",
      },
      { ...base, id: 3, description: "Now", follow_up_date: today, group: "today" },
    ];
    wrap(<FollowUps items={items} />);
    expect(screen.getByTestId("follow-up-counts")).toHaveTextContent(
      "1 overdue · 1 today · 1 upcoming",
    );
    const rows = screen.getAllByTestId("follow-up");
    expect(rows.map((r) => within(r).getAllByRole("cell")[2].textContent)).toEqual([
      "Late one",
      "Now",
      "Later",
    ]);
    expect(within(rows[1]).getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mark done: Late one" })).not.toBeChecked();
  });

  it("recent activity, with stage changes linked to their deal", () => {
    wrap(
      <RecentActivity
        entries={[
          {
            kind: "stage_change",
            id: 1,
            at: "2026-11-18T10:00:00Z",
            changed_at: "2026-11-18T10:00:00Z",
            deal_id: 7,
            deal_name: "Route planning module",
            from_stage: "negotiation",
            to_stage: "won",
            organization_id: 1,
            organization_name: "Bluefin Logistics",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Route planning module" })).toHaveAttribute(
      "href",
      "/deals/7",
    );
    expect(screen.getByText(/moved from Negotiation to/)).toBeInTheDocument();
  });
});

describe("summary panel wording", () => {
  it("compares revenue with the 12 months before, when there was some", () => {
    const figures = { ...DATA.figures, revenue_won_prior_12m: 800000 };
    wrap(<SummaryPanel data={{ ...DATA, figures }} />);
    expect(screen.getByText("+19% on the 12 months before")).toBeInTheDocument();
  });

  it("uses the singular for one deal, and says when there's no win rate yet", () => {
    const figures = { ...DATA.figures, won_12m: 1, win_rate: null, late_deals: 1 };
    wrap(<SummaryPanel data={{ ...DATA, figures, months: [] }} />);
    expect(screen.getByText("1 deal won")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-win-rate")).toHaveTextContent("None yet");
    expect(screen.getByText("1 late deal · 6 overdue")).toBeInTheDocument();
  });

  it("names the months the chart covers", () => {
    wrap(<SummaryPanel data={aDashboard()} />);
    expect(screen.getByText("Oct 2026 to Nov 2026")).toBeInTheDocument();
  });
});

describe("funnel wording", () => {
  it("uses the singular for one lost deal", () => {
    wrap(<Funnel funnel={{ ...DATA.funnel, lost_count: 1, lost_value: 500 }} />);
    expect(screen.getByTestId("funnel-lost")).toHaveTextContent("$500 across 1 deal");
  });
});

describe("recent activity (DB5)", () => {
  it("says when there's nothing yet", () => {
    wrap(<RecentActivity entries={[]} />);
    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
  });

  it("links each activity to its deal, or else its contact", () => {
    wrap(
      <RecentActivity
        entries={[
          anActivity({
            id: 1,
            description: "Sent the quote",
            deal_id: 9,
            deal_name: "Fleet",
            organization_id: 2,
            organization_name: "Pinecrest Schools",
          }),
          anActivity({
            id: 2,
            description: "Quick call",
            contact_id: 1,
            contact_name: "Emma Walsh",
          }),
          aStageChange({ id: 3, deal_name: "Solo deal", organization_name: null }),
        ]}
      />,
    );
    const [quote, call, change] = screen.getAllByRole("listitem");
    expect(within(quote).getByText("Sent the quote")).toBeInTheDocument();
    expect(within(quote).getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/deals/9");
    expect(within(quote).getByText("Pinecrest Schools")).toBeInTheDocument();
    expect(within(call).getByRole("link", { name: "Emma Walsh" })).toHaveAttribute(
      "href",
      "/contacts/1",
    );
    expect(within(call).queryByText("Pinecrest Schools")).not.toBeInTheDocument();
    expect(within(change).getByText("Stage change")).toBeInTheDocument();
    expect(within(change).queryByText("Bluefin Logistics")).not.toBeInTheDocument();
  });
});

describe("follow-ups (DB6)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const due = (days: number) => addDays(todayISO(), days);

  it("says when there are none", () => {
    renderScreen(<FollowUps items={[]} />);
    expect(screen.getByText(/^No follow-ups/)).toBeInTheDocument();
    expect(screen.getByTestId("follow-up-counts")).toHaveTextContent(
      "0 overdue · 0 today · 0 upcoming",
    );
  });

  it("links each to its deal, or else its contact, and its organization", () => {
    renderScreen(
      <FollowUps
        items={[
          aFollowUp({
            id: 1,
            description: "Send terms",
            deal_id: 4,
            deal_name: "Fleet",
            organization_id: 2,
            organization_name: "Pinecrest Schools",
            follow_up_date: due(1),
          }),
          aFollowUp({
            id: 2,
            description: "Check in",
            contact_id: 1,
            contact_name: "Emma Walsh",
            follow_up_date: due(2),
          }),
        ]}
      />,
    );
    const [terms, checkIn] = screen.getAllByTestId("follow-up");
    expect(within(terms).getByRole("link", { name: "Fleet" })).toHaveAttribute("href", "/deals/4");
    expect(within(terms).getByRole("link", { name: "Pinecrest Schools" })).toHaveAttribute(
      "href",
      "/organizations/2",
    );
    expect(within(checkIn).getByRole("link", { name: "Emma Walsh" })).toHaveAttribute(
      "href",
      "/contacts/1",
    );
    expect(within(checkIn).getAllByRole("link")).toHaveLength(1);
  });

  it("marks one done", async () => {
    const fetchMock = fakeBackend({ "PATCH /activities/1": anActivity({ follow_up_done: true }) });
    renderScreen(
      <FollowUps
        items={[aFollowUp({ description: "Called about the renewal", follow_up_date: due(-1) })]}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Mark done: Called about the renewal" });
    await userEvent.click(box);
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ follow_up_done: true });
  });

  it("unticks it again if saving fails", async () => {
    fakeBackend({ "PATCH /activities/1": { status: 500, detail: "Boom" } });
    renderScreen(
      <FollowUps
        items={[aFollowUp({ description: "Called about the renewal", follow_up_date: due(-1) })]}
      />,
    );
    const box = screen.getByRole("checkbox", { name: "Mark done: Called about the renewal" });
    await userEvent.click(box);
    await waitFor(() => expect(box).not.toBeChecked());
    expect(box).toBeEnabled();
  });
});

import { describe, expect, it } from "vitest";
import type { Dashboard } from "../../api/types";
import {
  bestMonth,
  changeOnPrior,
  funnelRows,
  greeting,
  monthPoints,
  needsAttention,
} from "./figures";

const figures: Dashboard["figures"] = {
  revenue_won_12m: 118000,
  revenue_won_prior_12m: 100000,
  open_value: 775500,
  open_count: 15,
  expected_revenue: 360700,
  won_12m: 14,
  lost_12m: 5,
  win_rate: 14 / 19,
  late_deals: 3,
  overdue_follow_ups: 6,
  needs_attention: 9,
};

describe("dashboard figures", () => {
  it("Needs attention adds late deals and overdue follow-ups (DB1)", () => {
    expect(needsAttention(figures)).toBe(9);
    expect(needsAttention({ ...figures, late_deals: 0, overdue_follow_ups: 2 })).toBe(2);
  });
  it("compares revenue with the 12 months before, when there is any", () => {
    expect(changeOnPrior(figures)).toBe("+18% on the 12 months before");
    expect(changeOnPrior({ ...figures, revenue_won_12m: 80000 })).toBe(
      "-20% on the 12 months before",
    );
    expect(changeOnPrior({ ...figures, revenue_won_prior_12m: 0 })).toBeNull();
  });
  it("works out what share of the funnel carried on (DB4)", () => {
    const rows = funnelRows([
      { stage: "new", value: 200, count: 4 },
      { stage: "qualified", value: 150, count: 3 },
      { stage: "proposal", value: 0, count: 0 },
      { stage: "negotiation", value: 0, count: 0 },
      { stage: "won", value: 0, count: 0 },
    ]);
    expect(rows.map((r) => [r.width, r.carriedOn])).toEqual([
      [100, null],
      [75, 75],
      [0, 0],
      [0, null],
      [0, null],
    ]);
  });
  it("draws an empty funnel when no deal has any value", () => {
    const rows = funnelRows([
      { stage: "new", value: 0, count: 0 },
      { stage: "won", value: 0, count: 0 },
    ]);
    expect(rows.map((r) => [r.width, r.carriedOn])).toEqual([
      [0, null],
      [0, null],
    ]);
    expect(funnelRows([])).toEqual([]);
  });
  it("labels the months and finds the best one", () => {
    const pts = monthPoints([
      { month: "2025-12", revenue: 10, won: 1, lost: 0 },
      { month: "2026-01", revenue: 30, won: 2, lost: 1 },
    ]);
    expect(pts.map((p) => p.label)).toEqual(["Dec", "Jan"]);
    expect(bestMonth(pts)).toBe(1);
  });
  it("greets for the time of day", () => {
    expect(greeting(new Date(2026, 10, 18, 9))).toBe("Good morning");
    expect(greeting(new Date(2026, 10, 18, 14))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 10, 18, 19))).toBe("Good evening");
  });
});

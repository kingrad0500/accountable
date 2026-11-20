// The dashboard's derived figures, kept apart from the drawing so they can be tested.
import type { Dashboard } from "../../api/types";
import { monthLabel } from "../../lib/format";

/** Late deals plus overdue follow-ups (DB1). */
export function needsAttention(f: Dashboard["figures"]): number {
  return f.late_deals + f.overdue_follow_ups;
}

/** "+18% on the 12 months before", or nothing when there's no earlier revenue to compare with. */
export function changeOnPrior(f: Dashboard["figures"]): string | null {
  if (!f.revenue_won_prior_12m) return null;
  const pct = Math.round(((f.revenue_won_12m - f.revenue_won_prior_12m) / f.revenue_won_prior_12m) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% on the 12 months before`;
}

/** Funnel rows with the share of value that carried on from the stage before (DB4). */
export function funnelRows(stages: Dashboard["funnel"]["stages"]) {
  const top = stages[0]?.value || 0;
  return stages.map((s, i) => ({
    ...s,
    width: top ? (s.value / top) * 100 : 0,
    carriedOn: i > 0 && stages[i - 1].value ? Math.round((s.value / stages[i - 1].value) * 100) : null,
  }));
}

export type MonthPoint = { month: string; label: string; revenue: number; won: number; lost: number };

export function monthPoints(months: Dashboard["months"]): MonthPoint[] {
  return months.map((m) => ({ ...m, label: monthLabel(m.month) }));
}

/** The best month, for the line chart's label. */
export function bestMonth(points: MonthPoint[]): number {
  return points.reduce((best, p, i) => (p.revenue > points[best].revenue ? i : best), 0);
}

export function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

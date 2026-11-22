// The board's pure logic: the optimistic move, column and board totals, and the
// Closed deals filter. The server owns the order; this only predicts its answer (P2, P3).
import type { Deal } from "../../api/types";
import { addDays, isLate } from "../../lib/dates";
import { CLOSED_STAGES, defaultProbability, isOpenStage, type StageKey } from "../../lib/stages";

export type ClosedWindow = "30" | "90" | "365" | "all";

export const CLOSED_WINDOWS: { value: ClosedWindow; label: string; caption: string }[] = [
  { value: "30", label: "Last 30 days", caption: "Closed in the last 30 days" },
  { value: "90", label: "Last 90 days", caption: "Closed in the last 90 days" },
  { value: "365", label: "Last 12 months", caption: "Closed in the last 12 months" },
  { value: "all", label: "All", caption: "All closed deals" },
];

export function byPosition(a: Deal, b: Deal) {
  return a.position - b.position || a.id - b.id;
}

export function column(deals: Deal[], stage: StageKey): Deal[] {
  return deals.filter((d) => d.stage === stage).sort(byPosition);
}

/** Won and Lost show only deals closed in the window; open columns show every deal (P1a). */
export function isVisible(deal: Deal, window: ClosedWindow, today: string): boolean {
  if (!CLOSED_STAGES.includes(deal.stage) || window === "all") return true;
  if (!deal.close_date) return false;
  return deal.close_date > addDays(today, -Number(window));
}

/**
 * The deals list after moving `id` to `index` in `stage`'s column, as the server will
 * answer: stage rules applied (DL5) and both columns renumbered 0..n-1 (P2).
 */
export function applyMove(
  deals: Deal[],
  id: number,
  stage: StageKey,
  index: number,
  today: string,
): Deal[] {
  const moving = deals.find((d) => d.id === id);
  if (!moving) return deals;
  const changed = moving.stage !== stage;
  const updated: Deal = changed
    ? {
        ...moving,
        stage,
        probability: defaultProbability(stage),
        close_date: CLOSED_STAGES.includes(stage) ? today : moving.close_date,
      }
    : { ...moving };
  updated.is_late = isLate(updated, today);

  const target = column(deals, stage).filter((d) => d.id !== id);
  target.splice(Math.max(0, Math.min(index, target.length)), 0, updated);
  const positions = new Map<number, number>(target.map((d, i) => [d.id, i]));
  if (changed)
    column(deals, moving.stage)
      .filter((d) => d.id !== id)
      .forEach((d, i) => positions.set(d.id, i));

  return deals.map((d) => {
    const base = d.id === id ? updated : d;
    const position = positions.get(d.id);
    return position === undefined || position === base.position ? base : { ...base, position };
  });
}

/**
 * Turn an index among the visible cards into an index in the whole column, so a drop
 * between two visible cards lands between them even when older closed deals are hidden.
 */
export function fullIndex(columnIds: number[], visibleIds: number[], visibleIndex: number): number {
  if (visibleIds.length === 0) return 0;
  if (visibleIndex < visibleIds.length)
    return Math.max(0, columnIds.indexOf(visibleIds[visibleIndex]));
  return columnIds.indexOf(visibleIds[visibleIds.length - 1]) + 1;
}

export type Totals = { count: number; value: number; expected: number };

export function totals(deals: Deal[]): Totals {
  return deals.reduce(
    (t, d) => ({
      count: t.count + 1,
      value: t.value + d.value,
      expected: t.expected + (d.value * d.probability) / 100,
    }),
    { count: 0, value: 0, expected: 0 },
  );
}

/** The header strip: open deals only, whatever the Closed deals filter says (P1a, P3). */
export function boardTotals(deals: Deal[], today: string) {
  const open = deals.filter((d) => isOpenStage(d.stage));
  return { ...totals(open), late: open.filter((d) => isLate(d, today)).length };
}

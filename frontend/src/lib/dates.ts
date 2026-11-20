// "Today" means the browser's local date (spec concern 10).
import { parseDate } from "./format";
import { isOpenStage, type StageKey } from "./stages";

export type FollowUpGroup = "overdue" | "today" | "upcoming";

/** Local date as "YYYY-MM-DD". */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** An open deal whose close date is before today (DL2). */
export function isLate(deal: { stage: StageKey; close_date: string | null }, today: string = todayISO()): boolean {
  return isOpenStage(deal.stage) && !!deal.close_date && deal.close_date < today;
}

export function followUpGroup(date: string, today: string = todayISO()): FollowUpGroup {
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
}

/** Follow-ups not done, grouped as Overdue, Today and Upcoming, soonest first (DB6). */
export function groupFollowUps<T extends { follow_up_date: string | null; follow_up_done: boolean }>(
  items: T[],
  today: string = todayISO(),
): Record<FollowUpGroup, T[]> {
  const groups: Record<FollowUpGroup, T[]> = { overdue: [], today: [], upcoming: [] };
  const pending = items.filter((i) => i.follow_up_date && !i.follow_up_done);
  pending.sort((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!));
  for (const item of pending) groups[followUpGroup(item.follow_up_date!, today)].push(item);
  return groups;
}

/** Is an ISO date within the last `days` days, counting today. */
export function withinLastDays(date: string | null, days: number, today: string = todayISO()): boolean {
  if (!date) return false;
  return date > addDays(today, -days) && date <= today;
}

import { describe, expect, it } from "vitest";
import { followUpGroup, groupFollowUps, isLate, withinLastDays } from "./dates";

const TODAY = "2026-11-18";

describe("late deals (DL2)", () => {
  it("are open and past their close date", () => {
    expect(isLate({ stage: "proposal", close_date: "2026-11-17" }, TODAY)).toBe(true);
    expect(isLate({ stage: "new", close_date: "2026-01-01" }, TODAY)).toBe(true);
  });
  it("are not late on the day, in the future, without a date, or closed", () => {
    expect(isLate({ stage: "proposal", close_date: TODAY }, TODAY)).toBe(false);
    expect(isLate({ stage: "proposal", close_date: "2026-12-01" }, TODAY)).toBe(false);
    expect(isLate({ stage: "proposal", close_date: null }, TODAY)).toBe(false);
    expect(isLate({ stage: "won", close_date: "2026-11-01" }, TODAY)).toBe(false);
    expect(isLate({ stage: "lost", close_date: "2026-11-01" }, TODAY)).toBe(false);
  });
});

describe("follow-ups (DB6)", () => {
  it("are grouped as overdue, today and upcoming", () => {
    expect(followUpGroup("2026-11-17", TODAY)).toBe("overdue");
    expect(followUpGroup(TODAY, TODAY)).toBe("today");
    expect(followUpGroup("2026-11-19", TODAY)).toBe("upcoming");
  });
  it("leave out done ones and sort soonest first", () => {
    const items = [
      { id: 1, follow_up_date: "2026-11-25", follow_up_done: false },
      { id: 2, follow_up_date: "2026-11-10", follow_up_done: false },
      { id: 3, follow_up_date: "2026-11-12", follow_up_done: true },
      { id: 4, follow_up_date: TODAY, follow_up_done: false },
      { id: 5, follow_up_date: null, follow_up_done: false },
      { id: 6, follow_up_date: "2026-11-20", follow_up_done: false },
    ];
    const g = groupFollowUps(items, TODAY);
    expect(g.overdue.map((i) => i.id)).toEqual([2]);
    expect(g.today.map((i) => i.id)).toEqual([4]);
    expect(g.upcoming.map((i) => i.id)).toEqual([6, 1]);
  });
});

it("knows the last n days", () => {
  expect(withinLastDays("2026-11-18", 30, TODAY)).toBe(true);
  expect(withinLastDays("2026-10-20", 30, TODAY)).toBe(true);
  expect(withinLastDays("2026-10-19", 30, TODAY)).toBe(false);
  expect(withinLastDays(null, 30, TODAY)).toBe(false);
});

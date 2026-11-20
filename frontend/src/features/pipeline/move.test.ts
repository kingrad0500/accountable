import { describe, expect, it } from "vitest";
import type { Deal } from "../../api/types";
import { applyMove, boardTotals, column, fullIndex, isVisible, totals } from "./move";

const TODAY = "2026-11-18";
let nextId = 1;
function deal(stage: Deal["stage"], position: number, value = 1000, extra: Partial<Deal> = {}): Deal {
  const probability = { new: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 }[stage];
  return {
    id: nextId++, name: `D${nextId}`, organization_id: 1, organization_name: "Acme", main_contact_id: null, main_contact_name: null,
    stage, value, probability, close_date: "2026-12-01", position, is_late: false, created_at: "", updated_at: "", ...extra,
  };
}

describe("the optimistic move (P2, P3)", () => {
  it("moves the card, applies the stage rules and renumbers both columns", () => {
    const a = deal("proposal", 0, 10000);
    const b = deal("proposal", 1, 20000);
    const x = deal("negotiation", 0, 5000);
    const y = deal("negotiation", 1, 7000);
    const after = applyMove([a, b, x, y], a.id, "negotiation", 1, TODAY);
    expect(column(after, "negotiation").map((d) => d.id)).toEqual([x.id, a.id, y.id]);
    expect(column(after, "negotiation").map((d) => d.position)).toEqual([0, 1, 2]);
    expect(column(after, "proposal").map((d) => [d.id, d.position])).toEqual([[b.id, 0]]);
    expect(after.find((d) => d.id === a.id)!.probability).toBe(75);
  });

  it("recomputes column and board totals at once", () => {
    const a = deal("proposal", 0, 10000);
    const x = deal("negotiation", 0, 5000);
    const before = [a, x];
    expect(totals(column(before, "negotiation"))).toEqual({ count: 1, value: 5000, expected: 3750 });
    const after = applyMove(before, a.id, "negotiation", 0, TODAY);
    expect(totals(column(after, "negotiation"))).toEqual({ count: 2, value: 15000, expected: 11250 });
    expect(totals(column(after, "proposal"))).toEqual({ count: 0, value: 0, expected: 0 });
    expect(boardTotals(before, TODAY).expected).toBe(8750);
    expect(boardTotals(after, TODAY).expected).toBe(11250);
    const won = applyMove(after, a.id, "won", 0, TODAY);
    expect(boardTotals(won, TODAY)).toEqual({ count: 1, value: 5000, expected: 3750, late: 0 });
  });

  it("sets today's close date on Won and Lost", () => {
    const a = deal("proposal", 0);
    expect(applyMove([a], a.id, "won", 0, TODAY)[0].close_date).toBe(TODAY);
    expect(applyMove([a], a.id, "lost", 0, TODAY)[0].close_date).toBe(TODAY);
  });

  it("keeps the probability when moving within a column", () => {
    const a = deal("proposal", 0, 1000, { probability: 65 });
    const b = deal("proposal", 1);
    const after = applyMove([a, b], a.id, "proposal", 1, TODAY);
    expect(column(after, "proposal").map((d) => d.id)).toEqual([b.id, a.id]);
    expect(after.find((d) => d.id === a.id)!.probability).toBe(65);
  });

  it("marks a deal moved out of Won with a past close date as late", () => {
    const a = deal("won", 0, 1000, { close_date: "2026-10-01" });
    expect(applyMove([a], a.id, "proposal", 0, TODAY)[0].is_late).toBe(true);
  });
});

describe("the Closed deals filter (P1a)", () => {
  const recent = deal("won", 0, 1000, { close_date: "2026-11-01" });
  const old = deal("won", 1, 1000, { close_date: "2026-05-01" });
  const openOld = deal("new", 0, 1000, { close_date: "2025-01-01" });

  it("hides only Won and Lost cards closed before the window", () => {
    expect(isVisible(recent, "90", TODAY)).toBe(true);
    expect(isVisible(old, "90", TODAY)).toBe(false);
    expect(isVisible(old, "365", TODAY)).toBe(true);
    expect(isVisible(old, "all", TODAY)).toBe(true);
    expect(isVisible(openOld, "30", TODAY)).toBe(true);
  });

  it("doesn't change the open totals", () => {
    expect(boardTotals([recent, old, openOld], TODAY)).toEqual({ count: 1, value: 1000, expected: 100, late: 1 });
  });

  it("maps a drop among visible cards to its place in the whole column", () => {
    // Column: 10, 11(hidden), 12, 13(hidden). Visible: 10, 12.
    const all = [10, 11, 12, 13];
    const visible = [10, 12];
    expect(fullIndex(all, visible, 0)).toBe(0);
    expect(fullIndex(all, visible, 1)).toBe(2);
    expect(fullIndex(all, visible, 2)).toBe(3);
    expect(fullIndex(all, [], 0)).toBe(0);
  });
});

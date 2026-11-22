import { describe, expect, it } from "vitest";
import type { Deal } from "../../api/types";
import { aDeal } from "../../test/fixtures";
import {
  announce,
  arrowTarget,
  columnId,
  columnOf,
  listsWhileOver,
  planDrop,
  shownIds,
  type Lists,
} from "./drag";

// New: 1, 2, 3. Qualified: 4. Proposal: empty. Negotiation: 5, 6. Won: 7. Lost: 8.
const LISTS: Lists = {
  new: [1, 2, 3],
  qualified: [4],
  proposal: [],
  negotiation: [5, 6],
  won: [7],
  lost: [8],
};

describe("columnOf", () => {
  it("finds the column holding a card, or named by a column id", () => {
    expect(columnOf(LISTS, 5)).toBe("negotiation");
    expect(columnOf(LISTS, "5")).toBe("negotiation");
    expect(columnOf(LISTS, columnId("proposal"))).toBe("proposal");
  });

  it("is null outside the board", () => {
    expect(columnOf(LISTS, undefined)).toBeNull();
    expect(columnOf(LISTS, 99)).toBeNull();
  });
});

describe("arrowTarget (P6)", () => {
  it("steps up and down through a column, stopping at its ends", () => {
    expect(arrowTarget(LISTS, "ArrowDown", 1, 1)).toBe(2);
    expect(arrowTarget(LISTS, "ArrowUp", 2, 2)).toBe(1);
    expect(arrowTarget(LISTS, "ArrowUp", 1, 1)).toBeUndefined();
    expect(arrowTarget(LISTS, "ArrowDown", 3, 3)).toBeUndefined();
  });

  it("goes to the same place in the next column, or its last card when it's shorter", () => {
    expect(arrowTarget(LISTS, "ArrowRight", 3, 3)).toBe(4);
    expect(arrowTarget(LISTS, "ArrowLeft", 4, 4)).toBe(1);
  });

  it("goes onto an empty column", () => {
    expect(arrowTarget(LISTS, "ArrowRight", 4, 4)).toBe(columnId("proposal"));
  });

  it("starts from the column itself when over an empty column", () => {
    expect(arrowTarget(LISTS, "ArrowRight", columnId("proposal"), 4)).toBe(5);
    expect(arrowTarget(LISTS, "ArrowUp", columnId("proposal"), 4)).toBeUndefined();
  });

  it("starts from the card itself when it's over nothing", () => {
    expect(arrowTarget(LISTS, "ArrowDown", undefined, 1)).toBe(2);
  });

  it("stops at the board's edges, and when the card is nowhere on the board", () => {
    expect(arrowTarget(LISTS, "ArrowLeft", 1, 1)).toBeUndefined();
    expect(arrowTarget(LISTS, "ArrowRight", 8, 8)).toBeUndefined();
    expect(arrowTarget(LISTS, "ArrowDown", undefined, 99)).toBeUndefined();
  });
});

describe("listsWhileOver", () => {
  it("moves the card before the card it's over in another column", () => {
    const lists = listsWhileOver(LISTS, 1, 6, false);
    expect(lists.new).toEqual([2, 3]);
    expect(lists.negotiation).toEqual([5, 1, 6]);
  });

  it("moves it after the card when it's over that card's lower half", () => {
    expect(listsWhileOver(LISTS, 1, 5, true).negotiation).toEqual([5, 1, 6]);
  });

  it("moves it to the end when over the column itself", () => {
    expect(listsWhileOver(LISTS, 1, columnId("negotiation"), false).negotiation).toEqual([5, 6, 1]);
    expect(listsWhileOver(LISTS, 1, columnId("proposal"), false).proposal).toEqual([1]);
  });

  it("leaves the lists alone within a column, outside the board, or for an unknown card", () => {
    expect(listsWhileOver(LISTS, 1, 2, false)).toBe(LISTS);
    expect(listsWhileOver(LISTS, 1, undefined, false)).toBe(LISTS);
    expect(listsWhileOver(LISTS, 99, 5, false)).toBe(LISTS);
  });
});

describe("planDrop", () => {
  const deals: Deal[] = [
    aDeal({ id: 1, stage: "new", position: 0 }),
    aDeal({ id: 2, stage: "new", position: 1 }),
    aDeal({ id: 3, stage: "new", position: 2 }),
    aDeal({ id: 5, stage: "negotiation", position: 0 }),
    aDeal({ id: 6, stage: "negotiation", position: 1 }),
  ];

  it("reorders within a column", () => {
    expect(planDrop(LISTS, deals, 1, 3)).toEqual({ stage: "new", list: [2, 3, 1], index: 2 });
  });

  it("lands in another column where the board shows it", () => {
    const whileOver = listsWhileOver(LISTS, 1, 6, false);
    expect(planDrop(whileOver, deals, 1, 1)).toEqual({
      stage: "negotiation",
      list: [5, 1, 6],
      index: 1,
    });
  });

  it("takes the place of the card it's dropped on", () => {
    const whileOver = listsWhileOver(LISTS, 1, 6, false);
    expect(planDrop(whileOver, deals, 1, 6)).toEqual({
      stage: "negotiation",
      list: [5, 6, 1],
      index: 2,
    });
  });

  it("lands at the end when dropped on the column itself", () => {
    const whileOver = listsWhileOver(LISTS, 1, columnId("negotiation"), false);
    expect(planDrop(whileOver, deals, 1, columnId("negotiation"))).toEqual({
      stage: "negotiation",
      list: [5, 6, 1],
      index: 2,
    });
  });

  it("does nothing when dropped where it started, outside the board, or for an unknown deal", () => {
    expect(planDrop(LISTS, deals, 2, 2)).toBeNull();
    expect(planDrop(LISTS, deals, 1, undefined)).toBeNull();
    expect(planDrop(LISTS, deals, 99, 2)).toBeNull();
  });
});

describe("shownIds", () => {
  it("shows the first cards up to the limit", () => {
    expect(shownIds([1, 2, 3], 2, null)).toEqual([1, 2]);
  });

  it("keeps showing the dragged card when it's past the limit", () => {
    expect(shownIds([1, 2, 3], 2, 3)).toEqual([1, 2, 3]);
    expect(shownIds([1, 2, 3], 2, 1)).toEqual([1, 2]);
    expect(shownIds([1, 2, 3], 2, 9)).toEqual([1, 2]);
  });
});

describe("announce (P6)", () => {
  it("says where a card was picked up", () => {
    expect(announce.pickedUp(LISTS, 2, "Acme")).toBe("Picked up Acme. New, position 2 of 3.");
    expect(announce.pickedUp(LISTS, 99, "Acme")).toBe("Picked up Acme.");
  });

  it("says where the card is over", () => {
    expect(announce.over(LISTS, 1, 6, "Acme", "new")).toBe(
      "Acme is over Negotiation, position 2 of 2.",
    );
    const inProposal = listsWhileOver(LISTS, 1, columnId("proposal"), false);
    expect(announce.over(inProposal, 1, columnId("proposal"), "Acme", "new")).toBe(
      "Acme is over Proposal, position 1 of 1.",
    );
    expect(announce.over(LISTS, 1, undefined, "Acme", "new")).toBe("Acme is not over a column.");
  });

  it("stays quiet while the card is over itself where it started", () => {
    expect(announce.over(LISTS, 1, 1, "Acme", "new")).toBeUndefined();
    expect(announce.over(LISTS, 1, 1, "Acme", "won")).toBe("Acme is over New, position 1 of 3.");
  });

  it("says where it was dropped, or that it went back", () => {
    expect(announce.dropped(LISTS, 5, "Acme")).toBe("Dropped Acme in Negotiation.");
    expect(announce.dropped(LISTS, undefined, "Acme")).toBe(
      "Acme was dropped outside the board and went back.",
    );
  });

  it("says where a cancelled card went back to", () => {
    expect(announce.cancelled("Acme", "won")).toBe("Cancelled. Acme went back to Won.");
    expect(announce.cancelled("Acme", null)).toBe("Cancelled. Acme went back to its column.");
  });
});

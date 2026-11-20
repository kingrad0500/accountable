import { describe, expect, it } from "vitest";
import { quickSearch, type SearchItem } from "./searchMatches";

const items: SearchItem[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ kind: "deal" as const, id: i, name: `Data project ${i}` })),
  { kind: "contact", id: 1, name: "Dana Lee" },
  { kind: "contact", id: 2, name: "Ada Data" },
  { kind: "organization", id: 1, name: "Datawise" },
  { kind: "organization", id: 2, name: "Acme" },
];

describe("quick search (G10)", () => {
  it("groups matches by type and caps them at 8", () => {
    const groups = quickSearch("DATA", items);
    expect(groups.map((g) => g.label)).toEqual(["Deals", "Contacts", "Organizations"]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(8);
    expect(groups[1].items.map((i) => i.name)).toEqual(["Ada Data"]);
    expect(groups[2].items.map((i) => i.name)).toEqual(["Datawise"]);
  });
  it("puts names that start with the query first", () => {
    const groups = quickSearch("da", items);
    expect(groups[1].items.map((i) => i.name)).toEqual(["Dana Lee", "Ada Data"]);
  });
  it("finds nothing for an empty query", () => {
    expect(quickSearch("  ", items)).toEqual([]);
  });
});

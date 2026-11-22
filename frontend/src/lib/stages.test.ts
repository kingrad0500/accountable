import { expect, it } from "vitest";
import { STAGES, defaultProbability, isOpenStage } from "./stages";

it("has the six stages in order with the spec's probabilities", () => {
  expect(STAGES.map((s) => [s.label, s.probability])).toEqual([
    ["New", 10],
    ["Qualified", 25],
    ["Proposal", 50],
    ["Negotiation", 75],
    ["Won", 100],
    ["Lost", 0],
  ]);
  expect(defaultProbability("negotiation")).toBe(75);
});

it("uses the spec's stage colors", () => {
  const fills = Object.fromEntries(STAGES.map((s) => [s.key, [s.fill, s.text]]));
  expect(fills).toEqual({
    new: ["var(--cerulean-ink)", "#ffffff"],
    qualified: ["var(--marigold)", "var(--ink)"],
    proposal: ["var(--coral)", "var(--ink)"],
    negotiation: ["var(--ink)", "#ffffff"],
    won: ["var(--sea-green)", "var(--ink)"],
    lost: ["var(--sea-mist)", "var(--ink)"],
  });
});

it("knows which stages are open", () => {
  expect(STAGES.filter((s) => isOpenStage(s.key)).map((s) => s.key)).toEqual([
    "new",
    "qualified",
    "proposal",
    "negotiation",
  ]);
});

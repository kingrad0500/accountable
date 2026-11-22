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
    new: ["var(--cerulean-ink)", "var(--white)"],
    qualified: ["var(--marigold)", "var(--midnight)"],
    proposal: ["var(--coral)", "var(--midnight)"],
    negotiation: ["var(--midnight)", "var(--white)"],
    won: ["var(--sea-green)", "var(--midnight)"],
    lost: ["var(--sea-mist)", "var(--midnight)"],
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

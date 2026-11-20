// Pipeline stages: names, order, colors and usual probabilities (DL5, spec concern 1).

export type StageKey = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export type Stage = {
  key: StageKey;
  label: string;
  probability: number;
  /** Header and pill fill, and the text on it. */
  fill: string;
  text: string;
  /** Dot and funnel bar color. */
  dot: string;
};

export const STAGES: Stage[] = [
  { key: "new", label: "New", probability: 10, fill: "var(--cerulean-ink)", text: "#ffffff", dot: "var(--cerulean)" },
  { key: "qualified", label: "Qualified", probability: 25, fill: "var(--marigold)", text: "var(--ink)", dot: "var(--marigold)" },
  { key: "proposal", label: "Proposal", probability: 50, fill: "var(--coral)", text: "var(--ink)", dot: "var(--coral)" },
  { key: "negotiation", label: "Negotiation", probability: 75, fill: "var(--ink)", text: "#ffffff", dot: "var(--ink)" },
  { key: "won", label: "Won", probability: 100, fill: "var(--sea-green)", text: "var(--ink)", dot: "var(--sea-green)" },
  { key: "lost", label: "Lost", probability: 0, fill: "var(--sea-mist)", text: "var(--ink)", dot: "#9fb3b9" },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export const OPEN_STAGES: StageKey[] = ["new", "qualified", "proposal", "negotiation"];
export const CLOSED_STAGES: StageKey[] = ["won", "lost"];

const byKey = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<StageKey, Stage>;

export function stageOf(key: StageKey): Stage {
  return byKey[key];
}

export function stageLabel(key: StageKey): string {
  return byKey[key]?.label ?? key;
}

export function defaultProbability(key: StageKey): number {
  return byKey[key].probability;
}

export function isOpenStage(key: StageKey): boolean {
  return OPEN_STAGES.includes(key);
}

export const STATUSES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "customer", label: "Customer" },
] as const;
export type StatusKey = (typeof STATUSES)[number]["key"];

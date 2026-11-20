import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Every text/background token pair the app uses, with the WCAG AA ratio it needs:
// 4.5 for normal text, 3 for large or bold text (14px bold and up), icons and chart lines.
const PAIRS: [fg: string, bg: string, min: number, use: string][] = [
  ["ink", "bg", 4.5, "body text on the page"],
  ["ink", "panel", 4.5, "body text on panels"],
  ["ink", "tint", 4.5, "text on hovered rows and tags"],
  ["ink-muted", "bg", 4.5, "secondary text on the page"],
  ["ink-muted", "panel", 4.5, "secondary text on panels"],
  ["ink-muted", "tint", 4.5, "secondary text on hovered rows"],
  ["ink-muted", "late-tint", 4.5, "secondary text on late cards"],
  ["ink", "sea-green", 4.5, "primary buttons, Won fills"],
  ["ink", "marigold", 4.5, "Qualified fills"],
  ["ink", "coral", 4.5, "Proposal fills"],
  ["ink", "sea-mist", 4.5, "Lost fills"],
  ["white", "ink", 4.5, "Negotiation fills"],
  ["white", "cerulean-ink", 4.5, "New pills and headers"],
  ["white", "raspberry-ink", 4.5, "Late pill, delete button"],
  ["white", "cerulean", 3, "bold 14px and up only"],
  ["white", "raspberry", 3, "bold 14px and up only"],
  ["sea-green-ink", "panel", 4.5, "Sea Green text on white"],
  ["marigold-ink", "panel", 4.5, "Marigold text on white"],
  ["coral-ink", "panel", 4.5, "Coral text on white"],
  ["cerulean-ink", "panel", 4.5, "links on white"],
  ["raspberry-ink", "panel", 4.5, "overdue dates on white"],
  ["raspberry-deep", "late-tint", 4.5, "late dates on late cards"],
  ["sea-green-ink", "bg", 3, "chart lines on the page"],
  ["sea-mist", "ink", 4.5, "text on the Midnight summary panel"],
  ["hero-muted", "ink", 4.5, "chart axis text on the Midnight panel"],
  ["sea-green", "ink", 4.5, "Sea Green figures on the Midnight panel"],
  ["raspberry-light", "ink", 4.5, "Needs attention figure on the Midnight panel"],
  ["white", "ink", 4.5, "figures on the Midnight panel"],
  ["cerulean", "panel", 3, "focus ring on white"],
  ["cerulean", "bg", 3, "focus ring on the page"],
  ["ink-muted", "panel", 3, "checkbox outline"],
];

function tokens(): Record<string, string> {
  const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");
  const out: Record<string, string> = { white: "#ffffff" };
  for (const m of css.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("brand contrast", () => {
  const t = tokens();
  it.each(PAIRS)("%s on %s meets %s:1 (%s)", (fg, bg, min) => {
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});

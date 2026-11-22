import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(resolve(__dirname, "tokens.css"), "utf8");
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const ALIAS = /^var\(--([a-z0-9-]+)\)$/;

type Declarations = Record<string, string>;

/** The declarations of every block whose selector is exactly `selector`, merged in order. */
function block(selector: string): Declarations {
  const out: Declarations = {};
  for (const [, sel, body] of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    // Drop comments and the @import lines that precede the first block.
    const bare = sel
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(";")
      .pop()!
      .trim();
    if (bare !== selector) continue;
    for (const [, name, value] of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g))
      out[name] = value.trim();
  }
  return out;
}

const root = block(":root");
const PALETTE = Object.fromEntries(
  Object.entries(root).filter(([, value]) => /^#[0-9a-fA-F]{6}$/.test(value)),
);
const darkBlock = block(':root[data-theme="dark"]');

/** The color roles; shadows and the overlay are transparent, so they hold their own values. */
function colorRoles(declarations: Declarations): Declarations {
  return Object.fromEntries(
    Object.entries(declarations).filter(
      ([name, value]) => ALIAS.test(value) && !name.startsWith("shadow"),
    ),
  );
}

const LIGHT = colorRoles(root);
const DARK = { ...LIGHT, ...colorRoles(darkBlock) };
const MODES = { light: LIGHT, dark: DARK };

/** A role or palette token, resolved to its hex value in a mode. */
function hex(token: string, roles: Declarations): string {
  const alias = roles[token]?.match(ALIAS);
  const value = alias ? PALETTE[alias[1]] : PALETTE[token];
  if (!value) throw new Error(`--${token} doesn't resolve to a palette color`);
  return value;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG AA: 4.5 for normal text, 3 for large or bold text (14px bold and up), icons,
// chart lines and the focus ring.
type Pair = [fg: string, bg: string, min: number, use: string];

const BACKGROUNDS = ["bg", "surface", "raised", "tint", "late-tint"];
const COLORED_TEXT = [
  "text-green",
  "text-marigold",
  "text-coral",
  "text-cerulean",
  "text-raspberry",
];

/** Colored text that also sits on the page and on tints: links (See in Deals, hovered table
 * rows) and late or overdue dates (follow-up chips, hovered rows). */
const COLORED_TEXT_OFF_SURFACE = ["text-cerulean", "text-raspberry"];

/** Role pairs: checked in both modes, since dark mode points the roles elsewhere. */
const ROLE_PAIRS: Pair[] = [
  ...BACKGROUNDS.flatMap((bg): Pair[] => [
    ["text", bg, 4.5, "body text"],
    ["text-muted", bg, 4.5, "secondary text"],
  ]),
  ...COLORED_TEXT.flatMap((fg): Pair[] => [
    [fg, "surface", 4.5, "colored text on panels"],
    [fg, "raised", 4.5, "colored text on raised layers"],
  ]),
  ...COLORED_TEXT_OFF_SURFACE.flatMap((fg): Pair[] => [
    [fg, "bg", 4.5, "colored text on the page"],
    [fg, "tint", 4.5, "colored text on tints and hovered rows"],
  ]),
  ["text-late", "late-tint", 4.5, "late dates on late cards"],
  ["dot-negotiation", "surface", 3, "Negotiation dot on panels"],
  ["dot-negotiation", "raised", 3, "Negotiation dot in the Move to menu"],
  ["dot-negotiation", "bg", 3, "Negotiation funnel bar on its track"],
  ["sea-green", "brand-mark", 4.5, "the wordmark's A on its mark (21px, normal weight)"],
  ["brand-mark", "raised", 1.4, "the wordmark's mark stands out from the top bar"],
  ["text-green", "bg", 3, "chart lines on the page"],
  ["text-muted", "surface", 3, "checkbox outline"],
  ["cerulean", "bg", 3, "focus ring on the page"],
  ["cerulean", "surface", 3, "focus ring on panels"],
  ["cerulean", "raised", 3, "focus ring on raised layers"],
];

/** Fill pairs: palette on palette, the same in both modes. */
const FILL_PAIRS: Pair[] = [
  ["midnight", "sea-green", 4.5, "primary buttons, Won fills"],
  ["midnight", "marigold", 4.5, "Qualified fills"],
  ["midnight", "coral", 4.5, "Proposal fills"],
  ["midnight", "sea-mist", 4.5, "Lost fills"],
  ["white", "midnight", 4.5, "Negotiation fills"],
  ["white", "midnight", 3, "Negotiation meter on its white-tinted track"],
  ["white", "cerulean-ink", 4.5, "New pills and headers"],
  ["white", "raspberry-ink", 4.5, "Late pill, delete button"],
  ["white", "sea-green-ink", 3, "checkbox tick"],
  ["white", "cerulean", 3, "bold 14px and up only"],
  ["white", "raspberry", 3, "bold 14px and up only"],
  ["sea-mist", "midnight", 4.5, "text on the Midnight summary panel"],
  ["hero-muted", "midnight", 4.5, "chart axis text on the Midnight panel"],
  ["sea-green", "midnight", 4.5, "Sea Green figures on the Midnight panel"],
  ["raspberry-light", "midnight", 4.5, "Needs attention figure on the Midnight panel"],
];

describe.each(Object.entries(MODES))("%s mode contrast", (_, roles) => {
  it.each(ROLE_PAIRS)("%s on %s meets %s:1 (%s)", (fg, bg, min) => {
    expect(contrast(hex(fg, roles), hex(bg, roles))).toBeGreaterThanOrEqual(min);
  });
});

describe("fill contrast", () => {
  it.each(FILL_PAIRS)("%s on %s meets %s:1 (%s)", (fg, bg, min) => {
    expect(contrast(hex(fg, {}), hex(bg, {}))).toBeGreaterThanOrEqual(min);
  });
});

describe("the two token layers", () => {
  it("has every hex value once, and only in the palette", () => {
    const values = Object.values(PALETTE).map((v) => v.toLowerCase());
    expect(new Set(values).size).toBe(values.length);
    expect(CSS.match(HEX)?.length).toBe(values.length);
  });

  it.each(Object.entries(MODES))("points every %s role at a palette color", (_, roles) => {
    for (const token of Object.keys(roles)) expect(() => hex(token, roles)).not.toThrow();
  });

  it("gives dark mode a value for every role", () => {
    const transparent = ["overlay", "shadow", "shadow-lift", "shadow-raised", "shadow-toast"];
    expect(Object.keys(darkBlock).sort()).toEqual([...Object.keys(LIGHT), ...transparent].sort());
  });

  it("keeps light mode's values as they were before dark mode", () => {
    const light = (token: string) => hex(token, LIGHT).toLowerCase();
    expect({
      bg: light("bg"),
      surface: light("surface"),
      raised: light("raised"),
      tint: light("tint"),
      text: light("text"),
      "text-muted": light("text-muted"),
      "text-cerulean": light("text-cerulean"),
      "text-raspberry": light("text-raspberry"),
      "late-tint": light("late-tint"),
      "text-late": light("text-late"),
    }).toEqual({
      bg: "#f0f4f5",
      surface: "#ffffff",
      raised: "#ffffff",
      tint: "#e6edef",
      text: "#073b4c",
      "text-muted": "#4f6e78",
      "text-cerulean": "#0b6e8f",
      "text-raspberry": "#b8294f",
      "late-tint": "#fff3f5",
      "text-late": "#b8294f",
    });
    expect(root.overlay).toBe("rgb(7 59 76 / 0.35)");
    expect(root.shadow).toBe("0 1px 2px rgb(7 59 76 / 0.06), 0 4px 16px rgb(7 59 76 / 0.05)");
    expect(root["shadow-lift"]).toBe(
      "0 12px 32px rgb(7 59 76 / 0.18), 0 2px 6px rgb(7 59 76 / 0.1)",
    );
  });
});

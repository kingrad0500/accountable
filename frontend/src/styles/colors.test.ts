import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Colors live in tokens.css only (Decision 13). Anywhere else, a color is a token.
const SRC = resolve(__dirname, "..");
const ALLOWED = new Set(["styles/tokens.css"]);
const COLOR_VALUE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\brgb_?\[|\[rgb/;
// Named CSS colors as a value ("black", color: red), and Tailwind's default palette classes.
const NAMED =
  "white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|navy|teal|maroon|olive|lime|aqua|fuchsia|cyan|magenta|brown|gold|indigo|violet";
const NAMED_COLOR = new RegExp(`["'](${NAMED})["']|:\\s*(${NAMED})\\s*[;"'}]`);
const DEFAULT_PALETTE_CLASS =
  /\b[a-z-]+-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(bg|text|border|fill|stroke|outline|ring|shadow)-black\b/;
const STRAY = [COLOR_VALUE, NAMED_COLOR, DEFAULT_PALETTE_CLASS];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("colors in one place", () => {
  it("no source file outside tokens.css holds a color value", () => {
    const stray = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((file) => !ALLOWED.has(file))
      .flatMap((file) =>
        readFileSync(join(SRC, file), "utf8")
          .split("\n")
          .flatMap((line, i) =>
            STRAY.some((pattern) => pattern.test(line)) ? [`${file}:${i + 1}: ${line.trim()}`] : [],
          ),
      );
    expect(stray).toEqual([]);
  });

  it("index.html holds no color value either", () => {
    const html = readFileSync(resolve(SRC, "..", "index.html"), "utf8");
    expect(html).not.toMatch(COLOR_VALUE);
  });

  it.each([
    'style={{ color: "black" }}',
    "color: red;",
    'className="text-gray-500"',
    'className="bg-black"',
    'className="ring-rose-300"',
  ])("catches %s", (line) => {
    expect(STRAY.some((pattern) => pattern.test(line))).toBe(true);
  });

  it.each(['className="text-white bg-midnight"', 'className="bg-sea-green text-fg-muted"'])(
    "allows token classes like %s",
    (line) => {
      expect(STRAY.some((pattern) => pattern.test(line))).toBe(false);
    },
  );
});

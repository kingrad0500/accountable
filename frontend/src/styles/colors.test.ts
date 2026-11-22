import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Colors live in tokens.css only (Decision 13). Anywhere else, a color is a token.
const SRC = resolve(__dirname, "..");
const ALLOWED = new Set(["styles/tokens.css"]);
const COLOR_VALUE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\brgb_?\[|\[rgb/;

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
            COLOR_VALUE.test(line) ? [`${file}:${i + 1}: ${line.trim()}`] : [],
          ),
      );
    expect(stray).toEqual([]);
  });

  it("index.html holds no color value either", () => {
    const html = readFileSync(resolve(SRC, "..", "index.html"), "utf8");
    expect(html).not.toMatch(COLOR_VALUE);
  });
});

import type { Page } from "@playwright/test";

/**
 * Checks the contrast of every piece of visible text on the page, as the browser draws it
 * (WCAG AA: 4.5:1, or 3:1 for text 24px and up, or 18.66px bold and up). The colors come from
 * the computed styles: each element's background and opacity, from <html> down to the text,
 * are composited the way the browser does, so translucent fills, color-mix() tints and dimmed
 * text are measured as they look. Returns one line per element that falls short.
 *
 * Not checked: SVG text (charts), text over a CSS background image, text in disabled
 * controls (WCAG exempts it), and visually hidden text.
 */
export function contrastProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    type RGBA = [r: number, g: number, b: number, a: number];
    const WHITE: RGBA = [255, 255, 255, 1];

    // Computed colors come back as rgb()/rgba(), or color(srgb …) for color-mix() results.
    function parse(css: string): RGBA | null {
      const n = css.match(/[\d.]+/g)?.map(Number);
      if (!n) return null;
      if (css.startsWith("rgb")) return [n[0], n[1], n[2], n[3] ?? 1];
      if (css.startsWith("color(srgb"))
        return [n[0] * 255, n[1] * 255, n[2] * 255, n.length > 3 ? n[3] : 1];
      return null;
    }

    /** `top` painted over an opaque `below`. */
    const over = (top: RGBA, below: RGBA): RGBA => [
      top[0] * top[3] + below[0] * (1 - top[3]),
      top[1] * top[3] + below[1] * (1 - top[3]),
      top[2] * top[3] + below[2] * (1 - top[3]),
      1,
    ];
    const lerp = (a: RGBA, b: RGBA, t: number): RGBA => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
      1,
    ];

    function luminance([r, g, b]: RGBA): number {
      const [R, G, B] = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    }
    function ratio(a: RGBA, b: RGBA): number {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    }

    /**
     * The pixel under the text, with or without the text on it. Each element on the path is an
     * opacity group: its background, then everything inside it, blended over what's below.
     */
    function pixel(path: Element[], i: number, below: RGBA, text: RGBA | null): RGBA {
      if (i === path.length) return text ? over(text, below) : below;
      const style = getComputedStyle(path[i]);
      const background = parse(style.backgroundColor) ?? [0, 0, 0, 0];
      const inside = pixel(path, i + 1, over(background, below), text);
      return lerp(below, inside, Number(style.opacity));
    }

    function ancestry(el: Element): Element[] {
      const path: Element[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) path.unshift(e);
      return path;
    }

    function measurable(el: Element): boolean {
      if (el.closest("svg, option, :disabled")) return false;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return false;
      if (!el.checkVisibility({ visibilityProperty: true })) return false;
      return ancestry(el).every((e) => getComputedStyle(e).backgroundImage === "none");
    }

    const elements = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (node.textContent?.trim() && node.parentElement) elements.add(node.parentElement);

    const problems: string[] = [];
    for (const el of elements) {
      if (!measurable(el)) continue;
      const style = getComputedStyle(el);
      const color = parse(style.color);
      const text = (el.textContent ?? "").trim().slice(0, 40);
      if (!color) {
        problems.push(`"${text}": can't read the color ${style.color}`);
        continue;
      }
      const path = ancestry(el);
      const fg = pixel(path, 0, WHITE, color);
      const bg = pixel(path, 0, WHITE, null);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const needed = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < needed) {
        const hex = (c: RGBA) =>
          "#" +
          c
            .slice(0, 3)
            .map((v) => Math.round(v).toString(16).padStart(2, "0"))
            .join("");
        problems.push(
          `${location.pathname} <${el.tagName.toLowerCase()}> "${text}": ${got.toFixed(2)}:1, needs ${needed}:1 (${hex(fg)} on ${hex(bg)}, ${size}px)`,
        );
      }
    }
    return problems;
  });
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, saveTheme, THEME_KEY } from "./theme";

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

describe("readTheme", () => {
  it("is light when nothing is stored", () => {
    expect(readTheme()).toBe("light");
  });

  it("is light for a value it doesn't know", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    expect(readTheme()).toBe("light");
  });

  it("is light when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTheme()).toBe("light");
  });
});

describe("saveTheme", () => {
  it.each(["dark", "light"] as const)("gives %s mode back to readTheme", (mode) => {
    saveTheme(mode);
    expect(readTheme()).toBe(mode);
    expect(localStorage.getItem("accountable.theme")).toBe(mode);
  });

  it("ignores storage that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveTheme("dark")).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("sets data-theme for dark mode and removes it for light mode", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});

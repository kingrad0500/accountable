// Light or dark mode (G11). index.html applies the stored mode before the first paint;
// this module reads, applies and remembers it from the app.
import { useState } from "react";

export type ThemeMode = "light" | "dark";

/** Shared with the inline script in index.html. */
export const THEME_KEY = "accountable.theme";

/** The stored mode, or light when there's none or storage can't be read. */
export function readTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Not remembered, but the mode still changes for this visit.
  }
}

/** Dark mode is the `data-theme` attribute on <html>; light mode is its absence. */
export function applyTheme(mode: ThemeMode) {
  if (mode === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

export function useTheme(): { mode: ThemeMode; toggle: () => void } {
  const [mode, setMode] = useState(readTheme);
  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
    setMode(next);
  };
  return { mode, toggle };
}

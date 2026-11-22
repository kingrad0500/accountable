import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";

/** The sun/moon button in the top bar; its label says what a click will do (G11). */
export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const dark = mode === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      className="icon-btn size-9"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}

import { useEffect, useRef } from "react";

/**
 * Dialogs opened from code (not a Radix Trigger) don't know what opened them. This
 * remembers what had focus while the dialog was closed and puts focus back there
 * when it closes, so focus returns to the button that opened it.
 */
export function useReturnFocus(open: boolean) {
  const last = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) return;
    const track = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      // A field that auto-focuses as the dialog opens isn't what opened it.
      if (el.closest?.('[role="dialog"], [role="alertdialog"]')) return;
      last.current = el;
    };
    document.addEventListener("focusin", track);
    return () => document.removeEventListener("focusin", track);
  }, [open]);
  return (event: Event) => {
    event.preventDefault();
    if (last.current?.isConnected) last.current.focus();
  };
}

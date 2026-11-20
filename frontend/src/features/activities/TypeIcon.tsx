import { ArrowRight, Mail, Phone, StickyNote } from "lucide-react";
import type { ActivityType } from "../../api/types";

// Note Marigold, call Cerulean, email Coral, stage change Sea Mist.
const STYLES: Record<ActivityType | "stage_change", { bg: string; fg: string; Icon: typeof Mail; label: string }> = {
  note: { bg: "var(--marigold)", fg: "var(--ink)", Icon: StickyNote, label: "Note" },
  call: { bg: "var(--cerulean-ink)", fg: "#ffffff", Icon: Phone, label: "Call" },
  email: { bg: "var(--coral)", fg: "var(--ink)", Icon: Mail, label: "Email" },
  stage_change: { bg: "var(--sea-mist)", fg: "var(--ink)", Icon: ArrowRight, label: "Stage change" },
};

/** An activity type's icon, in a colored circle, or bare. */
export function TypeIcon({ type, size = 15, bare = false }: { type: ActivityType | "stage_change"; size?: number; bare?: boolean }) {
  const { bg, fg, Icon, label } = STYLES[type];
  if (bare) return <Icon size={size} aria-hidden />;
  return (
    <span className="grid size-8 flex-none place-items-center rounded-full" style={{ background: bg, color: fg }} title={label}>
      <Icon size={size} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

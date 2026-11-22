import type { StageKey, StatusKey } from "../lib/stages";
import { stageOf, statusLabel } from "../lib/stages";

const STATUS_COLORS: Record<StatusKey, [string, string]> = {
  lead: ["var(--tint)", "var(--text)"],
  qualified: ["var(--marigold)", "var(--midnight)"],
  customer: ["var(--sea-green)", "var(--midnight)"],
};

type Props =
  | { kind: "stage"; value: StageKey; className?: string }
  | { kind: "status"; value: StatusKey; className?: string }
  | { kind: "late"; className?: string };

/** One pill for stage, contact status and the Late label. */
export function Pill(props: Props) {
  let label: string;
  let bg: string;
  let fg: string;
  if (props.kind === "stage") {
    const s = stageOf(props.value);
    [label, bg, fg] = [s.label, s.fill, s.text];
  } else if (props.kind === "status") {
    label = statusLabel(props.value);
    [bg, fg] = STATUS_COLORS[props.value];
  } else {
    [label, bg, fg] = ["Late", "var(--raspberry-ink)", "var(--white)"];
  }
  return (
    <span className={`pill ${props.className ?? ""}`} style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}

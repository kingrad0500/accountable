import { memo, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar } from "lucide-react";
import type { Deal } from "../../api/types";
import { Money } from "../../components/Money";
import { Pill } from "../../components/Pill";
import { formatDateShort, initials, usd } from "../../lib/format";
import { CLOSED_STAGES } from "../../lib/stages";
import { MoveToMenu } from "./MoveToMenu";

type ViewProps = { deal: Deal; late: boolean; lifted?: boolean; menu?: React.ReactNode };

/** What a card shows (P5). Won and Lost cards are shorter, with the value in short form. */
export function CardView({ deal, late, lifted = false, menu }: ViewProps) {
  const closed = CLOSED_STAGES.includes(deal.stage);
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-[3px] rounded-xl px-3 ${closed ? "py-2" : "py-2.5"} ${
        late ? "bg-[var(--late-tint)]" : "bg-panel"
      } ${lifted ? "shadow-lift" : "shadow-soft"}`}
    >
      <Link
        to={`/deals/${deal.id}`}
        className="text-[13px] leading-[1.3] font-semibold hover:underline"
        onClick={(e) => lifted && e.preventDefault()}
        tabIndex={-1}
      >
        {deal.name}
      </Link>
      <Money value={deal.value} short={closed} className="text-[13px] font-semibold" />
      <span className="col-span-2 truncate text-[12px] text-ink-muted">
        {deal.organization_name ?? <span className="italic">No organization</span>}
        {!closed && ` · ${deal.probability}%`}
      </span>
      <span
        className={`mono flex items-center gap-[5px] text-[11.5px] ${late ? "font-semibold text-raspberry-deep" : "text-ink-muted"}`}
      >
        {!closed && <Calendar size={12} aria-hidden />}
        {deal.close_date ? formatDateShort(deal.close_date) : "No close date"}
      </span>
      <span className="flex items-center justify-end gap-1">
        {late ? (
          <Pill kind="late" className="!px-[7px] !text-[11px] !leading-[17px]" />
        ) : (
          !closed &&
          deal.main_contact_name && (
            <span className="avatar" title={deal.main_contact_name}>
              {initials(deal.main_contact_name)}
            </span>
          )
        )}
        {menu}
      </span>
    </div>
  );
}

/** A card on the board: draggable by pointer and keyboard, with a "Move to" menu (P2, P6). */
export const SortableCard = memo(function SortableCard({
  deal,
  late,
  onMove,
}: {
  deal: Deal;
  late: boolean;
  onMove: (deal: Deal, stage: Deal["stage"]) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  });
  const navigate = useNavigate();
  // A stable ref, so dnd-kit doesn't unregister and re-measure the card on every render.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setNodeRef, setActivatorNodeRef],
  );
  // Only the wrapper moves during a drag; the card's contents don't need to re-render.
  const view = useMemo(
    () => <CardView deal={deal} late={late} menu={<MoveToMenu deal={deal} onMove={onMove} />} />,
    [deal, late, onMove],
  );
  const label = `${deal.name}, ${usd(deal.value)}, ${deal.organization_name ?? "no organization"}${late ? ", late" : ""}`;
  return (
    <article
      ref={ref}
      {...attributes}
      {...listeners}
      onKeyDown={(e) => {
        // Enter opens the deal; Space picks the card up (P6).
        if (e.key === "Enter" && e.target === e.currentTarget && !isDragging) navigate(`/deals/${deal.id}`);
        else listeners?.onKeyDown?.(e);
      }}
      aria-label={label}
      data-testid="deal-card"
      data-deal-id={deal.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group/card relative cursor-grab touch-none rounded-xl ${isDragging ? "z-0" : ""}`}
    >
      <div className={isDragging ? "invisible" : ""}>{view}</div>
      {isDragging && <div aria-hidden className="absolute inset-0 rounded-xl bg-[rgb(7_59_76/0.07)]" />}
    </article>
  );
});

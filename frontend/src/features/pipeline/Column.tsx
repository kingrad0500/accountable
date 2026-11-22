import { memo } from "react";
import { Link } from "react-router";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Deal } from "../../api/types";
import { Money } from "../../components/Money";
import { plural } from "../../lib/format";
import { CLOSED_STAGES, stageOf, type StageKey } from "../../lib/stages";
import { AddDealInColumn } from "./AddDealInColumn";
import { SortableCard } from "./Card";
import { columnId } from "./drag";
import type { Totals } from "./move";

type Props = {
  stage: StageKey;
  deals: Deal[];
  /** The column's figures, from every deal in it (open columns) or the visible ones (Won, Lost). */
  totals: Totals;
  openValue: number;
  lateIds: Set<number>;
  hiddenCount: number;
  closedCaption: string;
  /** Cards in the column beyond the ones shown. */
  notShown: number;
  onShowMore: (stage: StageKey) => void;
  onMove: (deal: Deal, stage: StageKey) => void;
};

/** One stage: a colored header with its figures, "Add deal", and its cards (P1, P3, P4). */
export const Column = memo(function Column({
  stage,
  deals,
  totals,
  openValue,
  lateIds,
  hiddenCount,
  closedCaption,
  notShown,
  onShowMore,
  onMove,
}: Props) {
  const s = stageOf(stage);
  const closed = CLOSED_STAGES.includes(stage);
  const { setNodeRef } = useDroppable({ id: columnId(stage), data: { stage } });
  const share = openValue ? (totals.value / openValue) * 100 : 0;

  return (
    <section aria-label={`${s.label} column`} className="flex min-w-0 flex-col">
      <header
        className="mb-2.5 rounded-[14px] px-3.5 py-3"
        style={{ background: s.fill, color: s.text }}
      >
        <div className="flex items-center justify-between font-semibold">
          <h2 className="text-[14px]">{s.label}</h2>
          <span className="mono text-[12px]" data-testid={`count-${stage}`}>
            {plural(totals.count, "deal")}
          </span>
        </div>
        <div
          className="mt-1.5 text-[20px] font-semibold tracking-[-0.03em]"
          data-testid={`total-${stage}`}
        >
          <Money value={totals.value} />
        </div>
        {closed ? (
          <p className="text-[12px]">{closedCaption}</p>
        ) : (
          <>
            <p className="text-[12px]" data-testid={`expected-${stage}`}>
              Expected <Money value={totals.expected} className="font-semibold" />
            </p>
            <div
              className="mt-2.5 h-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--midnight)_15%,transparent)]"
              style={{ background: s.meterTrack }}
              role="meter"
              aria-label={`${s.label} share of open value`}
              aria-valuenow={Math.round(share)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i className="block h-full rounded-full bg-current" style={{ width: `${share}%` }} />
            </div>
          </>
        )}
      </header>
      <AddDealInColumn stage={stage} />
      <SortableContext
        id={stage}
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="mt-1.5 flex min-h-24 flex-col gap-1.5 pb-4"
          data-testid={`column-${stage}`}
        >
          {deals.map((deal) => (
            <SortableCard key={deal.id} deal={deal} late={lateIds.has(deal.id)} onMove={onMove} />
          ))}
          {notShown > 0 && (
            <button
              type="button"
              className="btn btn-quiet btn-sm self-start"
              onClick={() => onShowMore(stage)}
            >
              Show {Math.min(notShown, 50)} more ({notShown.toLocaleString("en-US")} not shown)
            </button>
          )}
          {closed && hiddenCount > 0 && (
            <p className="px-1 py-2 text-[12px] text-fg-muted">
              {hiddenCount} more closed earlier.{" "}
              <Link
                to={`/deals?filter=${stage}`}
                className="font-semibold text-fg-cerulean hover:underline"
              >
                See in Deals
              </Link>
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
});

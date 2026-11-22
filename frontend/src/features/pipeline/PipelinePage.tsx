import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import type { Deal } from "../../api/types";
import { Money } from "../../components/Money";
import { FilterSelect, PageTitle } from "../../components/PageTitle";
import { isLate, todayISO } from "../../lib/dates";
import { STAGES, type StageKey } from "../../lib/stages";
import { useDeals } from "../deals/api";
import { useMoveDeal } from "./api";
import { CardView } from "./Card";
import { Column } from "./Column";
import {
  announce,
  ARROW_KEYS,
  arrowTarget,
  listsWhileOver,
  planDrop,
  shownIds,
  columnOf,
  type Lists,
} from "./drag";
import { boardTotals, CLOSED_WINDOWS, column, isVisible, totals, type ClosedWindow } from "./move";

/** The board's own copy of the lists during a drag, and the lists it was copied from. */
type DragCopy = { lists: Lists; from: Lists };

const STORAGE_KEY = "accountable.pipeline.closedDeals";

function readWindow(): ClosedWindow {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (CLOSED_WINDOWS.some((w) => w.value === v)) return v as ClosedWindow;
  } catch {
    // Storage can be blocked; the default is fine.
  }
  return "90";
}

function saveWindow(v: ClosedWindow) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // Not remembered, but the board still works.
  }
}

/** Cards shown per column before "Show more", so a huge board stays quick (G7). */
export const CARDS_PER_PAGE = 50;

export function PipelinePage() {
  const deals = useDeals();
  const { mutate: moveDeal } = useMoveDeal();
  const [closedWindow, setClosedWindow] = useState<ClosedWindow>(readWindow);
  const today = todayISO();
  const all = useMemo(() => deals.data ?? [], [deals.data]);
  const byId = useMemo(() => new Map(all.map((d) => [d.id, d])), [all]);

  // Card order per column, from the server's positions, hiding older closed deals.
  const derived = useMemo(() => {
    const lists = {} as Lists;
    for (const s of STAGES)
      lists[s.key] = column(all, s.key)
        .filter((d) => isVisible(d, closedWindow, today))
        .map((d) => d.id);
    return lists;
  }, [all, closedWindow, today]);

  // While dragging, the board shows its own copy of the lists so cards can move between columns.
  // After the drop it keeps showing it until the cache has the moved card (or the move is undone).
  // Every drag starts by setting it, so the later drag handlers can count on it.
  const [dragCopy, setDragCopy] = useState<DragCopy | null>(null);
  const [limits, setLimits] = useState<Partial<Record<StageKey, number>>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const showDragCopy = dragCopy !== null && (activeId !== null || dragCopy.from === derived);
  const lists = showDragCopy ? dragCopy.lists : derived;
  // The drag handlers and announcements read the latest lists without being rebuilt.
  const listsRef = useRef(lists);
  useLayoutEffect(() => {
    listsRef.current = lists;
  }, [lists]);
  const startStage = useRef<StageKey | null>(null);

  /** Arrow keys on the board (P6): the lifted card's top-left corner goes onto its target. */
  const boardKeys = useCallback<KeyboardCoordinateGetter>(
    (event, { context: { active, over, droppableRects } }) => {
      if (!ARROW_KEYS.includes(event.code) || !active) return undefined;
      event.preventDefault();
      const target = arrowTarget(listsRef.current, event.code, over?.id, Number(active.id));
      const rect = target === undefined ? undefined : droppableRects.get(target);
      return rect ? { x: rect.left, y: rect.top } : undefined;
    },
    [],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeys,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const showMore = useCallback(
    (stage: StageKey) =>
      setLimits((l) => ({ ...l, [stage]: (l[stage] ?? CARDS_PER_PAGE) + CARDS_PER_PAGE })),
    [],
  );

  const onMove = useCallback(
    (deal: Deal, stage: StageKey) => moveDeal({ id: deal.id, stage, index: 0 }),
    [moveDeal],
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id));
    startStage.current = columnOf(derived, active.id);
    setDragCopy({ lists: derived, from: derived });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const dragged = active.rect.current.translated;
    const below = !!over && !!dragged && dragged.top > over.rect.top + over.rect.height / 2;
    setDragCopy((prev) => {
      const copy = prev!;
      const lists = listsWhileOver(copy.lists, Number(active.id), over?.id, below);
      return lists === copy.lists ? copy : { ...copy, lists };
    });
  };

  const dropDragCopy = () => {
    setActiveId(null);
    setDragCopy(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id);
    const drop = planDrop(listsRef.current, all, id, over?.id);
    if (!drop) return dropDragCopy();
    // The board keeps the card where it was dropped until the cache has it there too.
    setDragCopy((prev) => ({ ...prev!, lists: { ...prev!.lists, [drop.stage]: drop.list } }));
    moveDeal({ id, stage: drop.stage, index: drop.index });
    setActiveId(null);
  };

  const byIdRef = useRef(byId);
  useLayoutEffect(() => {
    byIdRef.current = byId;
  }, [byId]);
  const announcements = useMemo<Announcements>(() => {
    const nameOf = (id: UniqueIdentifier) => byIdRef.current.get(Number(id))?.name;
    return {
      onDragStart: ({ active }) =>
        announce.pickedUp(listsRef.current, Number(active.id), nameOf(active.id)),
      onDragOver: ({ active, over }) =>
        announce.over(
          listsRef.current,
          Number(active.id),
          over?.id,
          nameOf(active.id),
          startStage.current,
        ),
      onDragEnd: ({ active, over }) =>
        announce.dropped(listsRef.current, over?.id, nameOf(active.id)),
      onDragCancel: ({ active }) => announce.cancelled(nameOf(active.id), startStage.current),
    };
  }, []);

  // Per column: the cards shown and the figures counted, rebuilt only when they change.
  const columns = useMemo(
    () =>
      STAGES.map((s) => {
        const closed = s.key === "won" || s.key === "lost";
        const everyDeal = column(all, s.key);
        const ids = shownIds(lists[s.key], limits[s.key] ?? CARDS_PER_PAGE, activeId);
        return {
          stage: s.key,
          cards: ids.map((id) => byId.get(id)!).filter(Boolean),
          notShown: lists[s.key].length - ids.length,
          // Figures come from the cached list, so they change the moment a card drops (P3).
          totals: totals(closed ? derived[s.key].map((id) => byId.get(id)!) : everyDeal),
          hidden: closed ? everyDeal.length - derived[s.key].length : 0,
        };
      }),
    [all, lists, derived, byId, limits, activeId],
  );
  const board = boardTotals(all, today);
  const lateIds = useMemo(
    () => new Set(all.filter((d) => isLate(d, today)).map((d) => d.id)),
    [all, today],
  );
  const caption = CLOSED_WINDOWS.find((w) => w.value === closedWindow)!.caption;
  const active = activeId !== null ? byId.get(activeId) : undefined;

  return (
    <>
      <PageTitle title="Pipeline" hidden />
      <div className="mb-4 flex items-center gap-3">
        <div
          className="panel flex items-center gap-1.5 p-1.5"
          aria-label="Open pipeline"
          role="group"
        >
          <Figure label="Open value (USD)" dark testId="board-open-value">
            <Money value={board.value} />
          </Figure>
          <Figure label="Expected revenue (USD)" testId="board-expected">
            <Money value={board.expected} />
          </Figure>
          <Figure label="Open deals" testId="board-open-count">
            <span className="mono">{board.count}</span>
          </Figure>
          <Figure label="Late" testId="board-late">
            <span className="mono text-raspberry-ink">{board.late}</span>
          </Figure>
        </div>
        <div className="ml-auto">
          <FilterSelect
            label="Closed deals:"
            onPage
            value={closedWindow}
            onChange={(v) => {
              setClosedWindow(v);
              saveWindow(v);
            }}
            options={CLOSED_WINDOWS}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={dropDragCopy}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "To move this deal, press Space to pick it up. Use the arrow keys to move it within its column or to another column, press Space again to drop it, or Escape to cancel. Press Enter to open the deal.",
          },
        }}
      >
        <div className="-mx-1 overflow-x-auto px-1 pt-1" data-testid="board">
          <div className="grid min-w-[1180px] grid-cols-[repeat(4,minmax(200px,1fr))_repeat(2,minmax(170px,0.85fr))] items-start gap-3">
            {columns.map((c) => (
              <Column
                key={c.stage}
                stage={c.stage}
                deals={c.cards}
                totals={c.totals}
                openValue={board.value}
                lateIds={lateIds}
                hiddenCount={c.hidden}
                notShown={c.notShown}
                onShowMore={showMore}
                closedCaption={caption}
                onMove={onMove}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          {active ? (
            <div className="rotate-[1.5deg] cursor-grabbing">
              <CardView deal={active} late={lateIds.has(active.id)} lifted />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function Figure({
  label,
  dark = false,
  testId,
  children,
}: {
  label: string;
  dark?: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-[10px] px-3.5 py-1.5 ${dark ? "bg-ink text-white" : ""}`}>
      <span
        className={`block text-[11.5px] font-medium ${dark ? "text-sea-mist" : "text-ink-muted"}`}
      >
        {label}
      </span>
      <b className="text-[17px] font-semibold" data-testid={testId}>
        {children}
      </b>
    </div>
  );
}

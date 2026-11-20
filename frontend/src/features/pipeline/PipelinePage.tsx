import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { arrayMove } from "@dnd-kit/sortable";
import type { Deal } from "../../api/types";
import { Money } from "../../components/Money";
import { FilterSelect, PageTitle } from "../../components/PageTitle";
import { isLate, todayISO } from "../../lib/dates";
import { STAGES, stageLabel, type StageKey } from "../../lib/stages";
import { useDeals } from "../deals/api";
import { useMoveDeal } from "./api";
import { CardView } from "./Card";
import { Column } from "./Column";
import { boardTotals, CLOSED_WINDOWS, column, fullIndex, isVisible, totals, type ClosedWindow } from "./move";

type Lists = Record<StageKey, number[]>;

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

const isColumnId = (id: UniqueIdentifier) => typeof id === "string" && id.startsWith("column:");

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
    for (const s of STAGES) lists[s.key] = column(all, s.key).filter((d) => isVisible(d, closedWindow, today)).map((d) => d.id);
    return lists;
  }, [all, closedWindow, today]);

  // While dragging, the board shows its own copy of the lists so cards can move between columns.
  const [dragLists, setDragLists] = useState<Lists | null>(null);
  const [limits, setLimits] = useState<Partial<Record<StageKey, number>>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const lists = dragLists ?? derived;
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const startStage = useRef<StageKey | null>(null);

  // Once the cache has the moved card (or the move is undone), drop the drag copy.
  useEffect(() => {
    if (activeId === null) setDragLists(null);
  }, [all, activeId]);

  const findStage = useCallback((id: UniqueIdentifier | undefined, from: Lists = listsRef.current): StageKey | null => {
    if (id === undefined) return null;
    if (isColumnId(id)) return String(id).slice(7) as StageKey;
    return (STAGES.find((s) => from[s.key].includes(Number(id)))?.key ?? null) as StageKey | null;
  }, []);

  /**
   * Arrow keys on the board (P6): Up and Down step through the cards in the column,
   * Left and Right go to the same place in the next column. Returns where the lifted
   * card's top-left corner should go: onto the card (or empty column) it moves to.
   */
  const boardKeys = useCallback<KeyboardCoordinateGetter>(
    (event, { context: { active, over, droppableRects } }) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!keys.includes(event.code) || !active) return undefined;
      event.preventDefault();
      const at = over?.id ?? active.id;
      const stage = findStage(at);
      if (!stage) return undefined;
      const list = listsRef.current[stage];
      const index = isColumnId(at) ? list.length : list.indexOf(Number(at));
      let target: UniqueIdentifier | undefined;
      if (event.code === "ArrowDown") target = list[index + 1];
      else if (event.code === "ArrowUp") target = index > 0 ? list[index - 1] : undefined;
      else {
        const next = STAGES[STAGES.findIndex((s) => s.key === stage) + (event.code === "ArrowRight" ? 1 : -1)];
        if (!next) return undefined;
        const others = listsRef.current[next.key].filter((id) => id !== Number(active.id));
        target = others.length ? others[Math.min(index, others.length - 1)] : `column:${next.key}`;
      }
      const rect = target !== undefined ? droppableRects.get(target) : undefined;
      return rect ? { x: rect.left, y: rect.top } : undefined;
    },
    [findStage],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeys,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const showMore = useCallback(
    (stage: StageKey) => setLimits((l) => ({ ...l, [stage]: (l[stage] ?? CARDS_PER_PAGE) + CARDS_PER_PAGE })),
    [],
  );

  const onMove = useCallback(
    (deal: Deal, stage: StageKey) => moveDeal({ id: deal.id, stage, index: 0 }),
    [moveDeal],
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(Number(active.id));
    startStage.current = findStage(active.id, derived);
    setDragLists(derived);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const from = findStage(active.id);
    const to = findStage(over?.id);
    if (!from || !to || from === to || !over) return;
    setDragLists((prev) => {
      const current = prev ?? derived;
      const target = current[to].filter((id) => id !== Number(active.id));
      let index = target.length;
      if (!isColumnId(over.id)) {
        const overIndex = target.indexOf(Number(over.id));
        const below =
          active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex < 0 ? target.length : overIndex + (below ? 1 : 0);
      }
      target.splice(index, 0, Number(active.id));
      return { ...current, [from]: current[from].filter((id) => id !== Number(active.id)), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id);
    const to = findStage(over?.id);
    const deal = byId.get(id);
    if (!over || !to || !deal) {
      setActiveId(null);
      return;
    }
    let list = listsRef.current[to];
    const from = list.indexOf(id);
    const overIndex = isColumnId(over.id) ? list.length - 1 : list.indexOf(Number(over.id));
    if (from >= 0 && overIndex >= 0 && from !== overIndex) list = arrayMove(list, from, overIndex);
    setDragLists((prev) => ({ ...(prev ?? derived), [to]: list }));

    // Place it in the whole column, between the same cards the user saw (hidden closed deals included).
    const columnIds = column(all, to).map((d) => d.id).filter((x) => x !== id);
    const index = fullIndex(columnIds, list.filter((x) => x !== id), list.indexOf(id));
    const unchanged = deal.stage === to && column(all, to).findIndex((d) => d.id === id) === index;
    if (!unchanged) moveDeal({ id, stage: to, index });
    setActiveId(null);
  };

  const onDragCancel = () => {
    setActiveId(null);
    setDragLists(null);
  };

  const byIdRef = useRef(byId);
  byIdRef.current = byId;
  const announcements = useMemo<Announcements>(() => {
    const byId = { get: (id: number) => byIdRef.current.get(id) };
    return {
    onDragStart: ({ active }) => {
      const stage = findStage(active.id);
      const list = stage ? listsRef.current[stage] : [];
      return `Picked up ${byId.get(Number(active.id))?.name}. ${stage ? stageLabel(stage) : ""}, position ${list.indexOf(Number(active.id)) + 1} of ${list.length}.`;
    },
    onDragOver: ({ active, over }) => {
      // Over itself where it started: keep the "Picked up" message.
      if (over?.id === active.id && findStage(active.id) === startStage.current) return undefined;
      const name = byId.get(Number(active.id))?.name;
      const stage = findStage(over?.id);
      if (!stage) return `${name} is not over a column.`;
      const list = listsRef.current[stage];
      const position = isColumnId(over!.id) ? list.length : list.indexOf(Number(over!.id)) + 1;
      return `${name} is over ${stageLabel(stage)}, position ${Math.max(position, 1)} of ${list.length}.`;
    },
    onDragEnd: ({ active, over }) => {
      const name = byId.get(Number(active.id))?.name;
      const stage = findStage(over?.id);
      return stage ? `Dropped ${name} in ${stageLabel(stage)}.` : `${name} was dropped outside the board and went back.`;
    },
    onDragCancel: ({ active }) =>
      `Cancelled. ${byId.get(Number(active.id))?.name} went back to ${startStage.current ? stageLabel(startStage.current) : "its column"}.`,
    };
  }, [findStage]);

  // Per column: the cards shown and the figures counted, rebuilt only when they change.
  const columns = useMemo(
    () =>
      STAGES.map((s) => {
        const closed = s.key === "won" || s.key === "lost";
        const everyDeal = column(all, s.key);
        const limit = limits[s.key] ?? CARDS_PER_PAGE;
        const ids = lists[s.key].slice(0, limit);
        if (activeId !== null && lists[s.key].includes(activeId) && !ids.includes(activeId)) ids.push(activeId);
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
  const lateIds = useMemo(() => new Set(all.filter((d) => isLate(d, today)).map((d) => d.id)), [all, today]);
  const caption = CLOSED_WINDOWS.find((w) => w.value === closedWindow)!.caption;
  const active = activeId !== null ? byId.get(activeId) : undefined;

  return (
    <>
      <PageTitle title="Pipeline" hidden />
      <div className="mb-4 flex items-center gap-3">
        <div className="panel flex items-center gap-1.5 p-1.5" aria-label="Open pipeline" role="group">
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
        onDragCancel={onDragCancel}
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

function Figure({ label, dark = false, testId, children }: { label: string; dark?: boolean; testId: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[10px] px-3.5 py-1.5 ${dark ? "bg-ink text-white" : ""}`}>
      <span className={`block text-[11.5px] font-medium ${dark ? "text-sea-mist" : "text-ink-muted"}`}>{label}</span>
      <b className="text-[17px] font-semibold" data-testid={testId}>
        {children}
      </b>
    </div>
  );
}

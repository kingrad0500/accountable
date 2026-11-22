// The board's drag logic as plain functions: which column an id is in, where an arrow key
// sends a lifted card, the lists while dragging, what a drop does, and what screen readers
// hear. PipelinePage wires them to dnd-kit (P2, P6).
import type { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Deal } from "../../api/types";
import { STAGES, stageLabel, type StageKey } from "../../lib/stages";
import { column, fullIndex } from "./move";

/** Card ids per column, in the order the board shows them. */
export type Lists = Record<StageKey, number[]>;

const COLUMN_PREFIX = "column:";

/** A column's own droppable id, used when a card is over an empty part of the column. */
export const columnId = (stage: StageKey) => `${COLUMN_PREFIX}${stage}`;

const isColumnId = (id: UniqueIdentifier | undefined): id is string =>
  typeof id === "string" && id.startsWith(COLUMN_PREFIX);

/** The column a card id or column id belongs to; null when it's in none (outside the board). */
export function columnOf(lists: Lists, id: UniqueIdentifier | undefined): StageKey | null {
  if (isColumnId(id)) return id.slice(COLUMN_PREFIX.length) as StageKey;
  return STAGES.find((s) => lists[s.key].includes(Number(id)))?.key ?? null;
}

export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Where an arrow key sends the lifted card, from the card or column it's over (or from itself
 * when it's over nothing): Up and Down step through the column, Left and Right go to the same
 * place in the next column, or onto it when it's empty. Undefined when it can't go that way.
 */
export function arrowTarget(
  lists: Lists,
  key: string,
  overId: UniqueIdentifier | undefined,
  activeId: number,
): UniqueIdentifier | undefined {
  const at = overId ?? activeId;
  const stage = columnOf(lists, at);
  if (!stage) return undefined;
  const list = lists[stage];
  const index = isColumnId(at) ? list.length : list.indexOf(Number(at));
  if (key === "ArrowDown") return list[index + 1];
  if (key === "ArrowUp") return index > 0 ? list[index - 1] : undefined;
  const step = key === "ArrowRight" ? 1 : -1;
  const next = STAGES[STAGES.findIndex((s) => s.key === stage) + step];
  if (!next) return undefined;
  const others = lists[next.key].filter((id) => id !== activeId);
  return others.length ? others[Math.min(index, others.length - 1)] : columnId(next.key);
}

/**
 * The lists once the dragged card is over another column: taken out of its column and put
 * before the card it's over (after it when `below`), or at the end when over the column.
 * The same lists when it's still in its own column or outside the board.
 */
export function listsWhileOver(
  lists: Lists,
  activeId: number,
  overId: UniqueIdentifier | undefined,
  below: boolean,
): Lists {
  const from = columnOf(lists, activeId);
  const to = columnOf(lists, overId);
  if (!from || !to || from === to) return lists;
  const target = lists[to].filter((id) => id !== activeId);
  const overIndex = isColumnId(overId) ? -1 : target.indexOf(Number(overId));
  target.splice(overIndex < 0 ? target.length : overIndex + (below ? 1 : 0), 0, activeId);
  return { ...lists, [from]: lists[from].filter((id) => id !== activeId), [to]: target };
}

export type Drop = { stage: StageKey; list: number[]; index: number };

/**
 * What dropping the card does: the column it lands in, that column's ids as the board shows
 * them, and its index among every deal in the column (hidden closed deals included). Null
 * when it lands outside the board or back where it started.
 */
export function planDrop(
  lists: Lists,
  deals: Deal[],
  id: number,
  overId: UniqueIdentifier | undefined,
): Drop | null {
  const stage = columnOf(lists, overId);
  const deal = deals.find((d) => d.id === id);
  if (!stage || !deal) return null;
  let list = lists[stage];
  const from = list.indexOf(id);
  const to = isColumnId(overId) ? list.length - 1 : list.indexOf(Number(overId));
  if (from >= 0 && to >= 0 && from !== to) list = arrayMove(list, from, to);

  // Place it in the whole column, between the same cards the user saw.
  const columnIds = column(deals, stage).map((d) => d.id);
  const index = fullIndex(
    columnIds.filter((x) => x !== id),
    list.filter((x) => x !== id),
    list.indexOf(id),
  );
  const unchanged = deal.stage === stage && columnIds.indexOf(id) === index;
  return unchanged ? null : { stage, list, index };
}

/** The ids a column shows: the first `limit`, plus the dragged card wherever it is. */
export function shownIds(list: number[], limit: number, activeId: number | null): number[] {
  const ids = list.slice(0, limit);
  if (activeId !== null && list.includes(activeId) && !ids.includes(activeId)) ids.push(activeId);
  return ids;
}

/** What screen readers hear during a drag (P6). */
export const announce = {
  pickedUp(lists: Lists, id: number, name: string | undefined) {
    const stage = columnOf(lists, id);
    if (!stage) return `Picked up ${name}.`;
    const list = lists[stage];
    return `Picked up ${name}. ${stageLabel(stage)}, position ${list.indexOf(id) + 1} of ${list.length}.`;
  },

  /** Undefined while it's over itself in the column it started in, to keep "Picked up". */
  over(
    lists: Lists,
    id: number,
    overId: UniqueIdentifier | undefined,
    name: string | undefined,
    startStage: StageKey | null,
  ) {
    if (overId === id && columnOf(lists, id) === startStage) return undefined;
    const stage = columnOf(lists, overId);
    if (!stage) return `${name} is not over a column.`;
    const list = lists[stage];
    const position = isColumnId(overId) ? list.length : list.indexOf(Number(overId)) + 1;
    return `${name} is over ${stageLabel(stage)}, position ${Math.max(position, 1)} of ${list.length}.`;
  },

  dropped(lists: Lists, overId: UniqueIdentifier | undefined, name: string | undefined) {
    const stage = columnOf(lists, overId);
    return stage
      ? `Dropped ${name} in ${stageLabel(stage)}.`
      : `${name} was dropped outside the board and went back.`;
  },

  cancelled(name: string | undefined, startStage: StageKey | null) {
    return `Cancelled. ${name} went back to ${startStage ? stageLabel(startStage) : "its column"}.`;
  },
};

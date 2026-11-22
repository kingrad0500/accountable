import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";

/** How the shared table lays out and searches a column. */
export type ColumnLayout = {
  /** CSS grid track, such as "2fr" or "120px". */
  width?: string;
  align?: "right";
  /** Leave this column out of the search (T1). */
  search?: false;
};

/** A column for the shared table; its `meta` is the column's layout. */
export type TableColumn<T> = ColumnDef<T, unknown> & { meta?: ColumnLayout };

function layoutOf<T>(column: Column<T, unknown>): ColumnLayout {
  return (column.columnDef.meta ?? {}) as ColumnLayout;
}

/** Matches any searchable column's text, ignoring case (T1). */
const containsText: FilterFn<unknown> = (row, columnId, query: string) => {
  const value = row.getValue(columnId);
  return value != null && String(value).toLowerCase().includes(query.toLowerCase());
};

export const SEARCH_DELAY_MS = 150;
const ROW_HEIGHT = 48;

type Props<T> = {
  data: T[];
  columns: TableColumn<T>[];
  /** Plural noun for the count line and messages, such as "contacts". */
  noun: string;
  /** All records, before any filter, for "Showing 12 of 40 contacts" (T6). */
  totalCount: number;
  getRowId: (row: T) => string;
  addLabel: string;
  onAdd: () => void;
  /** Filters shown in the toolbar (C2, DL1a). */
  filters?: ReactNode;
  filterActive?: boolean;
  initialSort?: SortingState;
  /** Height of the scrolling body; the page itself doesn't scroll. */
  height?: string;
};

/**
 * The shared table: search, sortable headings, count line, empty search and
 * virtualized rows, so a few thousand rows stay smooth (T1 to T7).
 */
export function DataTable<T>({
  data,
  columns,
  noun,
  totalCount,
  getRowId,
  addLabel,
  onAdd,
  filters,
  filterActive = false,
  initialSort = [{ id: "name", desc: false }],
  height = "calc(100vh - 296px)",
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: search, sorting },
    onSortingChange: setSorting,
    getRowId,
    globalFilterFn: containsText as FilterFn<T>,
    getColumnCanGlobalFilter: (column) => layoutOf(column).search !== false && !!column.accessorFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    initialRect: { width: 1200, height: 720 },
  });

  const template = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((c) => layoutOf(c).width ?? "1fr")
        .join(" "),
    [table],
  );

  const clearSearch = () => {
    setQuery("");
    setSearch("");
    searchRef.current?.focus();
  };

  return (
    <div className="panel flex flex-col">
      <div className="flex items-center gap-3 p-3 pl-4">
        <label className="flex h-9 w-80 items-center gap-2 rounded-[10px] bg-page px-3 text-fg-muted focus-within:outline-2 focus-within:outline-cerulean">
          <Search size={16} aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}`}
            aria-label={`Search ${noun}`}
            className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        {filters}
        <button type="button" className="btn btn-primary ml-auto" onClick={onAdd}>
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          {addLabel}
        </button>
      </div>

      <div
        role="table"
        aria-label={noun[0].toUpperCase() + noun.slice(1)}
        aria-rowcount={rows.length + 1}
        ref={scrollRef}
        className="relative overflow-auto px-2"
        style={{ height, minHeight: 280 }}
      >
        <div role="rowgroup" className="sticky top-0 z-10 bg-surface">
          <div
            role="row"
            aria-rowindex={1}
            className="grid items-center gap-3 px-3"
            style={{ gridTemplateColumns: template, height: 40 }}
          >
            {table.getHeaderGroups()[0].headers.map((header) => {
              const sorted = header.column.getIsSorted();
              const right = layoutOf(header.column).align === "right";
              const label = flexRender(header.column.columnDef.header, header.getContext());
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  aria-sort={
                    sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : header.column.getCanSort()
                          ? "none"
                          : undefined
                  }
                  className={`text-[13px] font-medium text-fg-muted ${right ? "text-right" : ""}`}
                >
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={`inline-flex items-center gap-1 rounded-md hover:text-fg ${right ? "flex-row-reverse" : ""} ${sorted ? "text-fg" : ""}`}
                    >
                      {label}
                      {sorted === "asc" ? (
                        <ArrowUp size={13} aria-hidden />
                      ) : sorted === "desc" ? (
                        <ArrowDown size={13} aria-hidden />
                      ) : (
                        <ChevronsUpDown size={13} className="opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    label
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center" role="row">
            <p role="cell" className="muted">
              {search
                ? `No ${noun} match "${search}"`
                : filterActive
                  ? `No ${noun} match this filter`
                  : `No ${noun} yet`}
            </p>
            {search && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={clearSearch}>
                <X size={14} aria-hidden /> Clear search
              </button>
            )}
          </div>
        ) : (
          <div role="rowgroup" className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={item.index + 2}
                  data-testid="table-row"
                  className="group absolute left-0 grid w-full items-center gap-3 rounded-[10px] px-3 text-[14px] shadow-[0_-1px_0_var(--tint)] hover:bg-tint/60 focus-within:bg-tint/60"
                  style={{
                    gridTemplateColumns: template,
                    height: ROW_HEIGHT,
                    transform: `translateY(${item.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      role="cell"
                      className={`min-w-0 truncate ${layoutOf(cell.column).align === "right" ? "text-right" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="muted px-5 py-3 text-[13px]" aria-live="polite">
        Showing {rows.length.toLocaleString("en-US")} of {totalCount.toLocaleString("en-US")} {noun}
      </p>
    </div>
  );
}

/** Edit and Delete icon buttons for a row; shown on hover and on focus (T4). */
export function RowActions({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
      <button type="button" className="icon-btn" aria-label={`Edit ${name}`} onClick={onEdit}>
        <Pencil size={15} aria-hidden />
      </button>
      <button
        type="button"
        className="icon-btn danger"
        aria-label={`Delete ${name}`}
        onClick={onDelete}
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </span>
  );
}

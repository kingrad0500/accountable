import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { Deal } from "../../api/types";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { DataTable, RowActions } from "../../components/DataTable";
import { Money } from "../../components/Money";
import { FilterSelect, PageTitle } from "../../components/PageTitle";
import { Pill } from "../../components/Pill";
import { todayISO, isLate } from "../../lib/dates";
import { formatDate } from "../../lib/format";
import { STAGES, STAGE_KEYS, isOpenStage, type StageKey } from "../../lib/stages";
import { useDeals, useDeleteDeal } from "./api";
import { DealFormDialog } from "./DealForm";

type DealFilter = "all" | "open" | "late" | "no-org" | StageKey;

/** The Deals filter: all stages, each stage, Open, Late and No organization (DL1a). */
export function dealMatches(filter: DealFilter, deal: Deal, today: string): boolean {
  if (filter === "all") return true;
  if (filter === "open") return isOpenStage(deal.stage);
  if (filter === "late") return isLate(deal, today);
  if (filter === "no-org") return deal.organization_id === null;
  return deal.stage === filter;
}

const FILTERS: { value: DealFilter; label: string }[] = [
  { value: "all", label: "All stages" },
  { value: "open", label: "Open" },
  { value: "late", label: "Late" },
  ...STAGES.map((s) => ({ value: s.key as DealFilter, label: s.label })),
  { value: "no-org", label: "No organization" },
];

export function DealsPage() {
  const deals = useDeals();
  const remove = useDeleteDeal();
  const [params, setParams] = useSearchParams();
  const filterParam = params.get("filter") as DealFilter | null;
  const filter: DealFilter = filterParam && FILTERS.some((f) => f.value === filterParam) ? filterParam : "all";
  const [editing, setEditing] = useState<Deal | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const today = todayISO();

  const all = deals.data ?? [];
  const visible = useMemo(() => all.filter((d) => dealMatches(filter, d, today)), [all, filter, today]);
  const options = FILTERS.map((f) => ({ ...f, count: all.filter((d) => dealMatches(f.value, d, today)).length }));

  const columns = useMemo<ColumnDef<Deal, any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        meta: { width: "minmax(200px, 2fr)" },
        cell: ({ row }) => (
          <Link to={`/deals/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "organization",
        accessorFn: (d) => d.organization_name ?? undefined,
        header: "Organization",
        sortUndefined: "last",
        meta: { width: "minmax(150px, 1.4fr)" },
        cell: ({ row }) =>
          row.original.organization_id ? (
            <Link to={`/organizations/${row.original.organization_id}`} className="hover:underline">
              {row.original.organization_name}
            </Link>
          ) : (
            <span className="muted italic">No organization</span>
          ),
      },
      {
        id: "contact",
        accessorFn: (d) => d.main_contact_name ?? undefined,
        header: "Main contact",
        sortUndefined: "last",
        meta: { width: "minmax(130px, 1.2fr)" },
        cell: ({ row }) =>
          row.original.main_contact_id ? (
            <Link to={`/contacts/${row.original.main_contact_id}`} className="hover:underline">
              {row.original.main_contact_name}
            </Link>
          ) : (
            <span className="muted">None</span>
          ),
      },
      {
        id: "stage",
        accessorFn: (d) => STAGES.find((s) => s.key === d.stage)!.label,
        header: "Stage",
        sortingFn: (a, b) => STAGE_KEYS.indexOf(a.original.stage) - STAGE_KEYS.indexOf(b.original.stage),
        meta: { width: "112px" },
        cell: ({ row }) => <Pill kind="stage" value={row.original.stage} />,
      },
      {
        id: "value",
        accessorKey: "value",
        header: "Value (USD)",
        meta: { width: "116px", align: "right" },
        cell: ({ getValue }) => <Money value={getValue()} />,
      },
      {
        id: "probability",
        accessorKey: "probability",
        header: "Probability",
        meta: { width: "96px", align: "right", search: false },
        cell: ({ getValue }) => <span className="mono">{getValue()}%</span>,
      },
      {
        id: "expected",
        accessorFn: (d) => (d.value * d.probability) / 100,
        header: "Expected (USD)",
        meta: { width: "124px", align: "right", search: false },
        cell: ({ getValue }) => <Money value={getValue()} />,
      },
      {
        id: "close_date",
        accessorFn: (d) => d.close_date ?? undefined,
        header: "Close date",
        sortUndefined: "last",
        meta: { width: "160px", search: false },
        cell: ({ row }) =>
          row.original.close_date ? (
            <span className="flex items-center gap-2">
              <span className={`mono text-[13px] ${isLate(row.original, today) ? "font-semibold text-raspberry-ink" : ""}`}>
                {formatDate(row.original.close_date)}
              </span>
              {isLate(row.original, today) && <Pill kind="late" />}
            </span>
          ) : (
            <span className="muted">None</span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        meta: { width: "72px" },
        cell: ({ row }) => (
          <RowActions
            name={row.original.name}
            onEdit={() => setEditing(row.original)}
            onDelete={() => setDeleting({ kind: "deal", id: row.original.id, name: row.original.name })}
          />
        ),
      },
    ],
    [today],
  );

  return (
    <>
      <PageTitle title="Deals" />
      <DataTable
        data={visible}
        columns={columns}
        noun="deals"
        totalCount={all.length}
        getRowId={(d) => String(d.id)}
        addLabel="Add deal"
        onAdd={() => setEditing(null)}
        filterActive={filter !== "all"}
        filters={
          <FilterSelect
            label="Show"
            value={filter}
            onChange={(v) => setParams(v === "all" ? {} : { filter: v }, { replace: true })}
            options={options}
          />
        }
      />
      <DealFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} deal={editing} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() => remove.mutateAsync(deleting!.id).then(() => toast.success("Deal deleted"))}
      />
    </>
  );
}

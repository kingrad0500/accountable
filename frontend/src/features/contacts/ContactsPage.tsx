import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import type { Contact } from "../../api/types";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { DataTable, RowActions } from "../../components/DataTable";
import { FilterSelect, PageTitle } from "../../components/PageTitle";
import { Pill } from "../../components/Pill";
import { STATUSES, type StatusKey } from "../../lib/stages";
import { useContacts, useDeleteContact } from "./api";
import { ContactFormDialog } from "./ContactForm";

type StatusFilter = "all" | StatusKey;

export function ContactsPage() {
  const contacts = useContacts();
  const remove = useDeleteContact();
  const [params, setParams] = useSearchParams();
  const param = params.get("status");
  const status: StatusFilter = STATUSES.some((s) => s.key === param) ? (param as StatusKey) : "all";
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  const all = contacts.data ?? [];
  const visible = useMemo(() => (status === "all" ? all : all.filter((c) => c.status === status)), [all, status]);
  // The status filter, with each status's count (C2).
  const options = [
    { value: "all" as StatusFilter, label: "All", count: all.length },
    ...STATUSES.map((s) => ({ value: s.key as StatusFilter, label: s.label, count: all.filter((c) => c.status === s.key).length })),
  ];

  const columns = useMemo<ColumnDef<Contact, any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        meta: { width: "minmax(180px, 1.6fr)" },
        cell: ({ row }) => (
          <Link to={`/contacts/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "organization",
        accessorFn: (c) => c.organization_name ?? undefined,
        header: "Organization",
        sortUndefined: "last",
        meta: { width: "minmax(150px, 1.4fr)" },
        cell: ({ row }) =>
          row.original.organization_id ? (
            <Link to={`/organizations/${row.original.organization_id}`} className="hover:underline">
              {row.original.organization_name}
            </Link>
          ) : (
            <span className="muted">None</span>
          ),
      },
      { id: "job_title", accessorFn: (c) => c.job_title ?? undefined, header: "Job title", sortUndefined: "last", meta: { width: "minmax(140px, 1.3fr)" } },
      {
        id: "email",
        accessorFn: (c) => c.email ?? undefined,
        header: "Email",
        sortUndefined: "last",
        meta: { width: "minmax(180px, 1.6fr)" },
        cell: ({ getValue }) =>
          getValue() ? (
            <a href={`mailto:${getValue()}`} className="text-cerulean-ink hover:underline">
              {getValue()}
            </a>
          ) : null,
      },
      { id: "phone", accessorFn: (c) => c.phone ?? undefined, header: "Phone", sortUndefined: "last", meta: { width: "140px" }, cell: ({ getValue }) => <span className="mono text-[13px]">{getValue()}</span> },
      {
        id: "status",
        accessorFn: (c) => STATUSES.find((s) => s.key === c.status)!.label,
        header: "Status",
        sortingFn: (a, b) => STATUSES.findIndex((s) => s.key === a.original.status) - STATUSES.findIndex((s) => s.key === b.original.status),
        meta: { width: "104px" },
        cell: ({ row }) => <Pill kind="status" value={row.original.status} />,
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
            onDelete={() => setDeleting({ kind: "contact", id: row.original.id, name: row.original.name })}
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageTitle title="Contacts" />
      <DataTable
        data={visible}
        columns={columns}
        noun="contacts"
        totalCount={all.length}
        getRowId={(c) => String(c.id)}
        addLabel="Add contact"
        onAdd={() => setEditing(null)}
        filterActive={status !== "all"}
        filters={
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => setParams(v === "all" ? {} : { status: v }, { replace: true })}
            options={options}
          />
        }
      />
      <ContactFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} contact={editing} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() => remove.mutateAsync(deleting!.id).then(() => toast.success("Contact deleted"))}
      />
    </>
  );
}

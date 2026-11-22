import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { Organization } from "../../api/types";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { DataTable, RowActions, type TableColumn } from "../../components/DataTable";
import { Money } from "../../components/Money";
import { PageTitle } from "../../components/PageTitle";
import { useDeleteOrganization, useOrganizations } from "./api";
import { OrganizationFormDialog } from "./OrganizationForm";

export function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export function OrganizationsPage() {
  const organizations = useOrganizations();
  const remove = useDeleteOrganization();
  const [editing, setEditing] = useState<Organization | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const all = organizations.data ?? [];

  const columns = useMemo<TableColumn<Organization>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        meta: { width: "minmax(200px, 2fr)" },
        cell: ({ row }) => (
          <Link to={`/organizations/${row.original.id}`} className="font-semibold hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "industry",
        accessorFn: (o) => o.industry ?? undefined,
        header: "Industry",
        sortUndefined: "last",
        meta: { width: "minmax(120px, 1fr)" },
      },
      {
        id: "website",
        accessorFn: (o) => o.website ?? undefined,
        header: "Website",
        sortUndefined: "last",
        meta: { width: "minmax(160px, 1.3fr)" },
        cell: ({ row }) =>
          row.original.website ? (
            <a
              href={websiteHref(row.original.website)}
              target="_blank"
              rel="noreferrer"
              className="text-fg-cerulean hover:underline"
            >
              {row.original.website}
            </a>
          ) : null,
      },
      {
        id: "contacts",
        accessorKey: "contact_count",
        header: "Contacts",
        meta: { width: "96px", align: "right", search: false },
        cell: ({ row }) => <span className="mono">{row.original.contact_count}</span>,
      },
      {
        id: "open_deals",
        accessorKey: "open_deal_count",
        header: "Open deals",
        meta: { width: "104px", align: "right", search: false },
        cell: ({ row }) => <span className="mono">{row.original.open_deal_count}</span>,
      },
      {
        id: "open_value",
        accessorKey: "open_value",
        header: "Open value (USD)",
        meta: { width: "140px", align: "right", search: false },
        cell: ({ row }) => <Money value={row.original.open_value} />,
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
            onDelete={() =>
              setDeleting({ kind: "organization", id: row.original.id, name: row.original.name })
            }
          />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageTitle title="Organizations" />
      <DataTable
        data={all}
        columns={columns}
        noun="organizations"
        totalCount={all.length}
        getRowId={(o) => String(o.id)}
        addLabel="Add organization"
        onAdd={() => setEditing(null)}
      />
      <OrganizationFormDialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        organization={editing}
      />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() =>
          remove.mutateAsync(deleting!.id).then(() => toast.success("Organization deleted"))
        }
      />
    </>
  );
}

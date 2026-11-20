import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { DealList } from "../../components/DealList";
import { Money } from "../../components/Money";
import { Pill } from "../../components/Pill";
import { LinkedPanel, LinkedRow, Loading, RecordHeader, RecordMissing } from "../../components/RecordPage";
import { Timeline } from "../activities/Timeline";
import { ContactFormDialog } from "../contacts/ContactForm";
import { DealFormDialog } from "../deals/DealForm";
import { useDeleteOrganization, useOrganization } from "./api";
import { OrganizationFormDialog } from "./OrganizationForm";
import { websiteHref } from "./OrganizationsPage";

const BACK = { to: "/organizations", label: "Organizations" };

/** An organization: details, its contacts and deals, and one timeline for all of them (O2). */
export function OrganizationPage() {
  const id = Number(useParams().id);
  const org = useOrganization(id);
  const remove = useDeleteOrganization();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<"contact" | "deal" | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  if (org.isPending) return <Loading />;
  if (!org.data) return <RecordMissing what="organization" back={BACK} />;
  const o = org.data;

  return (
    <>
      <RecordHeader
        kind="Organization"
        back={BACK}
        title={o.name}
        badges={o.industry ? <span className="pill bg-tint">{o.industry}</span> : null}
        facts={[
          {
            label: "Website",
            value: o.website ? (
              <a href={websiteHref(o.website)} target="_blank" rel="noreferrer" className="text-cerulean-ink hover:underline">
                {o.website}
              </a>
            ) : null,
          },
          { label: "Contacts", value: <span className="mono">{o.contact_count}</span> },
          { label: "Open deals", value: <span className="mono">{o.open_deal_count}</span> },
          { label: "Open value (USD)", value: <Money value={o.open_value} /> },
        ]}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting({ kind: "organization", id: o.id, name: o.name })}
      >
        {o.notes && <p className="mt-4 max-w-3xl text-[13.5px] whitespace-pre-line text-ink-muted">{o.notes}</p>}
      </RecordHeader>
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-[18px]">
        <Timeline entries={o.timeline} hereKind="organization" />
        <div className="flex flex-col gap-[18px]">
          <LinkedPanel
            title="Contacts"
            count={o.contacts.length}
            action={
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding("contact")}>
                <Plus size={14} aria-hidden /> Add contact
              </button>
            }
          >
            {o.contacts.length ? (
              <ul>
                {o.contacts.map((c) => (
                  <LinkedRow
                    key={c.id}
                    to={`/contacts/${c.id}`}
                    title={c.name}
                    sub={c.job_title}
                    right={<Pill kind="status" value={c.status} className="!text-[11px]" />}
                  />
                ))}
              </ul>
            ) : (
              <p className="muted py-2 text-[13px]">No contacts.</p>
            )}
          </LinkedPanel>
          <LinkedPanel
            title="Deals"
            count={o.deals.length}
            action={
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding("deal")}>
                <Plus size={14} aria-hidden /> Add deal
              </button>
            }
          >
            <DealList deals={o.deals} />
          </LinkedPanel>
        </div>
      </div>
      <OrganizationFormDialog open={editing} onOpenChange={setEditing} organization={o} />
      <ContactFormDialog
        open={adding === "contact"}
        onOpenChange={(v) => !v && setAdding(null)}
        initial={{ organization_id: String(o.id) }}
      />
      <DealFormDialog open={adding === "deal"} onOpenChange={(v) => !v && setAdding(null)} initial={{ organization_id: String(o.id) }} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={async () => {
          await remove.mutateAsync(o.id);
          toast.success("Organization deleted");
          navigate("/organizations");
        }}
      />
    </>
  );
}

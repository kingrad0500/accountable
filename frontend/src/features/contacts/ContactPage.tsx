import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { DealList } from "../../components/DealList";
import { Pill } from "../../components/Pill";
import { LinkedPanel, Loading, RecordHeader, RecordMissing } from "../../components/RecordPage";
import { Timeline } from "../activities/Timeline";
import { useContact, useDeleteContact } from "./api";
import { ContactFormDialog } from "./ContactForm";

const BACK = { to: "/contacts", label: "Contacts" };

/** A contact: details, their organization, their deals and their timeline (C3, C4). */
export function ContactPage() {
  const id = Number(useParams().id);
  const contact = useContact(id);
  const remove = useDeleteContact();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  if (contact.isPending) return <Loading />;
  if (!contact.data) return <RecordMissing what="contact" back={BACK} />;
  const c = contact.data;

  return (
    <>
      <RecordHeader
        kind="Contact"
        back={BACK}
        title={c.name}
        badges={<Pill kind="status" value={c.status} />}
        facts={[
          {
            label: "Organization",
            value: c.organization_id ? (
              <Link to={`/organizations/${c.organization_id}`} className="hover:underline">
                {c.organization_name}
              </Link>
            ) : null,
          },
          { label: "Job title", value: c.job_title },
          {
            label: "Email",
            value: c.email ? (
              <a href={`mailto:${c.email}`} className="text-cerulean-ink hover:underline">
                {c.email}
              </a>
            ) : null,
          },
          { label: "Phone", value: c.phone ? <span className="mono">{c.phone}</span> : null },
        ]}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting({ kind: "contact", id: c.id, name: c.name })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-[18px]">
        <Timeline entries={c.timeline} parent={{ contact_id: c.id }} hereKind="contact" />
        <div className="flex flex-col gap-[18px]">
          <LinkedPanel title="Organization">
            {c.organization_id ? (
              <Link to={`/organizations/${c.organization_id}`} className="font-semibold hover:underline">
                {c.organization_name}
              </Link>
            ) : (
              <p className="muted text-[13px]">Not linked to an organization.</p>
            )}
          </LinkedPanel>
          <LinkedPanel title="Deals" count={c.deals.length}>
            <DealList deals={c.deals} showOrganization />
          </LinkedPanel>
        </div>
      </div>
      <ContactFormDialog open={editing} onOpenChange={setEditing} contact={c} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={async () => {
          await remove.mutateAsync(c.id);
          toast.success("Contact deleted");
          navigate("/contacts");
        }}
      />
    </>
  );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { Money } from "../../components/Money";
import { Pill } from "../../components/Pill";
import { LinkedPanel, Loading, RecordHeader, RecordMissing } from "../../components/RecordPage";
import { isLate, todayISO } from "../../lib/dates";
import { formatDate } from "../../lib/format";
import { Timeline } from "../activities/Timeline";
import { useDeal, useDeleteDeal } from "./api";
import { DealFormDialog } from "./DealForm";

const BACK = { to: "/deals", label: "Deals" };

/** A deal: details, links to its organization and main contact, and its timeline (DL3, DL4). */
export function DealPage() {
  const id = Number(useParams().id);
  const deal = useDeal(id);
  const remove = useDeleteDeal();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  if (deal.isPending) return <Loading />;
  if (!deal.data) return <RecordMissing what="deal" back={BACK} />;
  const d = deal.data;
  const late = isLate(d, todayISO());

  return (
    <>
      <RecordHeader
        kind="Deal"
        back={BACK}
        title={d.name}
        badges={
          <>
            <Pill kind="stage" value={d.stage} />
            {late && <Pill kind="late" />}
          </>
        }
        facts={[
          {
            label: "Organization",
            value: d.organization_id ? (
              <Link to={`/organizations/${d.organization_id}`} className="hover:underline">
                {d.organization_name}
              </Link>
            ) : (
              <span className="muted italic">No organization</span>
            ),
          },
          {
            label: "Main contact",
            value: d.main_contact_id ? (
              <Link to={`/contacts/${d.main_contact_id}`} className="hover:underline">
                {d.main_contact_name}
              </Link>
            ) : null,
          },
          { label: "Value (USD)", value: <Money value={d.value} /> },
          { label: "Probability", value: <span className="mono">{d.probability}%</span> },
          { label: "Expected (USD)", value: <Money value={(d.value * d.probability) / 100} /> },
          {
            label: "Close date",
            value: d.close_date ? (
              <span className={`mono ${late ? "font-semibold text-fg-raspberry" : ""}`}>
                {formatDate(d.close_date)}
              </span>
            ) : null,
          },
        ]}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting({ kind: "deal", id: d.id, name: d.name })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-[18px]">
        <Timeline entries={d.timeline} parent={{ deal_id: d.id }} hereKind="deal" />
        <LinkedPanel title="Linked records">
          <ul className="flex flex-col gap-2 text-[13.5px]">
            <li>
              <span className="muted block text-[12px]">Organization</span>
              {d.organization_id ? (
                <Link
                  to={`/organizations/${d.organization_id}`}
                  className="font-semibold hover:underline"
                >
                  {d.organization_name}
                </Link>
              ) : (
                <span className="muted italic">No organization. Edit the deal to choose one.</span>
              )}
            </li>
            <li>
              <span className="muted block text-[12px]">Main contact</span>
              {d.main_contact_id ? (
                <Link
                  to={`/contacts/${d.main_contact_id}`}
                  className="font-semibold hover:underline"
                >
                  {d.main_contact_name}
                </Link>
              ) : (
                <span className="muted">None</span>
              )}
            </li>
          </ul>
        </LinkedPanel>
      </div>
      <DealFormDialog open={editing} onOpenChange={setEditing} deal={d} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={async () => {
          await remove.mutateAsync(d.id);
          toast.success("Deal deleted");
          navigate("/deals");
        }}
      />
    </>
  );
}

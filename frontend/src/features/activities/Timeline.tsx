import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActivityEntry, TimelineEntry } from "../../api/types";
import { ConfirmDelete, type DeleteTarget } from "../../components/ConfirmDelete";
import { Pill } from "../../components/Pill";
import { followUpGroup, todayISO } from "../../lib/dates";
import { formatDate, formatDateShort, formatDateTime, relativeTime } from "../../lib/format";
import { stageLabel } from "../../lib/stages";
import { useDeleteActivity, useSetFollowUpDone } from "./api";
import { ActivityForm, ActivityFormDialog } from "./ActivityForm";
import { TypeIcon } from "./TypeIcon";

type Props = {
  entries: TimelineEntry[];
  /** Where "Log activity" puts new activities; leave out for no composer. */
  parent?: { contact_id: number } | { deal_id: number };
  /** Hide links back to the record the timeline is on. */
  hereKind: "contact" | "deal" | "organization";
};

/** One timeline, newest first: activities and stage changes (A2, A3, C3, DL3, O2). */
export function Timeline({ entries, parent, hereKind }: Props) {
  const [editing, setEditing] = useState<ActivityEntry | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const remove = useDeleteActivity();

  return (
    <section className="panel p-5" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="mb-3 text-[15px]">
        {parent ? "Log activity" : "Timeline"}
      </h2>
      {parent && (
        <div className="mb-5 rounded-xl bg-bg/60 p-3.5">
          <ActivityForm parent={parent} idPrefix="log" />
        </div>
      )}
      {parent && <h2 className="mb-2 text-[15px]">Timeline</h2>}
      {entries.length === 0 ? (
        <p className="muted py-6 text-center">Nothing has happened here yet.</p>
      ) : (
        <ol aria-label="Timeline" className="flex flex-col">
          {entries.map((e) =>
            e.kind === "activity" ? (
              <ActivityItem
                key={`a${e.id}`}
                entry={e}
                hereKind={hereKind}
                onEdit={() => setEditing(e)}
                onDelete={() => setDeleting({ kind: "activity", id: e.id, type: e.type, occurredAt: e.occurred_at })}
              />
            ) : (
              <li key={`s${e.id}`} className="flex gap-3 py-3 shadow-[0_-1px_0_var(--tint)] first:shadow-none" data-testid="timeline-entry">
                <TypeIcon type="stage_change" />
                <div className="min-w-0 flex-1">
                  <p>
                    {hereKind === "deal" ? (
                      <b className="font-semibold">Moved</b>
                    ) : (
                      <Link to={`/deals/${e.deal_id}`} className="font-semibold hover:underline">
                        {e.deal_name}
                      </Link>
                    )}{" "}
                    {hereKind === "deal" ? "from" : "moved from"} {stageLabel(e.from_stage)} to{" "}
                    <Pill kind="stage" value={e.to_stage} className="!px-[7px] !text-[11.5px]" />
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    Stage change · <time dateTime={e.at} title={formatDateTime(e.at)}>{relativeTime(e.at)}</time>
                  </p>
                </div>
              </li>
            ),
          )}
        </ol>
      )}
      <ActivityFormDialog activity={editing} onClose={() => setEditing(null)} />
      <ConfirmDelete
        target={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={() => remove.mutateAsync(deleting!.id).then(() => toast.success("Activity deleted"))}
      />
    </section>
  );
}

function ActivityItem({
  entry,
  hereKind,
  onEdit,
  onDelete,
}: {
  entry: ActivityEntry;
  hereKind: Props["hereKind"];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const setDone = useSetFollowUpDone();
  const typeLabel = { note: "note", call: "call", email: "email" }[entry.type];
  const related =
    entry.deal_id !== null
      ? { to: `/deals/${entry.deal_id}`, name: entry.deal_name, show: hereKind !== "deal" }
      : { to: `/contacts/${entry.contact_id}`, name: entry.contact_name, show: hereKind !== "contact" };
  const group = entry.follow_up_date ? followUpGroup(entry.follow_up_date, todayISO()) : null;
  // Show the new state at once, while the server saves it.
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => setPending(null), [entry.follow_up_done]);
  const done = pending ?? entry.follow_up_done;

  return (
    <li className="group flex gap-3 py-3 shadow-[0_-1px_0_var(--tint)] first:shadow-none" data-testid="timeline-entry">
      <TypeIcon type={entry.type} />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-line">{entry.description}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-muted">
          {related.show && related.name && (
            <>
              <Link to={related.to} className="font-medium text-ink hover:underline">
                {related.name}
              </Link>
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={entry.occurred_at} title={formatDateTime(entry.occurred_at)}>
            {relativeTime(entry.occurred_at)}
          </time>
        </p>
        {entry.follow_up_date && (
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-bg px-2.5 py-1.5 text-[12.5px]">
            <input
              type="checkbox"
              className="checkbox"
              checked={done}
              onChange={(e) => {
                setPending(e.target.checked);
                setDone.mutate({ id: entry.id, done: e.target.checked }, { onError: () => setPending(null) });
              }}
              aria-label={`Follow-up on ${formatDate(entry.follow_up_date)} done`}
            />
            <span className={done ? "text-ink-muted line-through" : ""}>
              Follow up{" "}
              <span
                className={`mono font-semibold ${!done && group === "overdue" ? "text-raspberry-ink" : ""}`}
              >
                {group === "today" ? "today" : formatDateShort(entry.follow_up_date)}
              </span>
              {!done && group === "overdue" && " (overdue)"}
            </span>
          </label>
        )}
      </div>
      <div className="flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" className="icon-btn" aria-label={`Edit ${typeLabel}: ${entry.description}`} onClick={onEdit}>
          <Pencil size={15} aria-hidden />
        </button>
        <button type="button" className="icon-btn danger" aria-label={`Delete ${typeLabel}: ${entry.description}`} onClick={onDelete}>
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
    </li>
  );
}

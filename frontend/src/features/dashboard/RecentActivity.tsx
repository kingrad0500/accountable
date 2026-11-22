import { Link } from "react-router";
import type { TimelineEntry } from "../../api/types";
import { Pill } from "../../components/Pill";
import { formatDateTime, relativeTime } from "../../lib/format";
import { stageLabel } from "../../lib/stages";
import { TypeIcon } from "../activities/TypeIcon";

/** The 10 newest activities and stage changes, each linked to its record (DB5). */
export function RecentActivity({ entries }: { entries: TimelineEntry[] }) {
  return (
    <section aria-label="Recent activity" className="panel col-span-5 px-[22px] py-5">
      <h2 className="mb-2 text-[15px]">Recent activity</h2>
      {entries.length === 0 ? (
        <p className="muted py-8 text-center">Nothing yet.</p>
      ) : (
        <ol>
          {entries.map((e) => (
            <li
              key={`${e.kind}${e.id}`}
              className="grid grid-cols-[84px_1fr] gap-3 py-[9px] shadow-[0_-1px_0_var(--tint)] first:shadow-none"
            >
              <time
                dateTime={e.at}
                title={formatDateTime(e.at)}
                className="pt-px text-[12px] text-ink-muted"
              >
                {relativeTime(e.at)}
              </time>
              {e.kind === "stage_change" ? (
                <div>
                  <p className="text-[13px] leading-snug">
                    <Link to={`/deals/${e.deal_id}`} className="font-semibold hover:underline">
                      {e.deal_name}
                    </Link>{" "}
                    moved from {stageLabel(e.from_stage)} to{" "}
                    <Pill
                      kind="stage"
                      value={e.to_stage}
                      className="!px-[7px] !text-[11.5px] !leading-4"
                    />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
                    <TypeIcon type="stage_change" size={12} bare />
                    <span>Stage change</span>
                    {e.organization_name && <span aria-hidden>·</span>}
                    {e.organization_name && <span>{e.organization_name}</span>}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[13px] leading-snug">{e.description}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
                    <TypeIcon type={e.type} size={12} bare />
                    <Link
                      to={e.deal_id ? `/deals/${e.deal_id}` : `/contacts/${e.contact_id}`}
                      className="hover:text-ink hover:underline"
                    >
                      {e.deal_name ?? e.contact_name}
                    </Link>
                    {e.organization_name && <span aria-hidden>·</span>}
                    {e.organization_name && <span>{e.organization_name}</span>}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

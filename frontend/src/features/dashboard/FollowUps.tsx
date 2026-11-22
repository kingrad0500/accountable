import { useState } from "react";
import { Link } from "react-router";
import type { FollowUp } from "../../api/types";
import { groupFollowUps, todayISO, type FollowUpGroup } from "../../lib/dates";
import { formatDateShort } from "../../lib/format";
import { useSetFollowUpDone } from "../activities/api";
import { TypeIcon } from "../activities/TypeIcon";

const GROUPS: { key: FollowUpGroup; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
];

/** Every follow-up not done, grouped Overdue, Today, Upcoming, soonest first; mark done here (DB6). */
export function FollowUps({ items }: { items: FollowUp[] }) {
  const today = todayISO();
  const setDone = useSetFollowUpDone();
  const [done, setDoneIds] = useState<Set<number>>(new Set());
  const groups = groupFollowUps(items, today);

  const markDone = (id: number) => {
    setDoneIds((s) => new Set(s).add(id));
    setDone.mutate(
      { id, done: true },
      { onError: () => setDoneIds((s) => new Set([...s].filter((x) => x !== id))) },
    );
  };

  return (
    <section aria-label="Follow-ups" className="panel col-span-7 px-[22px] py-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15px]">Follow-ups</h2>
        <small className="text-[12.5px] text-fg-muted" data-testid="follow-up-counts">
          {groups.overdue.length} overdue · {groups.today.length} today · {groups.upcoming.length}{" "}
          upcoming
        </small>
      </div>
      {items.length === 0 ? (
        <p className="muted py-8 text-center">No follow-ups. Add one when you log an activity.</p>
      ) : (
        <div className="max-h-[540px] overflow-y-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-[1] bg-surface">
              <tr className="text-left text-[12px] text-fg-muted">
                <th className="w-8 px-2 pb-2 font-medium">
                  <span className="sr-only">Done</span>
                </th>
                <th className="px-2 pb-2 font-medium">Due</th>
                <th className="px-2 pb-2 font-medium">Task</th>
                <th className="px-2 pb-2 font-medium">For</th>
                <th className="px-2 pb-2 font-medium">Organization</th>
              </tr>
            </thead>
            {GROUPS.filter((g) => groups[g.key].length).map((g) => (
              <tbody key={g.key} aria-label={g.label}>
                <tr>
                  <th
                    colSpan={5}
                    scope="colgroup"
                    className="px-2 pt-3 pb-1 text-left text-[11.5px] font-semibold tracking-wide text-fg-muted uppercase"
                  >
                    {g.label}
                  </th>
                </tr>
                {groups[g.key].map((f) => {
                  const isDone = done.has(f.id);
                  const related = f.deal_id
                    ? { to: `/deals/${f.deal_id}`, name: f.deal_name }
                    : { to: `/contacts/${f.contact_id}`, name: f.contact_name };
                  return (
                    <tr
                      key={f.id}
                      className={`shadow-[0_-1px_0_var(--tint)] ${isDone ? "opacity-50" : ""}`}
                      data-testid="follow-up"
                    >
                      <td className="px-2 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={isDone}
                          disabled={isDone}
                          onChange={() => markDone(f.id)}
                          aria-label={`Mark done: ${f.description}`}
                        />
                      </td>
                      <td
                        className={`mono px-2 py-2.5 whitespace-nowrap ${g.key === "overdue" ? "font-semibold text-fg-raspberry" : ""}`}
                      >
                        {g.key === "today" ? "Today" : formatDateShort(f.follow_up_date!)}
                      </td>
                      <td className={`px-2 py-2.5 font-medium ${isDone ? "line-through" : ""}`}>
                        {f.description}
                      </td>
                      <td className="px-2 py-2.5">
                        <Link
                          to={related.to}
                          className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg hover:underline"
                        >
                          <TypeIcon type={f.type} size={14} bare />
                          {related.name}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-fg-muted">
                        {f.organization_id ? (
                          <Link
                            to={`/organizations/${f.organization_id}`}
                            className="hover:text-fg hover:underline"
                          >
                            {f.organization_name}
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
}

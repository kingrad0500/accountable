import type { Deal } from "../api/types";
import { isLate, todayISO } from "../lib/dates";
import { formatDate } from "../lib/format";
import { LinkedRow } from "./RecordPage";
import { Money } from "./Money";
import { Pill } from "./Pill";

/** Deals linked to a contact or organization. */
export function DealList({ deals, showOrganization = false }: { deals: Deal[]; showOrganization?: boolean }) {
  if (!deals.length) return <p className="muted py-2 text-[13px]">No deals.</p>;
  const today = todayISO();
  return (
    <ul>
      {deals.map((d) => (
        <LinkedRow
          key={d.id}
          to={`/deals/${d.id}`}
          title={d.name}
          sub={
            <>
              {showOrganization && d.organization_name ? `${d.organization_name} · ` : ""}
              {d.close_date ? `Close ${formatDate(d.close_date)}` : "No close date"}
              {isLate(d, today) && (
                <>
                  {" "}
                  <Pill kind="late" className="!px-1.5 !text-[10.5px] !leading-4" />
                </>
              )}
            </>
          }
          right={
            <span className="flex flex-col items-end gap-1">
              <Money value={d.value} className="text-[13px] font-semibold" />
              <Pill kind="stage" value={d.stage} className="!text-[11px]" />
            </span>
          }
        />
      ))}
    </ul>
  );
}

import type { Dashboard } from "../../api/types";
import { usd, usdShort } from "../../lib/format";
import { stageOf } from "../../lib/stages";
import { funnelRows } from "./figures";

/** Value that reached each stage, with the share that carried on (DB4, concern 6). */
export function Funnel({ funnel }: { funnel: Dashboard["funnel"] }) {
  const rows = funnelRows(funnel.stages);
  return (
    <section aria-label="Sales funnel" className="panel col-span-5 px-[22px] py-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15px]">Sales funnel</h2>
        <small className="text-[12.5px] text-ink-muted">Value that reached each stage (USD)</small>
      </div>
      <ol className="flex flex-col">
        {rows.map((r) => {
          const s = stageOf(r.stage);
          return (
            <li key={r.stage} data-testid={`funnel-${r.stage}`}>
              {r.carriedOn !== null && (
                <p className="mono grid h-4 grid-cols-[96px_1fr_84px] gap-3 text-[11px] text-ink-muted">
                  <span className="col-start-2 pl-1.5">↓ {r.carriedOn}% carried on</span>
                </p>
              )}
              <div className="grid h-10 grid-cols-[96px_1fr_84px] items-center gap-3">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <span
                    className="size-[9px] rounded-full"
                    style={{ background: s.dot }}
                    aria-hidden
                  />
                  {s.label}
                </span>
                <div className="h-[26px] overflow-hidden rounded-lg bg-bg">
                  <div
                    className="h-full rounded-lg"
                    style={{ width: `${r.width}%`, background: s.dot }}
                  />
                </div>
                <span
                  className="mono text-right text-[13px] font-semibold"
                  title={`${usd(r.value)} USD, ${r.count} deals`}
                >
                  {usdShort(r.value)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12.5px] text-ink-muted" data-testid="funnel-lost">
        Lost along the way: <span className="mono">{usd(funnel.lost_value)}</span> across{" "}
        {funnel.lost_count} {funnel.lost_count === 1 ? "deal" : "deals"}
      </p>
    </section>
  );
}

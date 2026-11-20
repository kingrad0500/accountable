import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Dashboard } from "../../api/types";
import { monthPoints } from "./figures";

/** Deals won and lost per month, over the same 12 months (DB3). */
export function WonLostChart({ months }: { months: Dashboard["months"] }) {
  const points = monthPoints(months);
  return (
    <section aria-label="Deals won and lost by month" className="panel col-span-7 px-[22px] py-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15px]">Deals won and lost by month</h2>
        <div className="flex gap-3.5 text-[12.5px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-sea-green" aria-hidden /> Won
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-coral" aria-hidden /> Lost
          </span>
        </div>
      </div>
      <div
        className="h-[272px]"
        role="img"
        aria-label={`Deals won and lost by month. ${points.map((p) => `${p.label}: ${p.won} won, ${p.lost} lost`).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 272 }}>
          <BarChart data={points} barGap={3} barCategoryGap="22%" margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="#DCE5E8" strokeDasharray="4 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#4F6E78", fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#4F6E78", fontSize: 11.5 }} />
            <Tooltip
              cursor={{ fill: "rgb(7 59 76 / 0.04)" }}
              contentStyle={{ borderRadius: 12, border: 0, boxShadow: "var(--shadow-lift)", fontSize: 12.5, color: "#073B4C" }}
            />
            <Bar dataKey="won" name="Won" fill="#06D6A0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="lost" name="Lost" fill="#F78C6B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

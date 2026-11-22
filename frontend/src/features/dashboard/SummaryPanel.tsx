import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Dashboard } from "../../api/types";
import { percent, usd, usdShort } from "../../lib/format";
import { bestMonth, changeOnPrior, monthPoints, needsAttention, type MonthPoint } from "./figures";

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The Midnight panel: five headline figures and revenue won by month (DB1, DB2). */
export function SummaryPanel({ data }: { data: Dashboard }) {
  const f = data.figures;
  const points = monthPoints(data.months);
  const change = changeOnPrior(f);
  const first = points[0];
  const last = points[points.length - 1];
  const range =
    first && last
      ? `${first.label} ${first.month.slice(0, 4)} to ${last.label} ${last.month.slice(0, 4)}`
      : "";

  return (
    <section
      aria-label="How sales are going"
      className="col-span-12 grid grid-cols-[360px_1fr] gap-8 rounded-[20px] bg-ink px-7 pt-[26px] pb-[18px] text-sea-mist"
    >
      <div>
        <h2 className="text-[15px] text-white">How sales are going</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kpi
            feature
            label="Revenue won, last 12 months"
            value={usd(f.revenue_won_12m)}
            note={change ?? `${f.won_12m} ${f.won_12m === 1 ? "deal" : "deals"} won`}
            testId="kpi-revenue"
          />
          <Kpi
            label="Open pipeline"
            value={usd(f.open_value)}
            note={`${f.open_count} deals`}
            testId="kpi-open"
          />
          <Kpi
            label="Expected revenue"
            value={usd(f.expected_revenue)}
            note="Value × probability"
            testId="kpi-expected"
          />
          <Kpi
            label="Win rate, 12 months"
            value={f.win_rate === null ? "None yet" : percent(f.win_rate)}
            note={
              <>
                <span className="font-semibold text-sea-green">{f.won_12m} won</span> · {f.lost_12m}{" "}
                lost
              </>
            }
            testId="kpi-win-rate"
          />
          <Kpi
            label="Needs attention"
            value={String(needsAttention(f))}
            valueClass="text-[var(--raspberry-light)]"
            note={`${f.late_deals} late ${f.late_deals === 1 ? "deal" : "deals"} · ${f.overdue_follow_ups} overdue`}
            testId="kpi-attention"
          />
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] text-white">Revenue won by month (USD)</h2>
          <small className="text-[12.5px]">{range}</small>
        </div>
        <RevenueChart points={points} />
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  note,
  feature = false,
  valueClass = "",
  testId,
}: {
  label: string;
  value: string;
  note: React.ReactNode;
  feature?: boolean;
  valueClass?: string;
  testId: string;
}) {
  return (
    <div
      className={`rounded-[14px] px-4 py-3.5 ${feature ? "col-span-2 bg-sea-green text-ink" : "bg-[rgb(205_216_219/0.07)]"}`}
    >
      <span className="text-[12px] font-medium">{label}</span>
      <b
        data-testid={testId}
        className={`mono mt-1.5 block font-semibold tracking-[-0.03em] ${feature ? "text-[34px] text-ink" : "text-[22px]"} ${valueClass || (feature ? "" : "text-white")}`}
      >
        {value}
      </b>
      <small className="mt-0.5 block text-[12px]">{note}</small>
    </div>
  );
}

function RevenueChart({ points }: { points: MonthPoint[] }) {
  const best = bestMonth(points);
  const hasRevenue = points.some((p) => p.revenue > 0);
  return (
    <div
      className="mt-2 h-[300px]"
      role="img"
      aria-label={`Revenue won by month. ${points.map((p) => `${p.label}: ${usd(p.revenue)}`).join(", ")}`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 800, height: 300 }}
      >
        <AreaChart data={points} margin={{ top: 28, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06D6A0" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#06D6A0" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(205 216 219 / 0.16)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#A9BEC4", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickFormatter={(v: number) => usdShort(v)}
            tickLine={false}
            axisLine={false}
            width={58}
            tick={{ fill: "#A9BEC4", fontSize: 11.5, fontFamily: "var(--font-mono)" }}
          />
          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "rgb(205 216 219 / 0.35)" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#06D6A0"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
            isAnimationActive={false}
            dot={({ cx, cy, index }) => (
              <BestDot
                key={index}
                cx={cx}
                cy={cy}
                best={hasRevenue && index === best}
                current={index === points.length - 1}
                value={points[index].revenue}
              />
            )}
            activeDot={{ r: 5, fill: "#06D6A0", stroke: "#073B4C", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Each point, with the best month labelled and this month drawn larger. */
function BestDot({
  cx,
  cy,
  best,
  current,
  value,
}: {
  cx?: number;
  cy?: number;
  best: boolean;
  current: boolean;
  value: number;
}) {
  const label = usd(value);
  const w = label.length * 7.6 + 16;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle
        r={current ? 6 : 3.5}
        fill="#073B4C"
        stroke="#06D6A0"
        strokeWidth={current ? 2.5 : 2}
      />
      {best && (
        <g data-testid="best-month">
          <rect x={-w / 2} y={-32} width={w} height={22} rx={6} fill="#06D6A0" />
          <text
            y={-17}
            textAnchor="middle"
            fill="#073B4C"
            fontSize={12}
            fontWeight={600}
            fontFamily="var(--font-mono)"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MonthPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[12.5px] text-ink shadow-lift">
      <p className="font-semibold">
        {LONG_MONTHS[Number(p.month.slice(5, 7)) - 1]} {p.month.slice(0, 4)}
      </p>
      <p className="mono">{usd(p.revenue)} USD</p>
      <p className="text-ink-muted">
        {p.won} {p.won === 1 ? "deal" : "deals"} won
      </p>
    </div>
  );
}

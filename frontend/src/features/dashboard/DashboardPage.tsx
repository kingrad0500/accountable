import { useEffect } from "react";
import { formatLongDate } from "../../lib/format";
import { useDashboard } from "./api";
import { greeting } from "./figures";
import { FollowUps } from "./FollowUps";
import { Funnel } from "./Funnel";
import { RecentActivity } from "./RecentActivity";
import { SummaryPanel } from "./SummaryPanel";
import { WonLostChart } from "./WonLostChart";

/** The landing page: how sales are going at a glance. */
export function DashboardPage() {
  const dashboard = useDashboard();
  const now = new Date();
  useEffect(() => {
    document.title = "Dashboard · Accountable";
  }, []);

  return (
    <>
      <div className="mx-1 mb-4 flex items-baseline justify-between">
        <h1 className="text-[26px] tracking-[-0.02em]">{greeting(now)}</h1>
        <span className="text-[13.5px] text-ink-muted">{formatLongDate(now)} · all figures in USD</span>
      </div>
      {!dashboard.data ? (
        <p className="muted p-6">{dashboard.isError ? "The dashboard couldn't load. Is the server running?" : "Loading…"}</p>
      ) : (
        <div className="grid grid-cols-12 gap-[18px]">
          <SummaryPanel data={dashboard.data} />
          <Funnel funnel={dashboard.data.funnel} />
          <WonLostChart months={dashboard.data.months} />
          <FollowUps items={dashboard.data.follow_ups} />
          <RecentActivity entries={dashboard.data.recent} />
        </div>
      )}
    </>
  );
}

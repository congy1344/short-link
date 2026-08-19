import type { LinkStats, LinkSummary } from "../api";
import { Breakdown } from "./Breakdown";
import { formatNumber } from "./format";
import { LineChart } from "./LineChart";

type AnalyticsPanelProps = {
  selectedLink: LinkSummary | undefined;
  stats: LinkStats | null;
  isLoadingStats: boolean;
};

export function AnalyticsPanel({ selectedLink, stats, isLoadingStats }: AnalyticsPanelProps) {
  return (
    <section id="detail-title" className="panel detail-panel" aria-labelledby="detail-heading">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Last 30 days</p>
          <h2 id="detail-heading">{selectedLink?.title || selectedLink?.shortCode || "Link detail"}</h2>
          {selectedLink ? <p className="muted destination-line">{selectedLink.destinationUrl}</p> : null}
        </div>
        {selectedLink ? <span className={`status-badge status-${selectedLink.status.toLowerCase()}`}>{selectedLink.status.toLowerCase()}</span> : null}
      </div>

      {!selectedLink ? <p className="empty-state">Create or select a link.</p> : null}
      {selectedLink && isLoadingStats ? <div className="skeleton-chart" aria-label="Loading analytics" /> : null}
      {selectedLink && stats ? (
        <>
          <div className="stat-strip" aria-label="Selected link metrics">
            <span>
              <strong>{formatNumber(stats.totalClicks)}</strong>
              Total clicks
            </span>
            <span>
              <strong>{formatNumber(stats.uniqueVisitors)}</strong>
              Unique visitors
            </span>
            <span>
              <strong>{stats.clicksByDay.at(-1)?.clicks ?? 0}</strong>
              Latest day
            </span>
          </div>
          <LineChart data={stats.clicksByDay} />
          <div className="breakdown-grid">
            <Breakdown title="Referrers" items={stats.topReferrers.map((item) => ({ label: item.referrer, clicks: item.clicks }))} />
            <Breakdown title="Browsers" items={stats.topUserAgents.map((item) => ({ label: item.userAgent, clicks: item.clicks }))} />
            <Breakdown title="Devices" items={stats.topDevices.map((item) => ({ label: item.device, clicks: item.clicks }))} />
          </div>
        </>
      ) : null}
    </section>
  );
}


import { formatNumber } from "./format";

type MetricsProps = {
  totalClicks: number;
  activeLinks: number;
  topReferrer: string;
};

export function Metrics({ totalClicks, activeLinks, topReferrer }: MetricsProps) {
  return (
    <section className="metrics" aria-label="Key metrics">
      <article>
        <span>Total clicks</span>
        <strong>{formatNumber(totalClicks)}</strong>
      </article>
      <article>
        <span>Active links</span>
        <strong>{formatNumber(activeLinks)}</strong>
      </article>
      <article>
        <span>Top referrer</span>
        <strong>{topReferrer}</strong>
      </article>
    </section>
  );
}


import type { CSSProperties } from "react";

import { formatNumber } from "./format";

type BreakdownItem = {
  label: string;
  clicks: number;
};

type BreakdownProps = {
  title: string;
  items: BreakdownItem[];
};

export function Breakdown({ title, items }: BreakdownProps) {
  const max = Math.max(1, ...items.map((item) => item.clicks));

  return (
    <section className="breakdown" aria-label={title}>
      <h3>{title}</h3>
      {items.length === 0 ? <p className="empty-state">No data.</p> : null}
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-label">
            <span>{item.label}</span>
            <strong>{formatNumber(item.clicks)}</strong>
          </div>
          <div className="bar-track" aria-hidden="true">
            <span style={{ "--bar-width": `${Math.max(6, (item.clicks / max) * 100)}%` } as CSSProperties} />
          </div>
        </div>
      ))}
    </section>
  );
}


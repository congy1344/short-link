type LineChartProps = {
  data: Array<{ day: string; clicks: number }>;
};

export function LineChart({ data }: LineChartProps) {
  if (data.length === 0) {
    return <p className="empty-state">No clicks in the selected period.</p>;
  }

  const width = 640;
  const height = 180;
  const maxClicks = Math.max(1, ...data.map((item) => item.clicks));
  const points = data
    .map((item, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = height - (item.clicks / maxClicks) * (height - 20) - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <figure className="chart">
      <svg aria-label="Clicks over time" role="img" viewBox={`0 0 ${width} ${height}`}>
        <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {data.map((item, index) => {
          const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
          const y = height - (item.clicks / maxClicks) * (height - 20) - 10;
          return <circle cx={x} cy={y} key={item.day} r="4" />;
        })}
      </svg>
      <figcaption>
        {data[0]?.day} to {data.at(-1)?.day}
      </figcaption>
    </figure>
  );
}


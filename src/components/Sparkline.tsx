interface SparklineProps {
  points: number[];
  className?: string;
  color?: string;
}

/** Tiny trend line — no chart library, no bundle cost. */
export function Sparkline({ points, className = 'sparkline', color }: SparklineProps) {
  if (points.length < 2) {
    return (
      <svg className={className} viewBox="0 0 72 30" aria-hidden="true">
        <line
          x1="2"
          y1="15"
          x2="70"
          y2="15"
          stroke="var(--surface-3)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = 68 / (points.length - 1);

  const coords = points.map((value, i) => {
    const x = 2 + i * stepX;
    const y = 26 - ((value - min) / span) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const stroke = color ?? 'var(--accent-hi)';
  const last = coords[coords.length - 1].split(',');

  return (
    <svg className={className} viewBox="0 0 72 30" aria-hidden="true">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={stroke} />
    </svg>
  );
}

/**
 * FilterUsageSparkline (O4) — compact inline sparkline showing filter usage trend.
 *
 * Takes an array of weekly use counts (oldest → newest) and renders a small
 * 52×16px SVG polyline. Falls back to a dash if no data.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';

interface Props {
  /** Weekly usage counts, oldest first — typically the last 8 weeks */
  data: number[];
  /** Total use count to display as a label */
  totalCount?: number;
  width?: number;
  height?: number;
}

export function FilterUsageSparkline({
  data,
  totalCount,
  width = 52,
  height = 16,
}: Props) {
  if (!data.length || data.every(d => d === 0)) {
    return (
      <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
        {totalCount !== undefined ? `${totalCount} uses` : '—'}
      </span>
    );
  }

  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((v / max) * (height - 4));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        style={{ overflow: 'visible', flexShrink: 0 }}
      >
        <polyline
          points={pts}
          fill="none"
          stroke={`var(--ds-chart-blue-bold)`}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* End-point dot */}
        {data.length > 0 && (() => {
          const last = pts.split(' ').pop()!;
          const [lx, ly] = last.split(',').map(Number);
          return <circle cx={lx} cy={ly} r={2} fill={`var(--ds-chart-blue-bold)`} />;
        })()}
      </svg>
      {totalCount !== undefined && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle') }}>
          {totalCount}
        </span>
      )}
    </div>
  );
}

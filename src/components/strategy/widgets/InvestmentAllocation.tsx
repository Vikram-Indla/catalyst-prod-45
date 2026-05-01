/**
 * InvestmentAllocation — Widget 8: Donut chart + legend
 * Row 4, span 3
 * DATA SOURCE: es_investment_allocations + es_strategic_themes
 */

import { useMemo } from 'react';
import { useInvestmentAllocations, useStrategicThemes } from '@/hooks/strategy/useStrategyData';
import { formatThemeName } from '@/utils/strategy/formatThemeName';

/* Blue monochrome shades — sorted by allocation size */
const BLUE_SHADES = ['#1E40AF', 'var(--ds-text-brand, #3B82F6)', '#93C5FD', '#DBEAFE', '#DBEAFE'];

function formatSAR(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

export function InvestmentAllocation() {
  const { data: allocations, isLoading: aL } = useInvestmentAllocations();
  const { data: themes, isLoading: tL } = useStrategicThemes();
  const isLoading = aL || tL;

  const segments = useMemo(() => {
    if (!allocations || !themes) return [];
    const sorted = [...allocations].sort((a, b) => (Number(b.allocated_pct) || 0) - (Number(a.allocated_pct) || 0));
    return sorted.map((a, i) => {
      const theme = themes.find(t => t.id === a.theme_id);
      return {
        name: theme?.title ? formatThemeName(theme.title) : 'Unknown',
        pct: Number(a.allocated_pct) || 0,
        amount: formatSAR(Number(a.allocated_amount) || 0),
        color: BLUE_SHADES[i] || BLUE_SHADES[BLUE_SHADES.length - 1],
      };
    });
  }, [allocations, themes]);

  const total = useMemo(() =>
    allocations?.reduce((s, a) => s + (Number(a.allocated_amount) || 0), 0) || 0,
    [allocations]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center animate-pulse">
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
        <div className="w-full mt-3 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 16, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          ))}
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--exec-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No investment data</span>
      </div>
    );
  }

  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 38;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {segments.map(seg => {
          const dashArray = (seg.pct / 100) * circumference;
          const dashOffset = -cumulativeOffset;
          cumulativeOffset += dashArray;
          return (
            <circle
              key={seg.name}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={seg.color}
              opacity={0.9}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 800ms ease-out' }}
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--exec-text-primary)' }}>
          SAR {formatSAR(total)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fill: 'var(--exec-text-tertiary)' }}>
          Total
        </text>
      </svg>

      <div className="w-full mt-3 space-y-1.5">
        {segments.map(seg => (
          <div key={seg.name} className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--exec-text-secondary)' }}>{seg.name}</span>
            <span style={{ fontSize: 11, color: 'var(--exec-text-primary)' }}>{seg.amount}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--exec-text-primary)', width: 30, textAlign: 'right' }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

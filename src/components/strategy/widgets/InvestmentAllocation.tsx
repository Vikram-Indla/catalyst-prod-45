/**
 * InvestmentAllocation — Widget 8: Donut chart + legend
 * Row 4, span 3
 */

interface Segment {
  name: string;
  pct: number;
  amount: string;
  color: string;
}

const SEGMENTS: Segment[] = [
  { name: 'Digital Transform.', pct: 35, amount: '840M', color: '#2563EB' },
  { name: 'Workforce Dev.', pct: 25, amount: '600M', color: '#0D9488' },
  { name: 'Supply Chain', pct: 24, amount: '576M', color: '#D97706' },
  { name: 'Sustainability', pct: 16, amount: '384M', color: '#16A34A' },
];

export function InvestmentAllocation() {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 38;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col items-center">
      {/* Donut */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {SEGMENTS.map(seg => {
          const dashArray = (seg.pct / 100) * circumference;
          const dashOffset = -cumulativeOffset;
          cumulativeOffset += dashArray;
          return (
            <circle
              key={seg.name}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 800ms ease-out' }}
            />
          );
        })}
        <text x={cx} y={cx - 4} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: 'var(--catalyst-text-primary)' }}>
          SAR 2.4B
        </text>
        <text x={cx} y={cx + 10} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fill: 'var(--catalyst-text-tertiary)' }}>
          Total
        </text>
      </svg>

      {/* Legend */}
      <div className="w-full mt-3 space-y-1.5">
        {SEGMENTS.map(seg => (
          <div key={seg.name} className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--catalyst-text-secondary)' }}>{seg.name}</span>
            <span style={{ fontSize: 11, color: 'var(--catalyst-text-primary)' }}>{seg.amount}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-primary)', width: 30, textAlign: 'right' }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

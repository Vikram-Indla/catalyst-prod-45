/**
 * ProgressRing — SVG circular progress indicator
 * Shared component for WorkHub themes
 */

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  showLabel?: boolean;
  emptyLabel?: string;
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
  color,
  showLabel = true,
  emptyLabel = '—',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const offset = circumference * (1 - clampedPercent / 100);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--wh-border-light, #f1f5f9)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
      {/* Label */}
      {showLabel && (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontSize: size * 0.22,
            fontWeight: 700,
            fontFamily: 'var(--wh-font-sans, Inter, sans-serif)',
          }}
        >
          {percent > 0 ? `${Math.round(clampedPercent)}%` : emptyLabel}
        </text>
      )}
    </svg>
  );
}

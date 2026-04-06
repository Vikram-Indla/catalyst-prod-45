/**
 * CircularGauge — SVG donut chart for scores
 */

interface CircularGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  animated?: boolean;
  className?: string;
}

function getGaugeColor(value: number): string {
  if (value >= 70) return 'var(--exec-blue-700, #7DB8FC)';
  if (value >= 40) return 'var(--exec-signal-amber, #D97706)';
  return 'var(--exec-signal-red, #DC2626)';
}

export function CircularGauge({ value, size = 100, strokeWidth = 10, color, label, animated = true, className = '' }: CircularGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillColor = color ?? getGaugeColor(clampedValue);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const center = size / 2;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--exec-border, var(--bd-default, rgba(255,255,255,0.10)))" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={fillColor} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: animated ? 'stroke-dashoffset 800ms ease-out' : undefined }}
        />
        <text x={center} y={label ? center - 4 : center} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: size * 0.28, fontWeight: 700, fill: 'var(--exec-text-primary, rgba(237,237,237,0.93))' }}>
          {Math.round(clampedValue)}
        </text>
        {label && (
          <text x={center} y={center + size * 0.14} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: size * 0.11, fill: 'var(--exec-text-tertiary, rgba(237,237,237,0.40))' }}>
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

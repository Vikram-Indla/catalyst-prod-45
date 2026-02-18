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
  if (value >= 75) return 'var(--catalyst-success, #0D9488)';
  if (value >= 50) return 'var(--catalyst-warning, #D97706)';
  return 'var(--catalyst-danger, #EF4444)';
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
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--catalyst-bg-hover, #F1F5F9)"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: animated ? 'stroke-dashoffset 800ms ease-out' : undefined }}
        />
        {/* Value text */}
        <text
          x={center}
          y={label ? center - 4 : center}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: size * 0.28, fontWeight: 700, fill: 'var(--catalyst-text-primary, #0F172A)' }}
        >
          {Math.round(clampedValue)}
        </text>
        {label && (
          <text
            x={center}
            y={center + size * 0.14}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: size * 0.11, fill: 'var(--catalyst-text-tertiary, #94A3B8)' }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

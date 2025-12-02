import { useMemo } from 'react';

interface GaugeChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
  colorThresholds?: { value: number; color: string }[];
}

export function GaugeChart({
  value,
  max = 100,
  size = 200,
  strokeWidth = 20,
  label,
  showValue = true,
  colorThresholds = [
    { value: 60, color: '#ef4444' },
    { value: 80, color: '#eab308' },
    { value: 100, color: '#10b981' },
  ],
}: GaugeChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = useMemo(() => {
    for (const threshold of colorThresholds) {
      if (value <= threshold.value) {
        return threshold.color;
      }
    }
    return colorThresholds[colorThresholds.length - 1]?.color || '#10b981';
  }, [value, colorThresholds]);

  const getStatusLabel = () => {
    if (value >= 80) return 'Healthy';
    if (value >= 60) return 'At Risk';
    return 'Critical';
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        {/* Center text */}
        {showValue && (
          <>
            <text
              x={size / 2}
              y={size / 2 - 10}
              textAnchor="middle"
              className="text-3xl font-bold"
              fill="currentColor"
            >
              {Math.round(value)}
            </text>
            <text
              x={size / 2}
              y={size / 2 + 15}
              textAnchor="middle"
              className="text-sm"
              fill="hsl(var(--muted-foreground))"
            >
              / {max}
            </text>
          </>
        )}
      </svg>
      {label && (
        <div className="mt-2 text-center">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs" style={{ color }}>
            {getStatusLabel()}
          </p>
        </div>
      )}
    </div>
  );
}

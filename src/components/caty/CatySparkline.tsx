/**
 * Caty V4 — Sparkline Component
 * Mini 7-day trend chart for KPIs
 */

interface CatySparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function CatySparkline({ 
  data, 
  color = 'currentColor',
  className = ''
}: CatySparklineProps) {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg 
      className={`caty-sparkline ${className}`}
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

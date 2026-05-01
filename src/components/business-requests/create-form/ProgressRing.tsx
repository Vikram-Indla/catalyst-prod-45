import { cn } from '@/lib/utils';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ 
  percent, 
  size = 40, 
  strokeWidth = 3,
  className 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  
  // Color based on completion - using Catalyst brand colors
  const getColor = () => {
    if (percent >= 100) return 'text-[#0d9488]'; // teal - complete
    if (percent >= 75) return 'text-[#0d9488]'; // teal - almost complete
    if (percent >= 50) return 'text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]'; // blue - progress
    return 'text-[#9ca3af]'; // gray - starting
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-300", getColor())}
          style={{
            stroke: 'currentColor',
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <span className={cn(
        "absolute text-[10px] font-semibold",
        "text-gray-600 dark:text-gray-300"
      )}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

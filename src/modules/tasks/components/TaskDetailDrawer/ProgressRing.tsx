// ============================================================
// PROGRESS RING COMPONENT
// Circular progress indicator with percentage
// ============================================================

import { CATALYST_COLORS } from '../../types/kanban';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ progress, size = 52, strokeWidth = 5 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (progress === 100) return CATALYST_COLORS.success;
    if (progress >= 50) return CATALYST_COLORS.primary;
    return CATALYST_COLORS.gray400;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={CATALYST_COLORS.gray200}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      
      {/* Percentage text */}
      <div 
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
        style={{ color: getColor() }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
}

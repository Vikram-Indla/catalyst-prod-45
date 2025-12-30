// ═══════════════════════════════════════════════════════════════════════════════
// OKR Progress Cell — Shared Presentational Component
// Progress bar with Catalyst-compliant semantic colors + trend arrows
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ProgressBaseline, TrendCode } from '../../lib/okrTypes';

interface OkrProgressCellProps {
  baseline: ProgressBaseline;
  status?: string;
  compact?: boolean;
}

// Catalyst Design System — Progress bar color based on percentage threshold
function getProgressBarColor(actual?: number | null): string {
  if (actual == null) return 'bg-[#e5e5e5]';
  if (actual >= 80) return 'bg-[#22c55e]';  // Success - On Track
  if (actual >= 50) return 'bg-[#f59e0b]';  // Warning - At Risk
  return 'bg-[#ef4444]';                     // Danger - Off Track
}

// Trend icon component
function TrendArrow({ trend }: { trend: TrendCode }) {
  if (trend === 'none') {
    return null;
  }

  // Ahead or On track - green up arrow
  if (trend === 'ahead' || trend === 'on-track') {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-[#22c55e] flex-shrink-0" />
    );
  }

  // At risk - warning down arrow
  if (trend === 'at-risk') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />
    );
  }

  // Off track - danger down arrow
  if (trend === 'off-track') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-[#ef4444] flex-shrink-0" />
    );
  }

  return null;
}

export function OkrProgressCell({ baseline, status, compact = false }: OkrProgressCellProps) {
  const { actual, trend, variance } = baseline;
  
  // Only show dash if actual is null/undefined (not just 0)
  if (actual == null) {
    return <span className="text-sm text-[#8a8a8a] text-right block">—</span>;
  }

  const barColor = getProgressBarColor(actual);

  return (
    <div className="flex items-center justify-start gap-3 w-full">
      {/* Progress bar - fixed width, left-aligned with visible track */}
      <div className={cn(
        "h-2 rounded-full overflow-hidden flex-shrink-0 bg-[#e5e5e5]",
        compact ? 'w-20' : 'w-28'
      )}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${Math.min(actual, 100)}%` }}
        />
      </div>
      
      {/* Percentage */}
      <span className="text-[14px] font-semibold text-[#171717] flex-shrink-0 min-w-[36px] text-left tabular-nums">
        {Math.round(actual)}%
      </span>
      
      {/* Trend arrow */}
      <TrendArrow trend={trend} />
    </div>
  );
}

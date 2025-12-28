// ═══════════════════════════════════════════════════════════════════════════════
// OKR Progress Cell — Shared Presentational Component
// Progress bar with status-matched colors + trend arrows
// ═══════════════════════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ProgressBaseline, TrendCode } from '../../lib/okrTypes';

interface OkrProgressCellProps {
  baseline: ProgressBaseline;
  status?: string;
  compact?: boolean;
}

// Progress bar color based on trend status
function getProgressBarColor(trend?: TrendCode): string {
  if (trend === 'ahead' || trend === 'on-track') {
    return 'bg-success';
  }
  if (trend === 'at-risk') {
    return 'bg-warning';
  }
  if (trend === 'off-track') {
    return 'bg-danger';
  }
  return 'bg-brand-primary';
}

// Trend icon component
function TrendArrow({ trend, variance }: { trend: TrendCode; variance?: number | null }) {
  if (trend === 'none') {
    return null;
  }

  // Ahead of plan - green up arrow
  if (trend === 'ahead') {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-success flex-shrink-0" />
    );
  }

  // On track (within 10%) - green up arrow
  if (trend === 'on-track') {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-success flex-shrink-0" />
    );
  }

  // At risk (10-20% behind) - warning down arrow
  if (trend === 'at-risk') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-warning flex-shrink-0" />
    );
  }

  // Off track (>20% behind) - danger down arrow
  if (trend === 'off-track') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-danger flex-shrink-0" />
    );
  }

  return null;
}

export function OkrProgressCell({ baseline, status, compact = false }: OkrProgressCellProps) {
  const { actual, trend, variance } = baseline;
  
  // Only show dash if actual is null/undefined (not just 0)
  if (actual == null) {
    return <span className="text-sm text-muted-foreground/60 text-right block">—</span>;
  }

  const barColor = getProgressBarColor(trend);

  return (
    <div className="flex items-center justify-start gap-3 w-full">
      {/* Progress bar - fixed width, left-aligned */}
      <div className={cn(
        "h-2 rounded-full overflow-hidden flex-shrink-0",
        compact ? 'w-20' : 'w-28',
        'bg-muted'
      )}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${Math.min(actual, 100)}%` }}
        />
      </div>
      
      {/* Percentage */}
      <span className="text-sm font-semibold text-foreground flex-shrink-0 min-w-[36px] text-left">
        {Math.round(actual)}%
      </span>
      
      {/* Trend arrow */}
      <TrendArrow trend={trend} variance={variance} />
    </div>
  );
}

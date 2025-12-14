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

// Get progress bar color based on status
function getProgressBarColor(status?: string, progress?: number): string {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-') || '';
  
  switch (normalizedStatus) {
    case 'on-track':
    case 'completed':
      return 'bg-secondary-green';
    case 'in-progress':
      return 'bg-brand-gold';
    case 'at-risk':
      return 'bg-[#e07830]';
    case 'off-track':
    case 'blocked':
      return 'bg-[#c44536]';
    default:
      // Fallback based on progress value
      if (progress !== undefined) {
        if (progress >= 70) return 'bg-secondary-green';
        if (progress >= 40) return 'bg-brand-gold';
        return 'bg-[#c44536]';
      }
      return 'bg-muted-foreground';
  }
}

// Trend icon component
function TrendArrow({ trend, variance }: { trend: TrendCode; variance?: number | null }) {
  if (trend === 'none') {
    return null;
  }

  // Ahead of plan - green up arrow
  if (trend === 'ahead') {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-secondary-green flex-shrink-0" />
    );
  }

  // On track (within 10%) - green up arrow
  if (trend === 'on-track') {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-secondary-green flex-shrink-0" />
    );
  }

  // At risk (10-20% behind) - orange down arrow
  if (trend === 'at-risk') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-[#e07830] flex-shrink-0" />
    );
  }

  // Off track (>20% behind) - red down arrow
  if (trend === 'off-track') {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-[#c44536] flex-shrink-0" />
    );
  }

  return null;
}

export function OkrProgressCell({ baseline, status, compact = false }: OkrProgressCellProps) {
  const { actual, trend, variance } = baseline;
  
  // Only show dash if actual is null/undefined (not just 0)
  if (actual == null) {
    return <span className="text-sm text-muted-foreground text-right block">—</span>;
  }

  const barColor = getProgressBarColor(status, actual);

  return (
    <div className="flex items-center justify-start gap-3 w-full">
      {/* Progress bar - fixed width, left-aligned */}
      <div className={cn(
        "h-2 rounded-full overflow-hidden flex-shrink-0",
        compact ? 'w-20' : 'w-28',
        'bg-[#f0ebe3]'
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

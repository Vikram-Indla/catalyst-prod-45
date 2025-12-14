// ═══════════════════════════════════════════════════════════════════════════════
// OKR Progress Cell — Shared Presentational Component
// Renders progress bar, percentage, and trend arrow
// Used by both OKRHubV1 (Objectives Table) and OKRHubV2 (Strategy Tree)
// ═══════════════════════════════════════════════════════════════════════════════

import { Progress } from '@/components/ui/progress';
import { TrendIcon } from '../TrendIcon';
import type { ProgressBaseline } from '../../lib/okrTypes';

interface OkrProgressCellProps {
  baseline: ProgressBaseline;
  compact?: boolean;
}

export function OkrProgressCell({ baseline, compact = false }: OkrProgressCellProps) {
  const { actual, trend, variance } = baseline;
  
  // Only show dash if actual is null/undefined (not just 0)
  if (actual == null) {
    return <span className="text-xs text-muted-foreground text-right block">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2 overflow-hidden">
      <Progress 
        value={Math.min(actual, 100)} 
        className={compact ? 'h-1.5 flex-1 min-w-0 max-w-16' : 'h-1.5 flex-1 min-w-0 max-w-24'}
      />
      <span className="text-xs font-semibold text-foreground flex-shrink-0 w-8 text-right">
        {Math.round(actual)}%
      </span>
      {trend !== 'none' && <TrendIcon trend={trend} variance={variance} size="sm" />}
    </div>
  );
}

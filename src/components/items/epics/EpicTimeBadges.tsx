/**
 * Epic Time Badges - Overdue & This Quarter indicators
 * Phase II Step 3: Time & Roadmap Alignment
 */

import { AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isEpicOverdue, isEpicDueThisQuarter, getQuarterLabel } from '@/lib/epic-time-utils';

interface EpicTimeBadgesProps {
  targetCompletionDate: string | null | undefined;
  status?: string | null;
  showQuarterLabel?: boolean;
  className?: string;
}

export function EpicTimeBadges({
  targetCompletionDate,
  status,
  showQuarterLabel = false,
  className,
}: EpicTimeBadgesProps) {
  const overdue = isEpicOverdue(targetCompletionDate || null, status);
  const thisQuarter = !overdue && isEpicDueThisQuarter(targetCompletionDate || null);
  const quarterLabel = getQuarterLabel(targetCompletionDate || null);

  if (!overdue && !thisQuarter && !showQuarterLabel) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {overdue && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-destructive/10 text-destructive rounded">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </span>
      )}
      
      {thisQuarter && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning rounded">
          <Clock className="h-3 w-3" />
          This Quarter
        </span>
      )}
      
      {showQuarterLabel && quarterLabel && !overdue && !thisQuarter && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
          {quarterLabel}
        </span>
      )}
    </div>
  );
}

/**
 * Small indicator for roadmap bars
 */
export function EpicOverdueIndicator({
  targetCompletionDate,
  status,
}: {
  targetCompletionDate: string | null | undefined;
  status?: string | null;
}) {
  const overdue = isEpicOverdue(targetCompletionDate || null, status);
  
  if (!overdue) return null;
  
  return (
    <div 
      className="absolute -left-0.5 top-0 bottom-0 w-1 bg-destructive rounded-l"
      title="Overdue"
    />
  );
}

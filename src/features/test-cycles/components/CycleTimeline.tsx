// ============================================================================
// CycleTimeline - Visual Gantt-style timeline with milestones
// ============================================================================

import { memo, useMemo } from 'react';
import { CheckCircle2, Flag, Calendar } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CycleDetail, CycleMilestone } from '../types/cycle-config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CycleTimelineProps {
  cycle: CycleDetail;
  milestones: CycleMilestone[];
  className?: string;
}

export const CycleTimeline = memo(function CycleTimeline({
  cycle,
  milestones,
  className,
}: CycleTimelineProps) {
  const timelineData = useMemo(() => {
    if (!cycle.planned_start || !cycle.planned_end) return null;

    const startDate = new Date(cycle.planned_start);
    const endDate = new Date(cycle.planned_end);
    const today = new Date();
    const totalDays = differenceInDays(endDate, startDate);

    if (totalDays <= 0) return null;

    const elapsedDays = differenceInDays(today, startDate);
    const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

    // Calculate milestone positions
    const milestonePositions = milestones.map((m) => {
      const mDate = new Date(m.target_date);
      const pos = (differenceInDays(mDate, startDate) / totalDays) * 100;
      const isOverdue = isBefore(mDate, today) && !m.is_completed;
      const isUpcoming = isAfter(mDate, today) && differenceInDays(mDate, today) <= 3;
      return { ...m, position: Math.min(100, Math.max(0, pos)), isOverdue, isUpcoming };
    });

    return {
      startDate,
      endDate,
      today,
      totalDays,
      progressPercent,
      milestonePositions,
      isTodayInRange: !isBefore(today, startDate) && !isAfter(today, endDate),
    };
  }, [cycle, milestones]);

  if (!timelineData) {
    return (
      <div className={cn('bg-card rounded-xl border p-6', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">No dates configured for this cycle</span>
        </div>
      </div>
    );
  }

  const { startDate, endDate, progressPercent, milestonePositions, isTodayInRange } = timelineData;

  return (
    <div className={cn('bg-card rounded-xl border p-6', className)}>
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Timeline
      </h3>

      {/* Date labels */}
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>{format(startDate, 'MMM d, yyyy')}</span>
        <span>{format(endDate, 'MMM d, yyyy')}</span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-12 bg-muted rounded-lg overflow-visible">
        {/* Progress fill */}
        <div
          className="absolute h-full bg-gradient-to-r from-primary to-primary/80 rounded-lg transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Today marker */}
        {isTodayInRange && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-destructive z-20"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-destructive whitespace-nowrap">
              Today
            </div>
          </div>
        )}

        {/* Milestones */}
        <TooltipProvider>
          {milestonePositions.map((milestone) => (
            <Tooltip key={milestone.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                  style={{ left: `${milestone.position}%` }}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full border-2 flex items-center justify-center -ml-3.5 transition-transform hover:scale-110',
                      milestone.is_completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : milestone.isOverdue
                        ? 'bg-destructive border-destructive animate-pulse'
                        : milestone.isUpcoming
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-card border-amber-500'
                    )}
                  >
                    {milestone.is_completed ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Flag
                        className={cn(
                          'w-3.5 h-3.5',
                          milestone.isOverdue || milestone.isUpcoming
                            ? 'text-white'
                            : 'text-amber-500'
                        )}
                      />
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{milestone.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                  </p>
                  {milestone.description && (
                    <p className="text-xs">{milestone.description}</p>
                  )}
                  {milestone.isOverdue && (
                    <p className="text-xs text-destructive font-medium">Overdue!</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Duration info */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{timelineData.totalDays} days total</span>
        <span>{milestones.length} milestone(s)</span>
      </div>
    </div>
  );
});

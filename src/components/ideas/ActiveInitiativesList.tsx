// ============================================================
// ACTIVE INITIATIVES LIST COMPONENT
// ============================================================

import { Calendar, Users, ArrowUpRight, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import type { ImprovementInitiative } from '@/types/improvement-ideas';
import { INITIATIVE_STATUS_LABELS } from '@/types/improvement-ideas';

interface ActiveInitiativesListProps {
  initiatives: ImprovementInitiative[];
  loading?: boolean;
  onInitiativeClick?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  collecting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  evaluating: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function ActiveInitiativesList({ initiatives, loading = false, onInitiativeClick }: ActiveInitiativesListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg border">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active initiatives</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initiatives.map((initiative) => {
        const endDate = initiative.end_date ? new Date(initiative.end_date) : null;
        const startDate = initiative.start_date ? new Date(initiative.start_date) : null;
        const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : null;
        const isExpired = endDate ? isPast(endDate) : false;
        
        // Calculate progress based on time elapsed
        let progress = 0;
        if (startDate && endDate) {
          const total = differenceInDays(endDate, startDate);
          const elapsed = differenceInDays(new Date(), startDate);
          progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        }

        return (
          <div
            key={initiative.id}
            onClick={() => onInitiativeClick?.(initiative.id)}
            className={cn(
              "p-3 rounded-lg border bg-card",
              "hover:bg-muted/50 hover:border-primary/30 cursor-pointer transition-colors",
              "group"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {initiative.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn("text-[10px] px-1.5 py-0 mt-1", statusColors[initiative.status])}
                >
                  {INITIATIVE_STATUS_LABELS[initiative.status]}
                </Badge>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            {/* Timeline Progress */}
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {startDate ? format(startDate, 'MMM d') : 'No start'}
                  {' → '}
                  {endDate ? format(endDate, 'MMM d') : 'Ongoing'}
                </span>
                {daysRemaining !== null && (
                  <span className={cn(
                    isExpired ? "text-red-600" : 
                    daysRemaining <= 7 ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {isExpired ? 'Ended' : `${daysRemaining}d left`}
                  </span>
                )}
              </div>
              <Progress 
                value={progress} 
                className="h-1.5"
              />
            </div>

            {/* Stats */}
            {(initiative.idea_count !== undefined || initiative.vote_count !== undefined) && (
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {initiative.idea_count !== undefined && (
                  <span>{initiative.idea_count} ideas</span>
                )}
                {initiative.vote_count !== undefined && (
                  <span>{initiative.vote_count} votes</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Prompt 7: Performance Optimizations
 * Skeleton loading component for capacity planner with dark mode support
 */

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CapacityPlannerSkeletonProps {
  view?: 'cards' | 'table' | 'timeline' | 'heatmap';
  count?: number;
  className?: string;
}

export function CapacityPlannerSkeleton({
  view = 'cards',
  count = 12,
  className
}: CapacityPlannerSkeletonProps) {
  if (view === 'table') {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Table header skeleton */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 dark:bg-muted/20 rounded-lg">
          <Skeleton className="h-4 w-32 dark:bg-muted" />
          <Skeleton className="h-4 w-24 dark:bg-muted" />
          <Skeleton className="h-4 w-20 dark:bg-muted" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16 dark:bg-muted" />
        </div>
        
        {/* Table rows skeleton */}
        {Array.from({ length: count }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (view === 'timeline') {
    return (
      <div className={cn("bg-card dark:bg-card rounded-xl border border-border overflow-hidden", className)}>
        {/* Timeline header */}
        <div className="flex border-b border-border">
          <div className="w-[220px] h-12 bg-muted/50 dark:bg-muted/20" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[150px] h-12 bg-muted/30 dark:bg-muted/10 border-l border-border" />
          ))}
        </div>
        
        {/* Timeline rows */}
        {Array.from({ length: count }).map((_, i) => (
          <TimelineRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (view === 'heatmap') {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Heatmap header */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-48 dark:bg-muted" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-10 dark:bg-muted" />
          ))}
        </div>
        
        {/* Heatmap rows */}
        {Array.from({ length: count }).map((_, i) => (
          <HeatmapRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Cards view (default)
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card dark:bg-card border border-border rounded-lg p-4 space-y-3 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted dark:bg-muted/50" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 bg-muted dark:bg-muted/50 rounded" />
          <div className="h-3 w-1/2 bg-muted/70 dark:bg-muted/30 rounded" />
        </div>
        <div className="h-6 w-12 rounded-full bg-muted dark:bg-muted/50" />
      </div>
      
      {/* Timeline */}
      <div className="h-8 w-full rounded bg-muted/50 dark:bg-muted/30" />
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 bg-muted dark:bg-muted/50 rounded" />
        <div className="h-6 w-16 bg-muted/70 dark:bg-muted/30 rounded" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 border border-border rounded-lg animate-pulse">
      <div className="h-8 w-8 rounded-full bg-muted dark:bg-muted/50" />
      <div className="h-4 w-32 bg-muted dark:bg-muted/50 rounded" />
      <div className="h-4 w-24 bg-muted/70 dark:bg-muted/30 rounded" />
      <div className="h-4 w-20 bg-muted/50 dark:bg-muted/20 rounded" />
      <div className="flex-1">
        <div className="h-6 w-full rounded bg-muted/30 dark:bg-muted/20" />
      </div>
      <div className="h-6 w-16 bg-muted dark:bg-muted/50 rounded" />
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex border-b border-border last:border-b-0 animate-pulse">
      <div className="w-[220px] h-16 bg-card dark:bg-card flex items-center gap-3 px-4">
        <div className="w-10 h-10 rounded-full bg-muted dark:bg-muted/50" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 bg-muted dark:bg-muted/50 rounded" />
          <div className="h-2 w-1/2 bg-muted/70 dark:bg-muted/30 rounded" />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[150px] h-16 bg-card dark:bg-card border-l border-border" />
      ))}
    </div>
  );
}

function HeatmapRowSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="h-5 w-48 bg-muted dark:bg-muted/50 rounded" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-8 w-10 rounded bg-muted/50 dark:bg-muted/30" />
      ))}
    </div>
  );
}

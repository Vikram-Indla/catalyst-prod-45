/**
 * Prompt 7: Performance Optimizations
 * Skeleton loading component for capacity planner
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
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
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
      <div className={cn("space-y-3", className)}>
        {/* Timeline header */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48" />
          <div className="flex-1 flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-6 flex-1" />
            ))}
          </div>
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
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-10" />
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
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      
      {/* Timeline */}
      <Skeleton className="h-8 w-full rounded" />
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 border border-border rounded-lg">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
      <div className="flex-1">
        <Skeleton className="h-6 w-full rounded" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-48 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      </div>
      <div className="flex-1 flex gap-0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded" />
        ))}
      </div>
    </div>
  );
}

function HeatmapRowSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-48" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-10 rounded" />
      ))}
    </div>
  );
}

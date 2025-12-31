/**
 * For You Table Skeleton - Loading state with 7 columns
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ForYouTableSkeletonProps {
  rowCount?: number;
}

export function ForYouTableSkeleton({ rowCount = 5 }: ForYouTableSkeletonProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="grid grid-cols-[40px_100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3 bg-surface-1 border-b border-border">
        <div className="w-4 h-4 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-12 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-16 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-10 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-10 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-14 bg-surface-3 rounded animate-pulse" />
        <div className="h-3 w-16 bg-surface-3 rounded animate-pulse" />
      </div>

      {/* Group Header Skeleton */}
      <div className="px-4 py-2.5 bg-surface-0 border-l-[3px] border-surface-3">
        <div className="h-3 w-20 bg-surface-3 rounded animate-pulse" />
      </div>

      {/* Rows Skeleton */}
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "grid grid-cols-[40px_100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3",
            "border-b border-border-subtle",
            index === rowCount - 1 && "border-b-0"
          )}
        >
          {/* Checkbox */}
          <div className="flex items-center">
            <div className="w-4 h-4 bg-surface-3 rounded animate-pulse" />
          </div>
          
          {/* Key */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 bg-surface-3 rounded-full animate-pulse" />
            <div className="h-4 w-14 bg-surface-3 rounded animate-pulse" />
          </div>

          {/* Summary */}
          <div className="flex items-center">
            <div className="h-4 w-3/4 bg-surface-3 rounded animate-pulse" />
          </div>

          {/* Mode */}
          <div className="flex items-center">
            <div className="h-5 w-10 bg-surface-3 rounded animate-pulse" />
          </div>

          {/* Level */}
          <div className="flex items-center">
            <div className="h-4 w-14 bg-surface-3 rounded animate-pulse" />
          </div>

          {/* Updated */}
          <div className="flex items-center">
            <div className="h-4 w-12 bg-surface-3 rounded animate-pulse" />
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-surface-3 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-surface-3 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

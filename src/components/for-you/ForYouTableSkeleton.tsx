/**
 * For You Table Skeleton - Loading state (CATALYST10 v3 spec)
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ForYouTableSkeletonProps {
  rowCount?: number;
}

export function ForYouTableSkeleton({ rowCount = 5 }: ForYouTableSkeletonProps) {
  return (
    <div className="border border-[hsl(214,32%,91%)] rounded-lg overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="grid grid-cols-[40px_120px_1fr_80px_80px_160px] gap-4 px-4 py-3 bg-[hsl(210,40%,98%)] border-b border-[hsl(214,32%,91%)]">
        <div className="w-4 h-4 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
        <div className="h-3 w-12 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
        <div className="h-3 w-16 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
        <div className="h-3 w-10 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
        <div className="h-3 w-10 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
        <div className="h-3 w-16 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
      </div>

      {/* Group Header Skeleton */}
      <div className="px-4 py-2 bg-[hsl(210,40%,98%)] border-l-[3px] border-[hsl(210,40%,93%)]">
        <div className="h-3 w-20 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
      </div>

      {/* Rows Skeleton */}
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "grid grid-cols-[40px_120px_1fr_80px_80px_160px] gap-4 px-4 py-3",
            "border-b border-[hsl(210,40%,96%)]",
            index === rowCount - 1 && "border-b-0"
          )}
        >
          <div className="flex items-center">
            <div className="w-[15px] h-[15px] bg-[hsl(210,40%,93%)] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[hsl(210,40%,93%)] rounded-[2px] animate-pulse" />
            <div className="h-4 w-14 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
          </div>
          <div className="flex items-center">
            <div className="h-4 w-3/4 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
          </div>
          <div className="flex items-center">
            <div className="h-5 w-10 bg-[hsl(210,40%,93%)] rounded-[5px] animate-pulse" />
          </div>
          <div className="flex items-center">
            <div className="h-4 w-8 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[hsl(210,40%,93%)] rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-[hsl(210,40%,93%)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

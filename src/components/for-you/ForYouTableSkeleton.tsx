/**
 * For You Table Skeleton - Loading state (CATALYST10 v3 spec)
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ForYouTableSkeletonProps {
  rowCount?: number;
}

export function ForYouTableSkeleton({ rowCount = 5 }: ForYouTableSkeletonProps) {
  const skeletonBlockStyle: React.CSSProperties = {
    background: 'var(--ds-background-neutral-subtle)',
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--ds-border)',
        background: 'var(--ds-surface)',
      }}
    >
      {/* Table Header Skeleton */}
      <div
        className="grid grid-cols-[40px_120px_1fr_80px_80px_160px] gap-4 px-4 py-3"
        style={{
          background: 'var(--ds-surface)',
          borderBottom: '1px solid var(--ds-border)',
        }}
      >
        <div className="w-4 h-4 rounded animate-pulse" style={skeletonBlockStyle} />
        <div className="h-3 w-12 rounded animate-pulse" style={skeletonBlockStyle} />
        <div className="h-3 w-16 rounded animate-pulse" style={skeletonBlockStyle} />
        <div className="h-3 w-10 rounded animate-pulse" style={skeletonBlockStyle} />
        <div className="h-3 w-10 rounded animate-pulse" style={skeletonBlockStyle} />
        <div className="h-3 w-16 rounded animate-pulse" style={skeletonBlockStyle} />
      </div>

      {/* Group Header Skeleton */}
      <div
        className="px-4 py-2 border-l-[3px]"
        style={{
          background: 'var(--ds-surface)',
          borderLeftColor: 'var(--cp-bd-zone)',
          borderTop: '1px solid var(--cp-bd-zone)',
          borderBottom: '1px solid var(--cp-bd-zone)',
        }}
      >
        <div className="h-3 w-20 rounded animate-pulse" style={skeletonBlockStyle} />
      </div>

      {/* Rows Skeleton */}
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "grid grid-cols-[40px_120px_1fr_80px_80px_160px] gap-4 px-4 py-3",
            index === rowCount - 1 && "border-b-0"
          )}
          style={{
            borderBottom: index === rowCount - 1 ? 'none' : '1px solid var(--cp-bd-table)',
            background: 'var(--ds-surface)',
          }}
        >
          <div className="flex items-center">
            <div className="w-[15px] h-[15px] rounded animate-pulse" style={skeletonBlockStyle} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-14 rounded animate-pulse" style={skeletonBlockStyle} />
          </div>
          <div className="flex items-center">
            <div className="h-4 w-3/4 rounded animate-pulse" style={skeletonBlockStyle} />
          </div>
          <div className="flex items-center">
            <div className="h-5 w-10 rounded-[5px] animate-pulse" style={skeletonBlockStyle} />
          </div>
          <div className="flex items-center">
            <div className="h-4 w-8 rounded animate-pulse" style={skeletonBlockStyle} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full animate-pulse" style={skeletonBlockStyle} />
            <div className="h-4 w-20 rounded animate-pulse" style={skeletonBlockStyle} />
          </div>
        </div>
      ))}
    </div>
  );
}

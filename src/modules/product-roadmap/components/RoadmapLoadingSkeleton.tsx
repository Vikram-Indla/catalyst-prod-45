/**
 * Loading skeleton for roadmap
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function RoadmapLoadingSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* List panel skeleton */}
        <div className="w-[360px] border-r border-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-b border-border">
              <Skeleton className="h-4 w-4" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>

        {/* Timeline panel skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Timeline header */}
          <div className="flex border-b border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 p-2 border-r border-border last:border-r-0">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Timeline rows */}
          <div className="flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[52px] border-b border-border flex items-center px-4">
                <Skeleton 
                  className="h-8 rounded" 
                  style={{ 
                    width: `${Math.random() * 40 + 20}%`,
                    marginLeft: `${Math.random() * 30}%`
                  }} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

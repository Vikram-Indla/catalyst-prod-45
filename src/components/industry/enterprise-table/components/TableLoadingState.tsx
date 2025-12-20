import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface TableLoadingStateProps {
  type?: 'skeleton' | 'spinner' | 'overlay';
  columnCount?: number;
  rowCount?: number;
  className?: string;
}

export function TableLoadingState({
  type = 'skeleton',
  columnCount = 5,
  rowCount = 5,
  className,
}: TableLoadingStateProps) {
  if (type === 'spinner') {
    return (
      <div className={cn(
        "flex items-center justify-center py-16",
        className
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (type === 'overlay') {
    return (
      <div className={cn(
        "absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10",
        className
      )}>
        <div className="flex items-center gap-3 bg-card px-4 py-3 rounded-lg shadow-lg border">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Skeleton loading
  return (
    <div className={cn("w-full", className)}>
      {/* Header skeleton */}
      <div className="flex gap-4 px-4 py-3 bg-muted/30 border-b">
        {Array.from({ length: columnCount }).map((_, i) => (
          <Skeleton 
            key={`header-${i}`} 
            className={cn(
              "h-4",
              i === 0 ? "w-8" : "flex-1"
            )} 
          />
        ))}
      </div>
      
      {/* Row skeletons */}
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className="flex gap-4 px-4 py-3 border-b border-border/50"
        >
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                "h-4",
                colIndex === 0 ? "w-8" : "flex-1",
                // Vary widths for visual interest
                colIndex % 3 === 0 && "w-3/4",
                colIndex % 3 === 1 && "w-1/2"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Inline row loading (for lazy loading more rows)
export function TableRowLoadingState({ columnCount = 5 }: { columnCount?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columnCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

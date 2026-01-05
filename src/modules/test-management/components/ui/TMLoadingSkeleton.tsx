/**
 * TMLoadingSkeleton - Loading skeleton variants for Test Management
 */

import { cn } from '@/lib/utils';

interface TMLoadingSkeletonProps {
  variant?: 'card' | 'table' | 'list' | 'text' | 'chart';
  rows?: number;
  className?: string;
}

export function TMLoadingSkeleton({ 
  variant = 'card', 
  rows = 3,
  className 
}: TMLoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4 animate-pulse', className)}>
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-8 bg-muted rounded w-1/2 mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }
  
  if (variant === 'table') {
    return (
      <div className={cn('rounded-lg border border-border bg-card overflow-hidden animate-pulse', className)}>
        <div className="h-10 bg-surface-2 border-b border-border" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/6" />
            <div className="h-4 bg-muted rounded w-1/5" />
          </div>
        ))}
      </div>
    );
  }
  
  if (variant === 'list') {
    return (
      <div className={cn('space-y-3 animate-pulse', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (variant === 'chart') {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4 animate-pulse', className)}>
        <div className="h-4 bg-muted rounded w-1/4 mb-4" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }
  
  // text variant
  return (
    <div className={cn('space-y-2 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-muted rounded"
          style={{ width: `${100 - (i * 15)}%` }}
        />
      ))}
    </div>
  );
}

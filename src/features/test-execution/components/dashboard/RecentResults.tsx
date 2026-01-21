/**
 * Module 3B-3: Recent test results stream
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertCircle, SkipForward } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RecentResult, ResultStatus } from '../../types/progress-dashboard';

interface RecentResultsProps {
  results: RecentResult[];
  className?: string;
  maxHeight?: number;
}

export function RecentResults({ 
  results, 
  className,
  maxHeight = 300 
}: RecentResultsProps) {
  const getResultIcon = (result: ResultStatus) => {
    switch (result) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-foreground">Recent Results</h3>
      
      <ScrollArea style={{ height: maxHeight }}>
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-24 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">No results yet</p>
          </div>
        ) : (
          <div className="space-y-2 pr-4">
            {results.map((result, index) => (
              <div
                key={result.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-card p-3 transition-all',
                  index === 0 && 'animate-in slide-in-from-top-2 duration-300'
                )}
              >
                {getResultIcon(result.result)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {result.case_number}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">
                    {result.title}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">
                    {formatDuration(result.duration_seconds)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(result.completed_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

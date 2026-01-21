/**
 * Module 3B-1: Overall execution progress display
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Zap,
  TrendingUp
} from 'lucide-react';
import type { ParallelRunProgress } from '../../types/parallel-runner';

interface ExecutionProgressProps {
  progress: ParallelRunProgress | null;
  className?: string;
}

export function ExecutionProgress({ progress, className }: ExecutionProgressProps) {
  if (!progress) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No execution data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const passRate = progress.completed > 0 
    ? (((progress.completed - progress.failed) / progress.completed) * 100)
    : 0;

  const formatETA = (seconds: number | null) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Execution Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.completed} of {progress.total} tests
            </span>
            <span className="font-semibold text-primary">
              {progress.progress_percentage?.toFixed(1) || 0}%
            </span>
          </div>
          <Progress 
            value={progress.progress_percentage || 0} 
            className="h-3 [&>div]:bg-primary"
          />
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Queued</span>
            </div>
            <span className="text-xl font-bold">{progress.queued}</span>
          </div>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Running</span>
            </div>
            <span className="text-xl font-bold text-primary">{progress.running}</span>
          </div>

          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 text-success mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Passed</span>
            </div>
            <span className="text-xl font-bold text-success">
              {progress.completed - progress.failed}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Failed</span>
            </div>
            <span className="text-xl font-bold text-destructive">{progress.failed}</span>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Pass Rate: </span>
              <span className={cn(
                'font-semibold',
                passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-destructive'
              )}>
                {passRate.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Workers: </span>
              <span className="font-semibold">{progress.max_workers}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">ETA:</span>
            <span className="font-semibold">
              {formatETA(progress.estimated_remaining_seconds)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

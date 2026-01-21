/**
 * Module 3B-3: Worker activity status card
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Cpu, AlertCircle, Pause, CheckCircle } from 'lucide-react';
import type { WorkerActivity } from '../../types/progress-dashboard';

interface WorkerActivityCardProps {
  worker: WorkerActivity;
  className?: string;
}

export function WorkerActivityCard({ worker, className }: WorkerActivityCardProps) {
  const getStatusIcon = () => {
    switch (worker.status) {
      case 'running':
        return <Cpu className="h-4 w-4 text-primary animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (worker.status) {
      case 'running':
        return 'Running';
      case 'error':
        return 'Error';
      case 'paused':
        return 'Paused';
      default:
        return 'Idle';
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 transition-all',
        worker.status === 'running' && 'border-primary/30 bg-primary/5',
        !worker.is_healthy && 'border-destructive/30 bg-destructive/5',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              worker.status === 'running' ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            <span className="text-sm font-bold text-foreground">
              {worker.worker_number}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className="text-sm font-medium text-foreground">
                Worker {worker.worker_number}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{getStatusLabel()}</span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {worker.completed_count} <span className="text-muted-foreground">done</span>
          </p>
          {worker.failed_count > 0 && (
            <p className="text-xs text-destructive">{worker.failed_count} failed</p>
          )}
        </div>
      </div>

      {worker.current_test && worker.status === 'running' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground truncate">
            <span className="font-mono">{worker.current_test.case_number}</span>
            {' - '}
            {worker.current_test.title}
          </p>
          <Progress value={worker.progress} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

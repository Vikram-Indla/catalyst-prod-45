/**
 * Module 3B-1: Individual worker status card
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Clock,
  Heart
} from 'lucide-react';
import type { WorkerState, WORKER_STATUS_STYLES } from '../../types/parallel-runner';

const statusStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  idle: { 
    bg: 'bg-muted/50', 
    text: 'text-muted-foreground', 
    border: 'border-border',
    icon: <Pause className="h-3.5 w-3.5" />
  },
  running: { 
    bg: 'bg-primary/10', 
    text: 'text-primary', 
    border: 'border-primary/50',
    icon: <Play className="h-3.5 w-3.5" />
  },
  paused: { 
    bg: 'bg-warning/10', 
    text: 'text-warning', 
    border: 'border-warning/50',
    icon: <Pause className="h-3.5 w-3.5" />
  },
  error: { 
    bg: 'bg-destructive/10', 
    text: 'text-destructive', 
    border: 'border-destructive/50',
    icon: <AlertCircle className="h-3.5 w-3.5" />
  },
  terminated: { 
    bg: 'bg-muted', 
    text: 'text-muted-foreground', 
    border: 'border-border',
    icon: <XCircle className="h-3.5 w-3.5" />
  },
};

interface WorkerCardProps {
  worker: WorkerState;
  isCompact?: boolean;
}

export function WorkerCard({ worker, isCompact = false }: WorkerCardProps) {
  const style = statusStyles[worker.status] || statusStyles.idle;
  const totalTests = worker.completed_count + worker.failed_count;
  const passRate = totalTests > 0 ? ((worker.completed_count / totalTests) * 100) : 0;

  return (
    <Card 
      className={cn(
        'transition-all duration-300',
        style.border,
        worker.status === 'running' && 'animate-pulse'
      )}
    >
      <CardContent className={cn('p-3', isCompact && 'p-2')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', style.bg)}>
              <Cpu className={cn('h-4 w-4', style.text)} />
            </div>
            <span className="font-medium text-sm">Worker {worker.worker_number}</span>
          </div>
          <Badge variant="outline" className={cn('text-xs', style.bg, style.text)}>
            {style.icon}
            <span className="ml-1 capitalize">{worker.status}</span>
          </Badge>
        </div>

        {/* Current Test */}
        {worker.current_test && (
          <div className="mb-2 p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Play className="h-3 w-3 text-primary" />
              <span>Executing:</span>
            </div>
            <p className="text-sm font-medium truncate">{worker.current_test.case_number}</p>
            <p className="text-xs text-muted-foreground truncate">{worker.current_test.title}</p>
          </div>
        )}

        {/* Stats */}
        {!isCompact && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center p-1.5 rounded bg-muted/30">
              <div className="flex items-center justify-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                <span className="text-sm font-semibold">{worker.completed_count}</span>
              </div>
              <span className="text-xs text-muted-foreground">Passed</span>
            </div>
            <div className="text-center p-1.5 rounded bg-muted/30">
              <div className="flex items-center justify-center gap-1 text-destructive">
                <XCircle className="h-3 w-3" />
                <span className="text-sm font-semibold">{worker.failed_count}</span>
              </div>
              <span className="text-xs text-muted-foreground">Failed</span>
            </div>
            <div className="text-center p-1.5 rounded bg-muted/30">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-sm font-semibold">{worker.total_execution_time}s</span>
              </div>
              <span className="text-xs text-muted-foreground">Time</span>
            </div>
          </div>
        )}

        {/* Pass Rate Progress */}
        {totalTests > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pass Rate</span>
              <span className={cn(
                'font-medium',
                passRate >= 80 ? 'text-success' : passRate >= 60 ? 'text-warning' : 'text-destructive'
              )}>
                {passRate.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={passRate} 
              className={cn(
                'h-1.5',
                passRate >= 80 ? '[&>div]:bg-success' : passRate >= 60 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'
              )}
            />
          </div>
        )}

        {/* Health Indicator */}
        <div className="flex items-center justify-end mt-2 gap-1">
          <Heart className={cn(
            'h-3 w-3',
            worker.is_healthy ? 'text-success fill-success' : 'text-destructive'
          )} />
          <span className={cn(
            'text-xs',
            worker.is_healthy ? 'text-success' : 'text-destructive'
          )}>
            {worker.is_healthy ? 'Healthy' : 'Unhealthy'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

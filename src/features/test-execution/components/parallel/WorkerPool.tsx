/**
 * Module 3B-1: Worker pool grid display
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Users } from 'lucide-react';
import { WorkerCard } from './WorkerCard';
import type { WorkerState } from '../../types/parallel-runner';

interface WorkerPoolProps {
  workers: WorkerState[];
  canAddWorker: boolean;
  canRemoveWorker: boolean;
  onAddWorker: () => void;
  onRemoveWorker: (workerId: string) => void;
  isRunning?: boolean;
  className?: string;
}

export function WorkerPool({
  workers,
  canAddWorker,
  canRemoveWorker,
  onAddWorker,
  onRemoveWorker,
  isRunning = false,
  className,
}: WorkerPoolProps) {
  const idleWorkers = workers.filter(w => w.status === 'idle');
  const runningWorkers = workers.filter(w => w.status === 'running');
  const errorWorkers = workers.filter(w => w.status === 'error');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Worker Pool</h3>
          <span className="text-sm text-muted-foreground">
            ({runningWorkers.length}/{workers.length} active)
          </span>
        </div>

        {/* Worker Controls */}
        {!isRunning && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const idleWorker = idleWorkers[idleWorkers.length - 1];
                if (idleWorker && canRemoveWorker) {
                  onRemoveWorker(idleWorker.id);
                }
              }}
              disabled={!canRemoveWorker || idleWorkers.length === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-8 text-center">{workers.length}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddWorker}
              disabled={!canAddWorker}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Idle: {idleWorkers.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-primary">Running: {runningWorkers.length}</span>
        </div>
        {errorWorkers.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-destructive">Error: {errorWorkers.length}</span>
          </div>
        )}
      </div>

      {/* Worker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {workers.map(worker => (
          <WorkerCard 
            key={worker.id} 
            worker={worker}
            isCompact={workers.length > 3}
          />
        ))}
      </div>
    </div>
  );
}

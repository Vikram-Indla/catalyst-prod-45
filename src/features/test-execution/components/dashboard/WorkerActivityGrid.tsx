/**
 * Module 3B-3: Grid of worker activity cards
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { WorkerActivityCard } from './WorkerActivityCard';
import type { WorkerActivity } from '../../types/progress-dashboard';

interface WorkerActivityGridProps {
  workers: WorkerActivity[];
  className?: string;
}

export function WorkerActivityGrid({ workers, className }: WorkerActivityGridProps) {
  if (workers.length === 0) {
    return (
      <div className={cn('rounded-lg border bg-card p-6 text-center', className)}>
        <p className="text-sm text-muted-foreground">No workers active</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-foreground">Worker Activity</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <WorkerActivityCard key={worker.id} worker={worker} />
        ))}
      </div>
    </div>
  );
}

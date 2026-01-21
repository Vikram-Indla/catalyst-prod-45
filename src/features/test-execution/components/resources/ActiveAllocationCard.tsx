/**
 * Module 3B-4: Active allocation card with progress ring
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressRing } from '../dashboard/ProgressRing';
import type { ActiveAllocation } from '../../types/resource-allocation';

interface ActiveAllocationCardProps {
  allocation: ActiveAllocation;
  onRelease?: (runId: string) => void;
}

const statusColors: Record<string, string> = {
  running: 'bg-success/10 text-success border-success/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
};

export function ActiveAllocationCard({ allocation, onRelease }: ActiveAllocationCardProps) {
  const statusColor = statusColors[allocation.run.status] || 'bg-muted';

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <ProgressRing
            percentage={allocation.run.progress || 0}
            size={64}
            strokeWidth={6}
            showLabel={true}
          />

          {/* Run Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">
                #{allocation.run.run_number}
              </span>
              <Badge variant="outline" className={cn('text-xs', statusColor)}>
                {allocation.run.status}
              </Badge>
            </div>
            <h3 className="font-medium truncate">{allocation.run.name}</h3>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Server className="h-3 w-3" />
                {allocation.environment.name}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {allocation.workers_allocated} worker(s)
              </span>
              {allocation.pool && (
                <span>Pool: {allocation.pool.name}</span>
              )}
            </div>
          </div>

          {/* Release Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onRelease?.(allocation.run.id)}
            aria-label="Release allocation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

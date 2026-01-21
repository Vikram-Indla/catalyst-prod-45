/**
 * Module 3B-4: Individual environment card component
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Plus, Minus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CapacityBar } from './CapacityBar';
import type { Environment, STATUS_CONFIGS } from '../../types/resource-allocation';

interface EnvironmentCardProps {
  environment: Environment;
  onAllocate?: (envId: string) => void;
  onDeallocate?: (envId: string) => void;
}

const statusConfigs = {
  available: { label: 'Available', className: 'bg-success/10 text-success border-success/20' },
  maintenance: { label: 'Maintenance', className: 'bg-warning/10 text-warning border-warning/20' },
  restricted: { label: 'Restricted', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  offline: { label: 'Offline', className: 'bg-muted text-muted-foreground' },
};

export function EnvironmentCard({
  environment,
  onAllocate,
  onDeallocate,
}: EnvironmentCardProps) {
  const statusConfig = statusConfigs[environment.status];
  const isAvailable = environment.status === 'available';
  const canAllocate = isAvailable && environment.available > 0;
  const canDeallocate = environment.allocated > 0;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'p-2 rounded-lg',
              isAvailable ? 'bg-success/10' : 'bg-muted'
            )}>
              <Server className={cn(
                'h-5 w-5',
                isAvailable ? 'text-success' : 'text-muted-foreground'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{environment.name}</h3>
                <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              {environment.description && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {environment.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{environment.active_runs} active run(s)</span>
                {environment.url && (
                  <a
                    href={environment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!canDeallocate}
                onClick={() => onDeallocate?.(environment.id)}
                aria-label="Remove worker"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-12 text-center text-sm font-medium">
                {environment.allocated}/{environment.capacity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!canAllocate}
                onClick={() => onAllocate?.(environment.id)}
                aria-label="Add worker"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="w-32">
              <CapacityBar
                allocated={environment.allocated}
                capacity={environment.capacity}
                showLabel={false}
                size="sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

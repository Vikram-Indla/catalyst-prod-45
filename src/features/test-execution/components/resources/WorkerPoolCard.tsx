/**
 * Module 3B-4: Worker pool card with visual worker icons
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CapacityBar } from './CapacityBar';
import type { WorkerPool } from '../../types/resource-allocation';

interface WorkerPoolCardProps {
  pool: WorkerPool;
  onSelect?: (poolId: string) => void;
  isSelected?: boolean;
}

export function WorkerPoolCard({ pool, onSelect, isSelected }: WorkerPoolCardProps) {
  return (
    <Card 
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onSelect?.(pool.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{pool.name}</h3>
            {pool.is_default && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            P{pool.priority}
          </span>
        </div>

        {pool.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {pool.description}
          </p>
        )}

        {/* Worker Icons */}
        <div className="flex flex-wrap gap-1 mb-3">
          {[...Array(pool.total_workers)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'p-1 rounded transition-colors',
                i < pool.assigned_workers
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
              title={i < pool.assigned_workers ? 'Assigned' : 'Available'}
            >
              <User className="h-3 w-3" />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{pool.available_workers} available</span>
          <span>{pool.assigned_workers} assigned</span>
        </div>

        <CapacityBar
          allocated={pool.assigned_workers}
          capacity={pool.total_workers}
          showLabel={false}
          size="sm"
        />
      </CardContent>
    </Card>
  );
}

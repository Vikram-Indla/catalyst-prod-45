/**
 * Module 3B-4: Worker pools grid component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { WorkerPoolCard } from './WorkerPoolCard';
import type { WorkerPool } from '../../types/resource-allocation';

interface WorkerPoolGridProps {
  pools: WorkerPool[];
  isLoading?: boolean;
  selectedPoolId?: string;
  onSelectPool?: (poolId: string) => void;
}

export function WorkerPoolGrid({
  pools,
  isLoading,
  selectedPoolId,
  onSelectPool,
}: WorkerPoolGridProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Pools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Pools
          <span className="text-sm font-normal text-muted-foreground">
            ({pools.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No worker pools configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool) => (
              <WorkerPoolCard
                key={pool.id}
                pool={pool}
                isSelected={selectedPoolId === pool.id}
                onSelect={onSelectPool}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Module 3B-4: Active allocations list component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { ActiveAllocationCard } from './ActiveAllocationCard';
import type { ActiveAllocation } from '../../types/resource-allocation';

interface ActiveAllocationsProps {
  allocations: ActiveAllocation[];
  isLoading?: boolean;
  onRelease?: (runId: string) => void;
}

export function ActiveAllocations({
  allocations,
  isLoading,
  onRelease,
}: ActiveAllocationsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Allocations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
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
          <Activity className="h-5 w-5" />
          Active Allocations
          <span className="text-sm font-normal text-muted-foreground">
            ({allocations.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active allocations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allocations.map((allocation) => (
              <ActiveAllocationCard
                key={allocation.id}
                allocation={allocation}
                onRelease={onRelease}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

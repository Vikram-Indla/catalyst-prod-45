/**
 * Module 3B-4: Resource summary cards component
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Users, Activity, Layers } from 'lucide-react';
import { CapacityBar } from './CapacityBar';
import type { ResourceSummary } from '../../types/resource-allocation';

interface ResourceSummaryCardsProps {
  summary: ResourceSummary | null;
  isLoading?: boolean;
}

export function ResourceSummaryCards({ summary, isLoading }: ResourceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-2 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Environments',
      value: summary?.environments.available ?? 0,
      subtitle: `of ${summary?.environments.total ?? 0} available`,
      icon: Server,
      capacity: {
        allocated: summary?.environments.total_allocated ?? 0,
        total: summary?.environments.total_capacity ?? 0,
      },
    },
    {
      title: 'Workers',
      value: summary?.worker_pools.available_workers ?? 0,
      subtitle: `of ${summary?.worker_pools.total_workers ?? 0} available`,
      icon: Users,
      capacity: {
        allocated: summary?.worker_pools.assigned_workers ?? 0,
        total: summary?.worker_pools.total_workers ?? 0,
      },
    },
    {
      title: 'Active Runs',
      value: summary?.active_runs ?? 0,
      subtitle: 'currently executing',
      icon: Activity,
    },
    {
      title: 'Worker Pools',
      value: summary?.worker_pools.total_pools ?? 0,
      subtitle: 'configured',
      icon: Layers,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            {card.capacity && (
              <div className="mt-3">
                <CapacityBar
                  allocated={card.capacity.allocated}
                  capacity={card.capacity.total}
                  size="sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

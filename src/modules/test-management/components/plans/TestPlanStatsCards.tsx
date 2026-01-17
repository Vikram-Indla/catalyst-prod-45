/**
 * TestPlanStatsCards - Stats overview cards for a test plan
 * Catalyst V5 design tokens
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Bug, Percent, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { TestPlanStats } from '../../hooks/useTestPlans';

interface TestPlanStatsCardsProps {
  stats: TestPlanStats | undefined;
  isLoading?: boolean;
}

export function TestPlanStatsCards({ stats, isLoading }: TestPlanStatsCardsProps) {
  const cards = [
    {
      label: 'Total Tests',
      value: stats?.total_tests ?? 0,
      icon: Target,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Passed',
      value: stats?.passed ?? 0,
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Failed',
      value: stats?.failed ?? 0,
      icon: XCircle,
      iconBg: 'bg-danger/10',
      iconColor: 'text-danger',
      valueColor: stats?.failed ? 'text-danger' : 'text-muted-foreground',
    },
    {
      label: 'Blocked',
      value: stats?.blocked ?? 0,
      icon: AlertTriangle,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      valueColor: stats?.blocked ? 'text-warning' : 'text-muted-foreground',
    },
    {
      label: 'Pass Rate',
      value: `${stats?.pass_rate ?? 0}%`,
      icon: Percent,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: (stats?.pass_rate ?? 0) >= 80 
        ? 'text-success' 
        : (stats?.pass_rate ?? 0) >= 60 
          ? 'text-warning' 
          : 'text-danger',
    },
    {
      label: 'Open Defects',
      value: stats?.open_defects ?? 0,
      icon: Bug,
      iconBg: 'bg-danger/10',
      iconColor: 'text-danger',
      valueColor: stats?.open_defects ? 'text-danger' : 'text-muted-foreground',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className={cn('text-2xl font-semibold mt-1', card.valueColor)}>
                {card.value}
              </p>
            </div>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.iconBg)}>
              <card.icon className={cn('w-5 h-5', card.iconColor)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TestPlanStatsCards;

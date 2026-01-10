/**
 * CycleStatsCards - Stats overview cards for test cycles
 * Based on Catalyst V5 Phase 5 spec
 */

import React from 'react';
import { RefreshCw, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CycleStats {
  total: number;
  inProgress: number;
  completed: number;
  passRate: number;
}

interface CycleStatsCardsProps {
  stats: CycleStats;
  isLoading?: boolean;
}

export function CycleStatsCards({ stats, isLoading }: CycleStatsCardsProps) {
  const cards = [
    {
      label: 'Total Cycles',
      value: stats.total,
      icon: RefreshCw,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Zap,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
      valueColor: 'text-info',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: BarChart3,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      valueColor: stats.passRate >= 80 ? 'text-success' : stats.passRate >= 60 ? 'text-warning' : 'text-danger',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-4 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-20 bg-muted rounded mb-2" />
                <div className="h-8 w-12 bg-muted rounded" />
              </div>
              <div className="w-10 h-10 bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
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

export default CycleStatsCards;

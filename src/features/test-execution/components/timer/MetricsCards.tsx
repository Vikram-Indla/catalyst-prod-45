/**
 * Module 3A-5: Metrics Cards Display
 */
import React from 'react';
import { Clock, Zap, TrendingUp, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RunMetrics } from '../../types/timer-metrics';

interface MetricsCardsProps {
  metrics: RunMetrics | null;
  isLoading?: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = React.memo(({
  metrics,
  isLoading,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Pass Rate',
      value: `${metrics.pass_rate}%`,
      icon: Target,
      color: metrics.pass_rate >= 80 ? 'text-green-600' : metrics.pass_rate >= 50 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: 'Velocity',
      value: `${metrics.velocity_per_hour}/hr`,
      icon: Zap,
      color: 'text-blue-600',
    },
    {
      label: 'Avg Duration',
      value: formatDuration(metrics.avg_case_duration || 0),
      icon: Clock,
      color: 'text-purple-600',
    },
    {
      label: 'Progress',
      value: `${metrics.completed_cases}/${metrics.total_cases}`,
      icon: TrendingUp,
      color: 'text-teal-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <card.icon className="h-4 w-4" />
              {card.label}
            </div>
            <div className={cn('text-2xl font-bold tabular-nums', card.color)}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

MetricsCards.displayName = 'MetricsCards';

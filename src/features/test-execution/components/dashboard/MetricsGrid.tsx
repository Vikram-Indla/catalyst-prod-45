/**
 * Module 3B-3: Grid of metric cards
 */

import React from 'react';
import { MetricCard } from './MetricCard';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Target, 
  Timer,
  ListChecks,
  TrendingUp 
} from 'lucide-react';
import type { ProgressSummary } from '../../types/progress-dashboard';

interface MetricsGridProps {
  summary: ProgressSummary | null;
}

export function MetricsGrid({ summary }: MetricsGridProps) {
  if (!summary) return null;

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const metrics = [
    {
      title: 'Pass Rate',
      value: `${summary.pass_rate}%`,
      subtitle: `${summary.passed} passed`,
      icon: Target,
      iconColor: 'text-success',
    },
    {
      title: 'Completed',
      value: `${summary.completed}/${summary.total}`,
      subtitle: `${summary.completion_percentage}% complete`,
      icon: ListChecks,
      iconColor: 'text-primary',
    },
    {
      title: 'Failed',
      value: summary.failed,
      subtitle: summary.failed > 0 ? 'Needs attention' : 'All good!',
      icon: XCircle,
      iconColor: summary.failed > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      title: 'Blocked',
      value: summary.blocked,
      subtitle: summary.blocked > 0 ? 'Review blockers' : 'None',
      icon: CheckCircle,
      iconColor: summary.blocked > 0 ? 'text-warning' : 'text-muted-foreground',
    },
    {
      title: 'Velocity',
      value: `${Math.round(summary.velocity_per_hour)}/hr`,
      subtitle: 'Tests per hour',
      icon: Zap,
      iconColor: 'text-primary',
    },
    {
      title: 'Elapsed',
      value: formatTime(summary.elapsed_seconds),
      subtitle: 'Since start',
      icon: Clock,
      iconColor: 'text-muted-foreground',
    },
    {
      title: 'ETA',
      value: formatTime(summary.eta_seconds),
      subtitle: 'Estimated remaining',
      icon: Timer,
      iconColor: 'text-primary',
    },
    {
      title: 'Running',
      value: summary.running,
      subtitle: `${summary.queued} queued`,
      icon: TrendingUp,
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          subtitle={metric.subtitle}
          icon={metric.icon}
          iconColor={metric.iconColor}
        />
      ))}
    </div>
  );
}

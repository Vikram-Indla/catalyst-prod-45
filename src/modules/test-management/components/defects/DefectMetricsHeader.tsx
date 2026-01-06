/**
 * DefectMetricsHeader - Enhanced metrics display for defects dashboard
 */

import React from 'react';
import {
  Bug,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DefectMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  blockers: number;
  criticals: number;
  mttr?: number; // Mean Time To Resolution (hours)
  openedThisWeek: number;
  closedThisWeek: number;
}

export interface DefectMetricsHeaderProps {
  metrics: DefectMetrics;
  isLoading?: boolean;
  variant?: 'compact' | 'detailed';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DefectMetricsHeader({ 
  metrics, 
  isLoading,
  variant = 'compact' 
}: DefectMetricsHeaderProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 px-6 py-3 border-b">
        <MetricBadge
          label="Open"
          value={metrics.open}
          colorClass="text-destructive"
          bgClass="bg-destructive/10"
        />
        <MetricBadge
          label="In Progress"
          value={metrics.inProgress}
          colorClass="text-amber-600"
          bgClass="bg-amber-500/10"
        />
        <MetricBadge
          label="Resolved"
          value={metrics.resolved}
          colorClass="text-teal-600"
          bgClass="bg-teal-500/10"
        />
        {metrics.blockers > 0 && (
          <MetricBadge
            label="Blockers"
            value={metrics.blockers}
            colorClass="text-destructive"
            bgClass="bg-destructive/10"
            icon={<AlertTriangle className="h-4 w-4" />}
            urgent
          />
        )}
        {metrics.criticals > 0 && (
          <MetricBadge
            label="Critical"
            value={metrics.criticals}
            colorClass="text-orange-600"
            bgClass="bg-orange-500/10"
            icon={<XCircle className="h-4 w-4" />}
          />
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
      <MetricCard
        title="Total Defects"
        value={metrics.total}
        icon={<Bug className="h-5 w-5" />}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      <MetricCard
        title="Open"
        value={metrics.open}
        icon={<XCircle className="h-5 w-5" />}
        iconBg="bg-destructive/10"
        iconColor="text-destructive"
        trend={metrics.openedThisWeek > metrics.closedThisWeek ? 'up' : 'down'}
        trendLabel={`${metrics.openedThisWeek} new this week`}
      />
      <MetricCard
        title="In Progress"
        value={metrics.inProgress}
        icon={<Loader2 className="h-5 w-5" />}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-600"
      />
      <MetricCard
        title="Resolved"
        value={metrics.resolved}
        icon={<CheckCircle2 className="h-5 w-5" />}
        iconBg="bg-teal-500/10"
        iconColor="text-teal-600"
        trend={metrics.closedThisWeek > metrics.openedThisWeek ? 'up' : undefined}
        trendLabel={`${metrics.closedThisWeek} closed this week`}
      />
      <MetricCard
        title="Blockers"
        value={metrics.blockers}
        icon={<AlertTriangle className="h-5 w-5" />}
        iconBg="bg-destructive/10"
        iconColor="text-destructive"
        urgent={metrics.blockers > 0}
      />
      {metrics.mttr !== undefined && (
        <MetricCard
          title="Avg. Resolution"
          value={`${metrics.mttr}h`}
          icon={<Clock className="h-5 w-5" />}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface MetricBadgeProps {
  label: string;
  value: number;
  colorClass: string;
  bgClass: string;
  icon?: React.ReactNode;
  urgent?: boolean;
}

function MetricBadge({ label, value, colorClass, bgClass, icon, urgent }: MetricBadgeProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        bgClass,
        urgent && "animate-pulse"
      )}
    >
      {icon && <span className={colorClass}>{icon}</span>}
      <span className={cn("text-lg font-bold", colorClass)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  urgent?: boolean;
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  iconBg, 
  iconColor, 
  trend, 
  trendLabel,
  urgent 
}: MetricCardProps) {
  return (
    <Card className={cn(
      "p-4 transition-all",
      urgent && "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg", iconBg, iconColor)}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs",
            trend === 'up' ? "text-destructive" : "text-teal-600"
          )}>
            {trend === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {trendLabel && (
          <p className="text-[10px] text-muted-foreground mt-1">{trendLabel}</p>
        )}
      </div>
    </Card>
  );
}

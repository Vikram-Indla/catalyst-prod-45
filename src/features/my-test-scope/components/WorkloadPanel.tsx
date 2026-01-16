/**
 * Workload Panel
 * Shows workload analysis with burndown chart and stats
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, Calendar, Users } from 'lucide-react';
import type { WorkloadAnalysis } from '../types';

interface WorkloadPanelProps {
  workload: WorkloadAnalysis;
}

export function WorkloadPanel({ workload }: WorkloadPanelProps) {
  const {
    totalRemainingTests,
    totalRemainingMinutes,
    daysUntilDeadline,
    projectedCompletion,
    collaborators,
  } = workload;

  const hoursRemaining = Math.ceil(totalRemainingMinutes / 60);

  const statusConfig = {
    on_track: { 
      label: 'On Track', 
      icon: TrendingUp, 
      colorClass: 'text-success',
      bgClass: 'bg-success/10',
    },
    at_risk: { 
      label: 'At Risk', 
      icon: TrendingDown, 
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10',
    },
    will_miss: { 
      label: 'Will Miss Deadline', 
      icon: TrendingDown, 
      colorClass: 'text-danger',
      bgClass: 'bg-danger/10',
    },
  };

  const status = statusConfig[projectedCompletion];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={cn('p-6 rounded-lg border', status.bgClass)}>
        <div className="flex items-center gap-3">
          <StatusIcon className={cn('h-8 w-8', status.colorClass)} />
          <div>
            <h3 className={cn('text-lg font-semibold', status.colorClass)}>{status.label}</h3>
            <p className="text-sm text-muted-foreground">
              {totalRemainingTests} tests remaining • ~{hoursRemaining}h of work
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          value={`${hoursRemaining}h`}
          label="Work Remaining"
        />
        <StatCard
          icon={Calendar}
          value={`${daysUntilDeadline}d`}
          label="Until Deadline"
        />
        <StatCard
          icon={TrendingUp}
          value={`${totalRemainingTests}`}
          label="Tests Pending"
        />
      </div>

      {/* Simple Burndown Visualization */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <h4 className="text-sm font-medium text-foreground mb-4">Burndown Trend</h4>
        <div className="h-32 flex items-end gap-1">
          {workload.burndownData.slice(-10).map((point, index) => {
            const maxValue = Math.max(...workload.burndownData.map(p => Math.max(p.ideal, p.actual)));
            const idealHeight = (point.ideal / maxValue) * 100;
            const actualHeight = (point.actual / maxValue) * 100;
            
            return (
              <div key={point.date} className="flex-1 flex items-end gap-0.5 h-full">
                <div 
                  className="flex-1 bg-muted rounded-t"
                  style={{ height: `${idealHeight}%` }}
                  title={`Ideal: ${point.ideal}`}
                />
                <div 
                  className="flex-1 bg-primary rounded-t"
                  style={{ height: `${actualHeight}%` }}
                  title={`Actual: ${point.actual}`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded" />
            <span className="text-xs text-muted-foreground">Ideal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded" />
            <span className="text-xs text-muted-foreground">Actual</span>
          </div>
        </div>
      </div>

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Collaborators Testing Same Area</h4>
          </div>
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div key={collab.userId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{collab.name}</span>
                <span className="text-muted-foreground">{collab.module} • {collab.testCount} tests</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}

function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border">
      <Icon className="h-5 w-5 text-muted-foreground mb-2" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

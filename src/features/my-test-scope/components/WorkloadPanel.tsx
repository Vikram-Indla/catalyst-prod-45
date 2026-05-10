/**
 * Workload Panel
 * Shows workload analysis with burndown chart and stats
 */

import React from 'react';
import { cn } from '@/lib/utils';
import ClockIcon from '@atlaskit/icon/core/clock';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import PeopleIcon from '@atlaskit/icon/glyph/people';
// No @atlaskit/icon equivalent — inline SVG
const TrendingUpIcon = ({ size = 32, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const TrendingDownIcon = ({ size = 32, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
  </svg>
);
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
      renderIcon: (cls: string) => <TrendingUpIcon size={32} className={cls} />,
      colorClass: 'text-success',
      bgClass: 'bg-success/10',
    },
    at_risk: {
      label: 'At Risk',
      renderIcon: (cls: string) => <TrendingDownIcon size={32} className={cls} />,
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10',
    },
    will_miss: {
      label: 'Will Miss Deadline',
      renderIcon: (cls: string) => <TrendingDownIcon size={32} className={cls} />,
      colorClass: 'text-danger',
      bgClass: 'bg-danger/10',
    },
  };

  const status = statusConfig[projectedCompletion];

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={cn('p-6 rounded-lg border', status.bgClass)}>
        <div className="flex items-center gap-3">
          {status.renderIcon(cn('h-8 w-8', status.colorClass))}
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
          renderIcon={() => <ClockIcon label="" size="small" primaryColor="currentColor" />}
          value={`${hoursRemaining}h`}
          label="Work Remaining"
        />
        <StatCard
          renderIcon={() => <CalendarIcon label="" size="small" primaryColor="currentColor" />}
          value={`${daysUntilDeadline}d`}
          label="Until Deadline"
        />
        <StatCard
          renderIcon={() => <TrendingUpIcon size={20} />}
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
            <PeopleIcon label="" size="small" primaryColor="currentColor" />
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
  renderIcon: () => React.ReactNode;
  value: string;
  label: string;
}

function StatCard({ renderIcon, value, label }: StatCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border">
      <span className="text-muted-foreground mb-2 block">{renderIcon()}</span>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

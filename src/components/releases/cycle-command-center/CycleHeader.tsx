/**
 * Cycle Header Component with Progress Ring
 * Shows cycle name, status, progress, and key info
 */

import React from 'react';
import { Clock, Users, Calendar as CalendarIcon, Play, Pause, CheckCircle } from 'lucide-react';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TestCycle, CycleStats } from '@/hooks/test-cycles/useCycleDetails';

interface CycleHeaderProps {
  cycle: TestCycle | undefined;
  stats: CycleStats | undefined;
  isLoading: boolean;
}

const STATUS_STYLES: Record<string, { appearance: LozengeAppearance; label: string }> = {
  planned: { appearance: 'default', label: 'Planned' },
  in_progress: { appearance: 'inprogress', label: 'In Progress' },
  paused: { appearance: 'moved', label: 'Paused' },
  completed: { appearance: 'success', label: 'Completed' },
};

export function CycleHeader({ cycle, stats, isLoading }: CycleHeaderProps) {
  if (isLoading) {
    return (
      <div className="px-6 py-6 border-b bg-background">
        <div className="flex items-start gap-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cycle || !stats) return null;

  const progress = stats.executionRate;
  const status = STATUS_STYLES[cycle.status] || STATUS_STYLES.planned;
  
  // Progress ring calculations
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const formatDateRange = () => {
    if (!cycle.startDate || !cycle.endDate) return 'No dates set';
    const start = new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(cycle.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <div className="px-6 py-6 border-b bg-background">
      <div className="flex items-start gap-6">
        {/* Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={CATALYST_V5.primary}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: CATALYST_V5.primary }}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Cycle Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bg-1)', color: CATALYST_V5.primary }}
            >
              {cycle.cycleKey}
            </span>
            
            <Lozenge appearance={status.appearance}>
              {status.label}
            </Lozenge>
          </div>

          <h1 className="text-xl font-semibold text-foreground truncate mb-1">
            {cycle.name}
          </h1>

          {cycle.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {cycle.description}
            </p>
          )}

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {/* Release */}
            {cycle.releaseName && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{cycle.releaseName}</span>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDateRange()}</span>
            </div>

            {/* Days Remaining */}
            {cycle.daysRemaining !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span 
                  className="font-medium"
                  style={{ 
                    color: cycle.isOverdue 
                      ? CATALYST_V5.danger 
                      : cycle.daysRemaining <= 2 
                        ? CATALYST_V5.warning 
                        : undefined 
                  }}
                >
                  {cycle.isOverdue 
                    ? `${Math.abs(cycle.daysRemaining)} days overdue`
                    : `${cycle.daysRemaining} days left`
                  }
                </span>
              </div>
            )}

            {/* Assignees */}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{cycle.assigneeCount} assignees</span>
            </div>

            {/* Environment */}
            {cycle.environment && (
              <span className="capitalize">
                <Lozenge appearance="default">{cycle.environment}</Lozenge>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

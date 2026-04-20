// ============================================================================
// CycleConfigPanel - Main cycle configuration view combining all sections
// ============================================================================

import { memo } from 'react';
import { Loader2, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { CycleTimeline } from './CycleTimeline';
import { MilestoneEditor } from './MilestoneEditor';
import { TesterAssignmentGrid } from './TesterAssignmentGrid';
import { CycleScopeSelector } from './CycleScopeSelector';
import { useCycleDetails } from '../hooks/useCycleDetails';
import { CYCLE_STATUS_CONFIG } from '../types/cycle-config';
import type { CycleStatus } from '../types/cycle-config';

const CYCLE_STATUS_APPEARANCE: Record<CycleStatus, LozengeAppearance> = {
  draft: 'default',
  planned: 'default',
  active: 'inprogress',
  paused: 'moved',
  completed: 'success',
  archived: 'default',
};

interface CycleConfigPanelProps {
  cycleId: string;
  className?: string;
}

export const CycleConfigPanel = memo(function CycleConfigPanel({
  cycleId,
  className,
}: CycleConfigPanelProps) {
  const { cycle, milestones, assignments, isLoading, error } = useCycleDetails(cycleId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Failed to load cycle configuration</p>
      </div>
    );
  }

  const statusConfig = CYCLE_STATUS_CONFIG[cycle.status];
  const stats = cycle.stats;
  const totalExecuted = stats.passed + stats.failed + stats.blocked + stats.skipped;
  const completionRate = stats.total > 0 ? Math.round((totalExecuted / stats.total) * 100) : 0;
  const passRate =
    stats.passed + stats.failed > 0
      ? Math.round((stats.passed / (stats.passed + stats.failed)) * 100)
      : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cycle Header */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm">
                <Lozenge appearance="default">
                  {cycle.cycle_key}
                </Lozenge>
              </span>
              <Lozenge appearance={CYCLE_STATUS_APPEARANCE[cycle.status]}>
                {statusConfig.label}
              </Lozenge>
            </div>
            <h2 className="text-xl font-semibold text-foreground">{cycle.name}</h2>
            {cycle.description && (
              <p className="text-sm text-muted-foreground mt-1">{cycle.description}</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.passed}</div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completionRate}%</div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>

        {/* Dates */}
        {(cycle.planned_start || cycle.planned_end) && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {cycle.planned_start && (
              <span>Start: {format(new Date(cycle.planned_start), 'MMM d, yyyy')}</span>
            )}
            {cycle.planned_end && (
              <span>End: {format(new Date(cycle.planned_end), 'MMM d, yyyy')}</span>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <CycleTimeline cycle={cycle} milestones={milestones} />

      {/* Two-column layout for milestones and team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MilestoneEditor cycleId={cycleId} milestones={milestones} />
        <TesterAssignmentGrid cycleId={cycleId} assignments={assignments} />
      </div>

      {/* Test Case Scope */}
      <CycleScopeSelector cycleId={cycleId} />
    </div>
  );
});

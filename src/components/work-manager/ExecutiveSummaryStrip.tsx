// src/components/work-manager/ExecutiveSummaryStrip.tsx
// Compact Executive Micro-Summary - Bloomberg-grade signal strip

import { AlertTriangle, Clock, Flame, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskExtended } from './types';

interface ExecutiveSummaryStripProps {
  tasks: TaskExtended[];
}

export function ExecutiveSummaryStrip({ tasks }: ExecutiveSummaryStripProps) {
  // Compute executive KPIs
  const blocked = tasks.filter(t => t.blocked && t.status !== 'Done').length;
  const overdue = tasks.filter(t => t.dueBucket === 'overdue' && t.status !== 'Done').length;
  const critical = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Done').length;
  const doneToday = tasks.filter(t => {
    if (t.status !== 'Done' || !t.completedAt) return false;
    const completed = new Date(t.completedAt);
    const today = new Date();
    return completed.toDateString() === today.toDateString();
  }).length;

  const hasIssues = blocked > 0 || overdue > 0 || critical > 0;

  return (
    <div className={cn(
      "flex items-center gap-6 px-4 py-2.5 rounded-lg border",
      hasIssues 
        ? "bg-surface-2 border-border-default" 
        : "bg-success-bg border-success-border"
    )}>
      {/* Blocked */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          blocked > 0 ? "bg-danger-bg" : "bg-surface-3"
        )}>
          <AlertTriangle className={cn(
            "w-4 h-4",
            blocked > 0 ? "text-danger" : "text-text-muted"
          )} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-base font-semibold tabular-nums leading-none",
            blocked > 0 ? "text-danger" : "text-text-secondary"
          )}>
            {blocked}
          </span>
          <span className="text-2xs text-text-muted uppercase tracking-wide font-medium">
            Blocked
          </span>
        </div>
      </div>

      {/* Overdue */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          overdue > 0 ? "bg-warning-bg" : "bg-surface-3"
        )}>
          <Clock className={cn(
            "w-4 h-4",
            overdue > 0 ? "text-warning" : "text-text-muted"
          )} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-base font-semibold tabular-nums leading-none",
            overdue > 0 ? "text-warning" : "text-text-secondary"
          )}>
            {overdue}
          </span>
          <span className="text-2xs text-text-muted uppercase tracking-wide font-medium">
            Overdue
          </span>
        </div>
      </div>

      {/* Critical */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          critical > 0 ? "bg-danger-bg" : "bg-surface-3"
        )}>
          <Flame className={cn(
            "w-4 h-4",
            critical > 0 ? "text-danger" : "text-text-muted"
          )} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-base font-semibold tabular-nums leading-none",
            critical > 0 ? "text-danger" : "text-text-secondary"
          )}>
            {critical}
          </span>
          <span className="text-2xs text-text-muted uppercase tracking-wide font-medium">
            Critical
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-border-subtle" />

      {/* Done Today */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          doneToday > 0 ? "bg-success-bg" : "bg-surface-3"
        )}>
          <CheckCircle2 className={cn(
            "w-4 h-4",
            doneToday > 0 ? "text-success" : "text-text-muted"
          )} />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-base font-semibold tabular-nums leading-none",
            doneToday > 0 ? "text-success" : "text-text-secondary"
          )}>
            {doneToday}
          </span>
          <span className="text-2xs text-text-muted uppercase tracking-wide font-medium">
            Done Today
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="ml-auto text-sm text-text-tertiary">
        {!hasIssues && (
          <span className="text-success font-medium">All clear</span>
        )}
        {hasIssues && (
          <span className="font-medium">
            {blocked > 0 && `${blocked} blocked`}
            {blocked > 0 && (overdue > 0 || critical > 0) && ' · '}
            {overdue > 0 && `${overdue} overdue`}
            {overdue > 0 && critical > 0 && ' · '}
            {critical > 0 && `${critical} critical`}
          </span>
        )}
      </div>
    </div>
  );
}

export default ExecutiveSummaryStrip;

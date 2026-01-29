/**
 * ExecutiveInsightPanel — Data-driven governance insight
 * 
 * Displays computed KPIs from the filtered dataset.
 * Two modes: Queue (pending) vs History (approved/vetoed)
 */

import { useMemo } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

interface ExecutiveInsightPanelProps {
  items: CommitteeQueueItem[];
  isHistoryMode: boolean;
}

interface KPIBlockProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  highlight?: 'danger' | 'warning' | 'success';
}

function KPIBlock({ label, value, icon, highlight }: KPIBlockProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-md",
        highlight === 'danger' && "bg-rose-100 text-rose-600",
        highlight === 'warning' && "bg-amber-100 text-amber-600",
        highlight === 'success' && "bg-teal-100 text-teal-600",
        !highlight && "bg-slate-100 text-slate-500"
      )}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-foreground tabular-nums leading-tight">
          {value}
        </span>
        <span className="text-xs font-medium text-muted-foreground leading-tight">
          {label}
        </span>
      </div>
    </div>
  );
}

export function ExecutiveInsightPanel({ items, isHistoryMode }: ExecutiveInsightPanelProps) {
  const queueMetrics = useMemo(() => {
    // Queue mode: pending items only
    const pendingItems = items.filter(i => i.committeeStatus === 'pending');
    const pendingCount = pendingItems.length;
    const sev1Pending = pendingItems.filter(i => i.incident.severity === 'SEV1').length;
    const agingBreachCount = pendingItems.filter(i => i.agingDays > 3).length;
    const oldestPending = pendingItems.length > 0 
      ? Math.max(...pendingItems.map(i => i.agingDays))
      : 0;
    
    return {
      pendingCount,
      sev1Pending,
      agingBreachCount,
      oldestPending,
    };
  }, [items]);

  const historyMetrics = useMemo(() => {
    // History mode: approved + vetoed items only
    const closedItems = items.filter(i => i.committeeStatus === 'approved' || i.committeeStatus === 'vetoed');
    const approvedCount = closedItems.filter(i => i.committeeStatus === 'approved').length;
    const vetoedCount = closedItems.filter(i => i.committeeStatus === 'vetoed').length;
    const totalClosed = approvedCount + vetoedCount;
    const vetoRate = totalClosed > 0 ? ((vetoedCount / totalClosed) * 100).toFixed(1) : '0';
    
    // Calculate average decision time (using agingDays as proxy for decision time)
    const avgDecisionTime = closedItems.length > 0
      ? (closedItems.reduce((sum, i) => sum + i.agingDays, 0) / closedItems.length).toFixed(1)
      : '0';
    
    return {
      approvedCount,
      vetoedCount,
      vetoRate,
      avgDecisionTime,
      totalClosed,
    };
  }, [items]);

  // Empty state for queue mode
  if (!isHistoryMode && queueMetrics.pendingCount === 0) {
    return (
      <div className="border border-border rounded-lg bg-card px-4 py-3 mb-4">
        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
          EXECUTIVE COMMITTEE UPDATE
        </h3>
        <p className="text-sm text-muted-foreground">
          No pending committee decisions.
        </p>
      </div>
    );
  }

  // Empty state for history mode
  if (isHistoryMode && historyMetrics.totalClosed === 0) {
    return (
      <div className="border border-border rounded-lg bg-card px-4 py-3 mb-4">
        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
          COMMITTEE DECISION SUMMARY
        </h3>
        <p className="text-sm text-muted-foreground">
          No committee decisions in selected range.
        </p>
      </div>
    );
  }

  if (isHistoryMode) {
    // HISTORY MODE
    return (
      <div className="border border-border rounded-lg bg-card mb-4">
        <div className="px-4 py-2 border-b border-border">
          <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide">
            COMMITTEE DECISION SUMMARY
          </h3>
        </div>
        <div className="flex flex-wrap items-center divide-x divide-border">
          <KPIBlock
            label="Approved"
            value={historyMetrics.approvedCount}
            icon={<CheckCircle className="h-4 w-4" />}
            highlight="success"
          />
          <KPIBlock
            label="Vetoed"
            value={historyMetrics.vetoedCount}
            icon={<XCircle className="h-4 w-4" />}
            highlight="danger"
          />
          <KPIBlock
            label="Veto rate"
            value={`${historyMetrics.vetoRate}%`}
            icon={<AlertTriangle className="h-4 w-4" />}
            highlight={parseFloat(historyMetrics.vetoRate) > 20 ? 'warning' : undefined}
          />
          <KPIBlock
            label="Avg time to decision"
            value={`${historyMetrics.avgDecisionTime}d`}
            icon={<Timer className="h-4 w-4" />}
          />
        </div>
      </div>
    );
  }

  // QUEUE MODE
  return (
    <div className="border border-border border-l-4 border-l-teal-500 rounded-lg bg-card mb-4">
      <div className="px-4 py-2 border-b border-border">
        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide">
          EXECUTIVE COMMITTEE UPDATE
        </h3>
      </div>
      <div className="flex flex-wrap items-center divide-x divide-border">
        <KPIBlock
          label="Pending decisions"
          value={queueMetrics.pendingCount}
          icon={<Clock className="h-4 w-4" />}
        />
        <KPIBlock
          label="SEV1 pending"
          value={queueMetrics.sev1Pending}
          icon={<AlertCircle className="h-4 w-4" />}
          highlight={queueMetrics.sev1Pending > 0 ? 'danger' : undefined}
        />
        <KPIBlock
          label="Aging > 3d (breach)"
          value={queueMetrics.agingBreachCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          highlight={queueMetrics.agingBreachCount > 0 ? 'warning' : undefined}
        />
        <KPIBlock
          label="Oldest pending"
          value={`${queueMetrics.oldestPending}d`}
          icon={<Timer className="h-4 w-4" />}
          highlight={queueMetrics.oldestPending > 7 ? 'warning' : undefined}
        />
      </div>
      {/* Risk line */}
      <div className="px-4 py-2 border-t border-border">
        {queueMetrics.agingBreachCount > 0 ? (
          <p className="text-xs font-medium text-amber-600">
            Risk: {queueMetrics.agingBreachCount} item{queueMetrics.agingBreachCount > 1 ? 's' : ''} exceed governance decision target (3 days).
          </p>
        ) : (
          <p className="text-xs font-medium text-teal-600">
            No governance breaches in queue.
          </p>
        )}
      </div>
    </div>
  );
}

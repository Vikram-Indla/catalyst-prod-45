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
        highlight === 'danger' && "bg-[#7f1d1d] dark:bg-[#7f1d1d] text-[#fca5a5] dark:text-[#fca5a5]",
        highlight === 'warning' && "bg-[#78350f] dark:bg-[#78350f] text-[#fcd34d] dark:text-[#fcd34d]",
        highlight === 'success' && "bg-[#134e4a] dark:bg-[#134e4a] text-[#5eead4] dark:text-[#5eead4]",
        !highlight && "bg-[#262626] dark:bg-[#262626] text-[#a3a3a3] dark:text-[#a3a3a3]"
      )}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-[#fafafa] dark:text-[#fafafa] tabular-nums leading-tight">
          {value}
        </span>
        <span className="text-xs font-medium text-[#a3a3a3] dark:text-[#a3a3a3] leading-tight">
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
      <div className="border border-[#333] dark:border-[#333] rounded-lg bg-[#0f0f0f] dark:bg-[#0f0f0f] px-4 py-3 mb-4">
        <h3 className="text-xs font-bold text-[#d97706] dark:text-[#d97706] uppercase tracking-wide mb-1">
          EXECUTIVE COMMITTEE UPDATE
        </h3>
        <p className="text-sm text-[#a3a3a3] dark:text-[#a3a3a3]">
          No pending committee decisions.
        </p>
      </div>
    );
  }

  // Empty state for history mode
  if (isHistoryMode && historyMetrics.totalClosed === 0) {
    return (
      <div className="border border-[#333] dark:border-[#333] rounded-lg bg-[#0f0f0f] dark:bg-[#0f0f0f] px-4 py-3 mb-4">
        <h3 className="text-xs font-bold text-[#d97706] dark:text-[#d97706] uppercase tracking-wide mb-1">
          COMMITTEE DECISION SUMMARY
        </h3>
        <p className="text-sm text-[#a3a3a3] dark:text-[#a3a3a3]">
          No committee decisions in selected range.
        </p>
      </div>
    );
  }

  if (isHistoryMode) {
    // HISTORY MODE
    return (
      <div className="border border-[#333] dark:border-[#333] rounded-lg bg-[#0f0f0f] dark:bg-[#0f0f0f] mb-4">
        <div className="px-4 py-2 border-b border-[#333] dark:border-[#333]">
          <h3 className="text-xs font-bold text-[#d97706] dark:text-[#d97706] uppercase tracking-wide">
            COMMITTEE DECISION SUMMARY
          </h3>
        </div>
        <div className="flex flex-wrap items-center divide-x divide-[#333] dark:divide-[#333]">
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
    <div className="border border-[#333] dark:border-[#333] border-l-4 border-l-[#0d9488] dark:border-l-[#0d9488] rounded-lg bg-[#0f0f0f] dark:bg-[#0f0f0f] mb-4">
      <div className="px-4 py-2 border-b border-[#333] dark:border-[#333]">
        <h3 className="text-xs font-bold text-[#d97706] dark:text-[#d97706] uppercase tracking-wide">
          EXECUTIVE COMMITTEE UPDATE
        </h3>
      </div>
      <div className="flex flex-wrap items-center divide-x divide-[#333] dark:divide-[#333]">
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
      <div className="px-4 py-2 border-t border-[#333] dark:border-[#333]">
        {queueMetrics.agingBreachCount > 0 ? (
          <p className="text-xs font-medium text-[#d97706] dark:text-[#d97706]">
            Risk: {queueMetrics.agingBreachCount} item{queueMetrics.agingBreachCount > 1 ? 's' : ''} exceed governance decision target (3 days).
          </p>
        ) : (
          <p className="text-xs font-medium text-[#0d9488] dark:text-[#0d9488]">
            No governance breaches in queue.
          </p>
        )}
      </div>
    </div>
  );
}

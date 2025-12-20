/**
 * CommitteeKPIWidgets — Executive-grade KPI widgets for Committee Queue
 * 
 * Compact, clickable filter widgets with tokens-only styling.
 */

import { Clock, CheckCircle, XCircle, AlertTriangle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

interface KPIWidget {
  id: string;
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  activeClass: string;
}

interface CommitteeKPIWidgetsProps {
  items: CommitteeQueueItem[];
  activeFilter: string | null;
  onFilterClick: (filterId: string | null) => void;
}

export function CommitteeKPIWidgets({
  items,
  activeFilter,
  onFilterClick,
}: CommitteeKPIWidgetsProps) {
  // Calculate metrics
  const pendingCount = items.filter(i => i.committeeStatus === 'pending').length;
  const approvedCount = items.filter(i => i.committeeStatus === 'approved').length;
  const vetoedCount = items.filter(i => i.committeeStatus === 'vetoed').length;
  const agingCount = items.filter(i => i.agingDays >= 7).length;
  
  // Average decision time (for approved/vetoed items)
  const decidedItems = items.filter(i => i.committeeDecisionAt);
  const avgDecisionDays = decidedItems.length > 0
    ? Math.round(
        decidedItems.reduce((sum, i) => {
          const sentAt = new Date(i.committeeSentAt).getTime();
          const decidedAt = new Date(i.committeeDecisionAt!).getTime();
          return sum + (decidedAt - sentAt) / (1000 * 60 * 60 * 24);
        }, 0) / decidedItems.length
      )
    : 0;

  const widgets: KPIWidget[] = [
    {
      id: 'pending',
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      colorClass: 'text-amber-600 dark:text-amber-400',
      activeClass: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      id: 'approved',
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      activeClass: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      id: 'vetoed',
      label: 'Vetoed',
      value: vetoedCount,
      icon: XCircle,
      colorClass: 'text-rose-600 dark:text-rose-400',
      activeClass: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20',
    },
    {
      id: 'aging',
      label: 'Aging >7d',
      value: agingCount,
      icon: AlertTriangle,
      colorClass: 'text-orange-600 dark:text-orange-400',
      activeClass: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {widgets.map((widget) => {
        const isActive = activeFilter === widget.id;
        const Icon = widget.icon;

        return (
          <button
            key={widget.id}
            onClick={() => onFilterClick(isActive ? null : widget.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
              'hover:shadow-sm',
              isActive
                ? widget.activeClass
                : 'border-[var(--border-default)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-subtle)]'
            )}
          >
            <Icon className={cn('h-4 w-4', widget.colorClass)} />
            <span className="text-xs font-medium text-[var(--text-2)]">{widget.label}</span>
            <span className={cn(
              'text-sm font-semibold tabular-nums',
              isActive ? widget.colorClass : 'text-[var(--text-1)]'
            )}>
              {widget.value}
            </span>
          </button>
        );
      })}

      {/* Avg decision time - informational, not clickable */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)]">
        <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-medium text-[var(--text-2)]">Avg Decision</span>
        <span className="text-sm font-semibold tabular-nums text-[var(--text-1)]">
          {avgDecisionDays}d
        </span>
      </div>
    </div>
  );
}

/**
 * CommitteeKPIStrip — Compact executive KPI strip (4 widgets only)
 * 
 * Clean, clickable filters with green-led active state.
 * Tokens only, no hard-coded colors.
 */

import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

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
  const agingCount = items.filter(i => i.agingDays >= 7 && i.committeeStatus === 'pending').length;

  const widgets = [
    {
      id: 'pending',
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      activeBorder: 'border-[var(--secondary-green)]',
      activeBg: 'bg-[var(--nav-active-bg)]',
    },
    {
      id: 'approved',
      label: 'Approved',
      value: approvedCount,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-[var(--secondary-green)]',
      activeBg: 'bg-[var(--nav-active-bg)]',
    },
    {
      id: 'vetoed',
      label: 'Vetoed',
      value: vetoedCount,
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      activeBorder: 'border-[var(--secondary-green)]',
      activeBg: 'bg-[var(--nav-active-bg)]',
    },
    {
      id: 'aging',
      label: 'Aging >7d',
      value: agingCount,
      icon: AlertTriangle,
      color: 'text-orange-600 dark:text-orange-400',
      activeBorder: 'border-[var(--secondary-green)]',
      activeBg: 'bg-[var(--nav-active-bg)]',
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {widgets.map((widget) => {
        const isActive = activeFilter === widget.id;
        const Icon = widget.icon;

        return (
          <button
            key={widget.id}
            onClick={() => onFilterClick(isActive ? null : widget.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all',
              'bg-[var(--surface-elevated)] hover:bg-[var(--surface-subtle)]',
              isActive 
                ? `${widget.activeBorder} ${widget.activeBg} border-2` 
                : 'border-[var(--border-default)]'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', widget.color)} />
            <span className={cn(
              'text-xs font-medium',
              isActive ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'
            )}>
              {widget.label}
            </span>
            <span className={cn(
              'text-sm font-semibold tabular-nums min-w-[1.25rem] text-center',
              isActive ? 'text-[var(--text-1)]' : 'text-[var(--text-1)]'
            )}>
              {widget.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

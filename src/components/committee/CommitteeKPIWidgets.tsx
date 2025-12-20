/**
 * CommitteeKPIStrip — Compact executive KPI strip (max 4 widgets, governance only)
 *
 * - Always show: Pending, Vetoed, Aging >7d
 * - Approved: ONLY when includeClosedDecisions = ON
 * - Clickable filters with green-led active state
 * - Tokens only
 */

import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommitteeQueueItem } from '@/hooks/useCommitteeQueue';

interface CommitteeKPIWidgetsProps {
  items: CommitteeQueueItem[];
  activeFilter: string | null;
  onFilterClick: (filterId: string | null) => void;
  includeClosedDecisions: boolean;
}

export function CommitteeKPIWidgets({
  items,
  activeFilter,
  onFilterClick,
  includeClosedDecisions,
}: CommitteeKPIWidgetsProps) {
  const pendingCount = items.filter(i => i.committeeStatus === 'pending').length;
  const approvedCount = items.filter(i => i.committeeStatus === 'approved').length;
  const vetoedCount = items.filter(i => i.committeeStatus === 'vetoed').length;
  const agingCount = items.filter(i => i.agingDays >= 7 && i.committeeStatus === 'pending').length;

  // Build widget list: Pending, Vetoed, Aging always; Approved only if includeClosedDecisions
  const widgets: {
    id: string;
    label: string;
    value: number;
    icon: typeof Clock;
  }[] = [
    { id: 'pending', label: 'Pending', value: pendingCount, icon: Clock },
    { id: 'vetoed', label: 'Vetoed', value: vetoedCount, icon: XCircle },
    { id: 'aging', label: 'Aging >7d', value: agingCount, icon: AlertTriangle },
  ];

  if (includeClosedDecisions) {
    widgets.push({ id: 'approved', label: 'Approved', value: approvedCount, icon: CheckCircle });
  }

  return (
    <div className="flex items-center gap-1.5">
      {widgets.map((widget) => {
        const isActive = activeFilter === widget.id;
        const Icon = widget.icon;

        return (
          <button
            key={widget.id}
            onClick={() => onFilterClick(isActive ? null : widget.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-xs',
              'bg-[var(--surface-elevated)] hover:bg-[var(--surface-subtle)]',
              isActive
                ? 'border-[var(--secondary-green)] border-2 bg-[var(--nav-active-bg)]'
                : 'border-[var(--border-default)]'
            )}
          >
            <Icon
              className="h-3 w-3"
              style={{
                color: isActive ? 'var(--secondary-green)' : 'var(--text-secondary)',
              }}
            />
            <span
              className="font-medium"
              style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {widget.label}
            </span>
            <span
              className="font-semibold tabular-nums min-w-[1rem] text-center"
              style={{ color: 'var(--text-primary)' }}
            >
              {widget.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

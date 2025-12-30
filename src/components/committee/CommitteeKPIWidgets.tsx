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
    iconColor: string;
  }[] = [
    { id: 'pending', label: 'Pending', value: pendingCount, icon: Clock, iconColor: 'text-amber-500' },
    { id: 'vetoed', label: 'Vetoed', value: vetoedCount, icon: XCircle, iconColor: 'text-rose-500' },
    { id: 'aging', label: 'Aging >7d', value: agingCount, icon: AlertTriangle, iconColor: 'text-amber-500' },
  ];

  if (includeClosedDecisions) {
    widgets.push({ id: 'approved', label: 'Approved', value: approvedCount, icon: CheckCircle, iconColor: 'text-emerald-500' });
  }

  return (
    <div className="flex items-center gap-2">
      {widgets.map((widget) => {
        const isActive = activeFilter === widget.id;
        const Icon = widget.icon;

        const iconColorClass = {
          pending: 'text-[#fcd34d]',
          vetoed: 'text-[#fca5a5]',
          aging: 'text-[#fcd34d]',
          approved: 'text-[#5eead4]',
        }[widget.id] || 'text-[#a3a3a3]';

        return (
          <button
            key={widget.id}
            onClick={() => onFilterClick(isActive ? null : widget.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all text-xs',
              'bg-[#262626] dark:bg-[#262626] hover:bg-[#333] dark:hover:bg-[#333]',
              isActive
                ? 'border-[#0d9488] border-2 bg-[#0d9488]/10'
                : 'border-[#404040] dark:border-[#404040]'
            )}
          >
            <Icon className={cn("h-3 w-3", iconColorClass)} />
            <span className={cn("font-medium", isActive ? 'text-[#fafafa]' : 'text-[#a3a3a3]')}>
              {widget.label}
            </span>
            <span className="font-semibold tabular-nums min-w-[1rem] text-center text-[#fafafa]">
              {widget.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

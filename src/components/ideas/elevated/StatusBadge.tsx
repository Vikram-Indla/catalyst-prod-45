// ============================================================
// STATUS BADGE - All Idea Statuses
// ============================================================

import { cn } from '@/lib/utils';
import type { ImprovementIdeaStatus } from '@/types/improvement-ideas';

interface StatusBadgeProps {
  status: ImprovementIdeaStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<ImprovementIdeaStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-600',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-slate-100 text-slate-600',
  },
  triaged: {
    label: 'Triaged',
    className: 'bg-amber-100 text-amber-700',
  },
  scoring: {
    label: 'Scoring',
    className: 'bg-purple-100 text-purple-700',
  },
  quick_win_approved: {
    label: 'Quick Win',
    className: 'bg-emerald-100 text-emerald-700',
  },
  linked: {
    label: 'Linked',
    className: 'bg-violet-100 text-violet-700',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
  },
  deferred: {
    label: 'Deferred',
    className: 'bg-orange-100 text-orange-700',
  },
  converted: {
    label: 'Converted',
    className: 'bg-teal-100 text-teal-700',
  },
  archived: {
    label: 'Archived',
    className: 'bg-slate-100 text-slate-500',
  },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold uppercase tracking-wide",
      sizeConfig[size],
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

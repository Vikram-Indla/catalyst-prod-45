import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { 
    label: 'New', 
    className: 'bg-[var(--industry-status-new)]/10 text-[var(--industry-status-new)]' 
  },
  new_request: { 
    label: 'New Request', 
    className: 'bg-[var(--industry-status-new)]/10 text-[var(--industry-status-new)]' 
  },
  new_demand: { 
    label: 'New Demand', 
    className: 'bg-[var(--industry-status-new)]/10 text-[var(--industry-status-new)]' 
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-[var(--industry-status-progress)]/10 text-[var(--industry-status-progress)]'
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-[var(--industry-status-progress)]/10 text-[var(--industry-status-progress)]' 
  },
  scored: { 
    label: 'Scored', 
    className: 'bg-[var(--industry-status-progress)]/10 text-[var(--industry-status-progress)]' 
  },
  'ea-review': {
    label: 'EA Review',
    className: 'bg-[var(--industry-status-review)]/10 text-[var(--industry-status-review)]'
  },
  ea_review: { 
    label: 'EA Review', 
    className: 'bg-[var(--industry-status-review)]/10 text-[var(--industry-status-review)]' 
  },
  budget_review: { 
    label: 'Budget Review', 
    className: 'bg-[var(--industry-status-review)]/10 text-[var(--industry-status-review)]' 
  },
  ready: { 
    label: 'Ready', 
    className: 'bg-[var(--industry-status-approved)]/10 text-[var(--industry-status-approved)]' 
  },
  approved: {
    label: 'Approved',
    className: 'bg-[var(--industry-status-approved)]/10 text-[var(--industry-status-approved)]'
  },
  implement: {
    label: 'Implement',
    className: 'bg-[var(--industry-status-progress)]/10 text-[var(--industry-status-progress)]'
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-[var(--industry-status-blocked)]/10 text-[var(--industry-status-blocked)]'
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-muted text-muted-foreground' 
  },
  closed: {
    label: 'Closed',
    className: 'bg-muted text-muted-foreground'
  },
};

export function StatusCell({ status }: StatusCellProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "text-[11px] font-semibold uppercase tracking-[0.3px]",
      config.className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

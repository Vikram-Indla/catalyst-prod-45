import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new_request: { 
    label: 'New Request', 
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' 
  },
  new_demand: { 
    label: 'New Demand', 
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' 
  },
  scored: { 
    label: 'Scored', 
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' 
  },
  ea_review: { 
    label: 'EA Review', 
    className: 'bg-[hsl(var(--secondary-olive))]/12 text-[hsl(var(--secondary-olive))]' 
  },
  budget_review: { 
    label: 'Budget Review', 
    className: 'bg-[hsl(var(--secondary-bronze))]/15 text-[hsl(var(--secondary-bronze))]' 
  },
  ready: { 
    label: 'Ready', 
    className: 'bg-green-500/10 text-green-700 dark:text-green-400' 
  },
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-[hsl(var(--brand-primary))]/12 text-[hsl(var(--brand-primary))]' 
  },
  completed: { 
    label: 'Completed', 
    className: 'bg-muted text-muted-foreground' 
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400'
  },
  implement: {
    label: 'Implement',
    className: 'bg-[hsl(var(--brand-primary))]/12 text-[hsl(var(--brand-primary))]'
  },
  closed: {
    label: 'Closed',
    className: 'bg-muted text-muted-foreground'
  },
};

export function StatusCell({ status }: StatusCellProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new_request;
  
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

import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: string;
}

/**
 * Status styling using Catalyst Design System v2.0
 * Blue (#2563eb), Teal (#0d9488), Amber (#f59e0b), Red (#ef4444), Gray (#6b7280)
 */
const STATUS_CONFIG: Record<string, { label: string; lightClass: string; darkClass: string; dotLight: string; dotDark: string }> = {
  // Blue statuses - New/In Progress
  new: { 
    label: 'New', 
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  new_request: { 
    label: 'New Request', 
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  new_demand: { 
    label: 'New Demand', 
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  // Blue - Active work
  'in-progress': {
    label: 'In Progress',
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  in_progress: { 
    label: 'In Progress', 
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  implement: {
    label: 'Implement',
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  // Amber statuses - Review/Pending
  scored: { 
    label: 'Scored', 
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  in_review: {
    label: 'In Review',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  'ea-review': {
    label: 'EA Review',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  ea_review: { 
    label: 'EA Review', 
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  analyse: {
    label: 'Analyse',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  analysis: {
    label: 'Analysis',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  budget_review: { 
    label: 'Budget Review', 
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  on_hold: {
    label: 'On Hold',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  'on-hold': {
    label: 'On Hold',
    lightClass: 'bg-[rgba(245,158,11,0.1)] text-[#b45309]',
    darkClass: 'dark:bg-[rgba(251,191,36,0.15)] dark:text-[#fbbf24]',
    dotLight: 'bg-[#f59e0b]',
    dotDark: 'dark:bg-[#fbbf24]'
  },
  // Teal statuses - Success/Complete
  ready: { 
    label: 'Ready', 
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  ready_to_implement: {
    label: 'Ready to Implement',
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  approved: {
    label: 'Approved',
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  completed: { 
    label: 'Completed', 
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  closed: {
    label: 'Closed',
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  done: {
    label: 'Done',
    lightClass: 'bg-[rgba(13,148,136,0.1)] text-[#0d9488]',
    darkClass: 'dark:bg-[rgba(20,184,166,0.15)] dark:text-[#14b8a6]',
    dotLight: 'bg-[#0d9488]',
    dotDark: 'dark:bg-[#14b8a6]'
  },
  // Red statuses - Blocked/Rejected
  blocked: {
    label: 'Blocked',
    lightClass: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
    darkClass: 'dark:bg-[rgba(248,113,113,0.15)] dark:text-[#f87171]',
    dotLight: 'bg-[#ef4444]',
    dotDark: 'dark:bg-[#f87171]'
  },
  rejected: {
    label: 'Rejected',
    lightClass: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
    darkClass: 'dark:bg-[rgba(248,113,113,0.15)] dark:text-[#f87171]',
    dotLight: 'bg-[#ef4444]',
    dotDark: 'dark:bg-[#f87171]'
  },
  cancelled: {
    label: 'Cancelled',
    lightClass: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
    darkClass: 'dark:bg-[rgba(248,113,113,0.15)] dark:text-[#f87171]',
    dotLight: 'bg-[#ef4444]',
    dotDark: 'dark:bg-[#f87171]'
  },
  // Gray statuses - Backlog/Draft
  backlog: {
    label: 'Backlog',
    lightClass: 'bg-[rgba(107,114,128,0.1)] text-[#6b7280]',
    darkClass: 'dark:bg-[rgba(156,163,175,0.15)] dark:text-[#9ca3af]',
    dotLight: 'bg-[#6b7280]',
    dotDark: 'dark:bg-[#9ca3af]'
  },
  draft: {
    label: 'Draft',
    lightClass: 'bg-[rgba(107,114,128,0.1)] text-[#6b7280]',
    darkClass: 'dark:bg-[rgba(156,163,175,0.15)] dark:text-[#9ca3af]',
    dotLight: 'bg-[#6b7280]',
    dotDark: 'dark:bg-[#9ca3af]'
  },
  funnel: {
    label: 'Funnel',
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
  implementing: {
    label: 'Implementing',
    lightClass: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb]',
    darkClass: 'dark:bg-[rgba(59,130,246,0.15)] dark:text-[#60a5fa]',
    dotLight: 'bg-[#2563eb]',
    dotDark: 'dark:bg-[#60a5fa]'
  },
};

export function StatusCell({ status }: StatusCellProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.new;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "text-xs font-medium",
      config.lightClass,
      config.darkClass
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        config.dotLight,
        config.dotDark
      )} />
      {config.label}
    </span>
  );
}

// Export for reuse across the application
export { STATUS_CONFIG };

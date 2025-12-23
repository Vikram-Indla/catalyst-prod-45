import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: string;
}

/**
 * Status styling using ONLY Catalyst brand colors
 * Brand palette: olive (#5c7c5c), bronze (#8b7355), gold (#c69c6d), champagne (#d4b896)
 */
const STATUS_CONFIG: Record<string, { label: string; lightClass: string; darkClass: string; dotLight: string; dotDark: string }> = {
  new: { 
    label: 'New', 
    lightClass: 'bg-[#5c7c5c]/10 text-[#5c7c5c]',
    darkClass: 'dark:bg-[#5c7c5c]/20 dark:text-[#6b8b6b]',
    dotLight: 'bg-[#5c7c5c]',
    dotDark: 'dark:bg-[#6b8b6b]'
  },
  new_request: { 
    label: 'New Request', 
    lightClass: 'bg-[#5c7c5c]/10 text-[#5c7c5c]',
    darkClass: 'dark:bg-[#5c7c5c]/20 dark:text-[#6b8b6b]',
    dotLight: 'bg-[#5c7c5c]',
    dotDark: 'dark:bg-[#6b8b6b]'
  },
  new_demand: { 
    label: 'New Demand', 
    lightClass: 'bg-[#5c7c5c]/10 text-[#5c7c5c]',
    darkClass: 'dark:bg-[#5c7c5c]/20 dark:text-[#6b8b6b]',
    dotLight: 'bg-[#5c7c5c]',
    dotDark: 'dark:bg-[#6b8b6b]'
  },
  'in-progress': {
    label: 'In Progress',
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4b896]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  in_progress: { 
    label: 'In Progress', 
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4b896]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  scored: { 
    label: 'Scored', 
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4b896]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  'ea-review': {
    label: 'EA Review',
    lightClass: 'bg-[#8b7355]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#8b7355]/20 dark:text-[#c69c6d]',
    dotLight: 'bg-[#8b7355]',
    dotDark: 'dark:bg-[#c69c6d]'
  },
  ea_review: { 
    label: 'EA Review', 
    lightClass: 'bg-[#8b7355]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#8b7355]/20 dark:text-[#c69c6d]',
    dotLight: 'bg-[#8b7355]',
    dotDark: 'dark:bg-[#c69c6d]'
  },
  analyse: {
    label: 'Analyse',
    lightClass: 'bg-[#c69c6d]/15 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/25 dark:text-[#d4b896]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  budget_review: { 
    label: 'Budget Review', 
    lightClass: 'bg-[#8b7355]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#8b7355]/20 dark:text-[#c69c6d]',
    dotLight: 'bg-[#8b7355]',
    dotDark: 'dark:bg-[#c69c6d]'
  },
  ready: { 
    label: 'Ready', 
    lightClass: 'bg-[#5c7c5c]/15 text-[#4a6a4a]',
    darkClass: 'dark:bg-[#5c7c5c]/25 dark:text-[#6b8b6b]',
    dotLight: 'bg-[#5c7c5c]',
    dotDark: 'dark:bg-[#6b8b6b]'
  },
  approved: {
    label: 'Approved',
    lightClass: 'bg-[#5c7c5c]/15 text-[#4a6a4a]',
    darkClass: 'dark:bg-[#5c7c5c]/25 dark:text-[#6b8b6b]',
    dotLight: 'bg-[#5c7c5c]',
    dotDark: 'dark:bg-[#6b8b6b]'
  },
  implement: {
    label: 'Implement',
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4b896]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  blocked: {
    label: 'Blocked',
    lightClass: 'bg-[#8b7355]/15 text-[#6b5544]',
    darkClass: 'dark:bg-[#8b7355]/25 dark:text-[#c69c6d]',
    dotLight: 'bg-[#8b7355]',
    dotDark: 'dark:bg-[#c69c6d]'
  },
  rejected: {
    label: 'Rejected',
    lightClass: 'bg-[#8b7355]/15 text-[#6b5544]',
    darkClass: 'dark:bg-[#8b7355]/25 dark:text-[#c69c6d]',
    dotLight: 'bg-[#8b7355]',
    dotDark: 'dark:bg-[#c69c6d]'
  },
  completed: { 
    label: 'Completed', 
    lightClass: 'bg-[#d4b896]/20 text-[#8b7355]',
    darkClass: 'dark:bg-[#d4b896]/15 dark:text-[#d4b896]',
    dotLight: 'bg-[#d4b896]',
    dotDark: 'dark:bg-[#d4b896]'
  },
  closed: {
    label: 'Closed',
    lightClass: 'bg-[#d4b896]/20 text-[#8b7355]',
    darkClass: 'dark:bg-[#d4b896]/15 dark:text-[#d4b896]',
    dotLight: 'bg-[#d4b896]',
    dotDark: 'dark:bg-[#d4b896]'
  },
};

export function StatusCell({ status }: StatusCellProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || 'new';
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.new;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
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

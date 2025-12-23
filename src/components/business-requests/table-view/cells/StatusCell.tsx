import { cn } from '@/lib/utils';

interface StatusCellProps {
  status: string;
}

/**
 * Status styling with dark mode support (9.5 grade compliance)
 * Uses /30 opacity backgrounds and -400 text colors in dark mode
 */
const STATUS_CONFIG: Record<string, { label: string; lightClass: string; darkClass: string; dotLight: string; dotDark: string }> = {
  new: { 
    label: 'New', 
    lightClass: 'bg-blue-100 text-blue-700',
    darkClass: 'dark:bg-blue-900/30 dark:text-blue-400',
    dotLight: 'bg-blue-500',
    dotDark: 'dark:bg-blue-400'
  },
  new_request: { 
    label: 'New Request', 
    lightClass: 'bg-blue-100 text-blue-700',
    darkClass: 'dark:bg-blue-900/30 dark:text-blue-400',
    dotLight: 'bg-blue-500',
    dotDark: 'dark:bg-blue-400'
  },
  new_demand: { 
    label: 'New Demand', 
    lightClass: 'bg-blue-100 text-blue-700',
    darkClass: 'dark:bg-blue-900/30 dark:text-blue-400',
    dotLight: 'bg-blue-500',
    dotDark: 'dark:bg-blue-400'
  },
  'in-progress': {
    label: 'In Progress',
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4a855]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4a855]'
  },
  in_progress: { 
    label: 'In Progress', 
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4a855]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4a855]'
  },
  scored: { 
    label: 'Scored', 
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4a855]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4a855]'
  },
  'ea-review': {
    label: 'EA Review',
    lightClass: 'bg-purple-100 text-purple-700',
    darkClass: 'dark:bg-purple-900/30 dark:text-purple-400',
    dotLight: 'bg-purple-500',
    dotDark: 'dark:bg-purple-400'
  },
  ea_review: { 
    label: 'EA Review', 
    lightClass: 'bg-purple-100 text-purple-700',
    darkClass: 'dark:bg-purple-900/30 dark:text-purple-400',
    dotLight: 'bg-purple-500',
    dotDark: 'dark:bg-purple-400'
  },
  analyse: {
    label: 'Analyse',
    lightClass: 'bg-purple-100 text-purple-700',
    darkClass: 'dark:bg-purple-900/30 dark:text-purple-400',
    dotLight: 'bg-purple-500',
    dotDark: 'dark:bg-purple-400'
  },
  budget_review: { 
    label: 'Budget Review', 
    lightClass: 'bg-purple-100 text-purple-700',
    darkClass: 'dark:bg-purple-900/30 dark:text-purple-400',
    dotLight: 'bg-purple-500',
    dotDark: 'dark:bg-purple-400'
  },
  ready: { 
    label: 'Ready', 
    lightClass: 'bg-green-100 text-green-700',
    darkClass: 'dark:bg-green-900/30 dark:text-green-400',
    dotLight: 'bg-green-500',
    dotDark: 'dark:bg-green-400'
  },
  approved: {
    label: 'Approved',
    lightClass: 'bg-green-100 text-green-700',
    darkClass: 'dark:bg-green-900/30 dark:text-green-400',
    dotLight: 'bg-green-500',
    dotDark: 'dark:bg-green-400'
  },
  implement: {
    label: 'Implement',
    lightClass: 'bg-[#c69c6d]/10 text-[#8b7355]',
    darkClass: 'dark:bg-[#c69c6d]/20 dark:text-[#d4a855]',
    dotLight: 'bg-[#c69c6d]',
    dotDark: 'dark:bg-[#d4a855]'
  },
  blocked: {
    label: 'Blocked',
    lightClass: 'bg-red-100 text-red-700',
    darkClass: 'dark:bg-red-900/30 dark:text-red-400',
    dotLight: 'bg-red-500',
    dotDark: 'dark:bg-red-400'
  },
  rejected: {
    label: 'Rejected',
    lightClass: 'bg-red-100 text-red-700',
    darkClass: 'dark:bg-red-900/30 dark:text-red-400',
    dotLight: 'bg-red-500',
    dotDark: 'dark:bg-red-400'
  },
  completed: { 
    label: 'Completed', 
    lightClass: 'bg-gray-100 text-gray-600',
    darkClass: 'dark:bg-gray-700 dark:text-gray-400',
    dotLight: 'bg-gray-500',
    dotDark: 'dark:bg-gray-400'
  },
  closed: {
    label: 'Closed',
    lightClass: 'bg-gray-100 text-gray-600',
    darkClass: 'dark:bg-gray-700 dark:text-gray-400',
    dotLight: 'bg-gray-500',
    dotDark: 'dark:bg-gray-400'
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

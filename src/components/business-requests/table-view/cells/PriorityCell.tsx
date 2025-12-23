import { cn } from '@/lib/utils';

interface PriorityCellProps {
  priority: string | null;
}

/**
 * Priority badge styling with dark mode support (9.5 grade compliance)
 * Uses visible borders and proper contrast in dark mode
 */
const PRIORITY_STYLES: Record<string, { light: string; dark: string }> = {
  critical: {
    light: 'bg-red-100 text-red-700 border border-red-200',
    dark: 'dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  },
  high: {
    light: 'bg-orange-100 text-orange-700 border border-orange-200',
    dark: 'dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
  },
  medium: {
    light: 'bg-amber-100 text-amber-700 border border-amber-200',
    dark: 'dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
  },
  low: {
    light: 'bg-gray-100 text-gray-600 border border-gray-200',
    dark: 'dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
  },
  unscored: {
    light: 'bg-transparent text-gray-400 border-2 border-dashed border-gray-200',
    dark: 'dark:text-gray-500 dark:border-gray-700'
  },
};

export function PriorityCell({ priority }: PriorityCellProps) {
  // Show em-dash for null or empty
  if (!priority) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }

  const normalizedPriority = priority.toLowerCase();
  const styles = PRIORITY_STYLES[normalizedPriority] || PRIORITY_STYLES.low;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize",
      styles.light,
      styles.dark
    )}>
      {priority}
    </span>
  );
}

import { cn } from '@/lib/utils';

interface PriorityCellProps {
  priority: string | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
};

export function PriorityCell({ priority }: PriorityCellProps) {
  // Show em-dash for null, empty, or "unscored"
  if (!priority || priority.toLowerCase() === 'unscored') {
    return <span className="text-muted-foreground italic">—</span>;
  }

  const normalizedPriority = priority.toLowerCase();
  const styleClass = PRIORITY_STYLES[normalizedPriority] || PRIORITY_STYLES.low;

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
      styleClass
    )}>
      {priority}
    </span>
  );
}
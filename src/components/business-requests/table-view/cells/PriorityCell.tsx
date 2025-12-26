import { cn } from '@/lib/utils';

interface PriorityCellProps {
  priority: string | null;
}

/**
 * Priority badge styling using Blue + Teal Catalyst palette
 * Red (critical), Amber (high), Blue (medium), Gray (low)
 */
const PRIORITY_STYLES: Record<string, { light: string; dark: string }> = {
  critical: {
    light: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]',
    dark: 'dark:bg-[rgba(239,68,68,0.15)] dark:text-[#f87171] dark:border-[rgba(239,68,68,0.4)]'
  },
  high: {
    light: 'bg-[rgba(245,158,11,0.1)] text-[#b45309] border border-[rgba(245,158,11,0.3)]',
    dark: 'dark:bg-[rgba(245,158,11,0.15)] dark:text-[#fbbf24] dark:border-[rgba(245,158,11,0.4)]'
  },
  medium: {
    light: 'bg-[rgba(37,99,235,0.1)] text-[#2563eb] border border-[rgba(37,99,235,0.3)]',
    dark: 'dark:bg-[rgba(37,99,235,0.15)] dark:text-[#60a5fa] dark:border-[rgba(37,99,235,0.4)]'
  },
  low: {
    light: 'bg-[rgba(107,114,128,0.1)] text-[#6b7280] border border-[rgba(107,114,128,0.3)]',
    dark: 'dark:bg-[rgba(107,114,128,0.15)] dark:text-[#9ca3af] dark:border-[rgba(107,114,128,0.4)]'
  },
  unscored: {
    light: 'bg-transparent text-gray-400 border-2 border-dashed border-gray-200',
    dark: 'dark:text-gray-500 dark:border-gray-700'
  },
};

export function PriorityCell({ priority }: PriorityCellProps) {
  if (!priority) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }

  const normalizedPriority = priority.toLowerCase();
  const styles = PRIORITY_STYLES[normalizedPriority] || PRIORITY_STYLES.unscored;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize",
      styles.light,
      styles.dark
    )}>
      {priority}
    </span>
  );
}
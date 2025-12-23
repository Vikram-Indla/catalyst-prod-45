import { cn } from '@/lib/utils';

interface PriorityCellProps {
  priority: string | null;
}

/**
 * Priority badge styling using ONLY Catalyst brand colors
 * Brand palette: olive (#5c7c5c), bronze (#8b7355), gold (#c69c6d), champagne (#d4b896)
 */
const PRIORITY_STYLES: Record<string, { light: string; dark: string }> = {
  critical: {
    light: 'bg-[#8b7355]/20 text-[#6b5544] border border-[#8b7355]/40',
    dark: 'dark:bg-[#8b7355]/30 dark:text-[#d4b896] dark:border-[#8b7355]/50'
  },
  high: {
    light: 'bg-[#c69c6d]/20 text-[#8b7355] border border-[#c69c6d]/40',
    dark: 'dark:bg-[#c69c6d]/30 dark:text-[#d4b896] dark:border-[#c69c6d]/50'
  },
  medium: {
    light: 'bg-[#d4b896]/25 text-[#8b7355] border border-[#d4b896]/50',
    dark: 'dark:bg-[#d4b896]/20 dark:text-[#d4b896] dark:border-[#d4b896]/40'
  },
  low: {
    light: 'bg-[#5c7c5c]/10 text-[#5c7c5c] border border-[#5c7c5c]/30',
    dark: 'dark:bg-[#5c7c5c]/20 dark:text-[#6b8b6b] dark:border-[#5c7c5c]/40'
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
      "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize",
      styles.light,
      styles.dark
    )}>
      {priority}
    </span>
  );
}

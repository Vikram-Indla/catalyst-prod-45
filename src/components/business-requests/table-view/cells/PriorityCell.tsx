import { cn } from '@/lib/utils';

interface PriorityCellProps {
  priority: string | null;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-[var(--industry-status-blocked)]/10 text-[var(--industry-status-blocked)] border border-[var(--industry-status-blocked)]/20',
  high: 'bg-[var(--industry-priority-high)]/10 text-[var(--industry-priority-high)] border border-[var(--industry-priority-high)]/20',
  medium: 'bg-[var(--industry-priority-medium)]/10 text-[var(--industry-priority-medium)] border border-[var(--industry-priority-medium)]/20',
  low: 'bg-[var(--industry-priority-low)]/10 text-[var(--industry-priority-low)] border border-[var(--industry-priority-low)]/20',
  unscored: 'border-2 border-dashed border-[var(--industry-border-default)] text-[var(--industry-text-muted)]',
};

export function PriorityCell({ priority }: PriorityCellProps) {
  // Show em-dash for null or empty
  if (!priority) {
    return <span className="text-[var(--industry-text-disabled)]">—</span>;
  }

  const normalizedPriority = priority.toLowerCase();
  
  // Handle "unscored" specifically
  if (normalizedPriority === 'unscored') {
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        PRIORITY_STYLES.unscored
      )}>
        Unscored
      </span>
    );
  }

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

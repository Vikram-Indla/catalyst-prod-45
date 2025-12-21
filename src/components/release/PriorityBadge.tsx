import { cn } from '@/lib/utils';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

// Pure Onyx compliant priority colors with dark mode support
const priorityStyles: Record<Priority, { dot: string; text: string }> = {
  critical: { 
    dot: 'bg-red-500',
    text: 'text-gray-900 dark:text-gray-100'
  },
  high: { 
    dot: 'bg-orange-500',
    text: 'text-gray-900 dark:text-gray-100'
  },
  medium: { 
    dot: 'bg-yellow-500',
    text: 'text-gray-900 dark:text-gray-100'
  },
  low: { 
    dot: 'bg-green-500',
    text: 'text-gray-900 dark:text-gray-100'
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const style = priorityStyles[priority];
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", style.text, className)}>
      <span className={cn("w-2 h-2 rounded-full", style.dot)} />
      <span className="capitalize">{priority}</span>
    </span>
  );
}

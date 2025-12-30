import { cn } from '@/lib/utils';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

// Design System V2 compliant priority colors
// Low priority uses TEAL (not green) per spec
const priorityStyles: Record<Priority, { dot: string; text: string }> = {
  critical: { 
    dot: 'bg-red-500',
    text: 'text-foreground'
  },
  high: { 
    dot: 'bg-orange-500',
    text: 'text-foreground'
  },
  medium: { 
    dot: 'bg-yellow-500',
    text: 'text-foreground'
  },
  // TEAL for low priority per design spec v2
  low: { 
    dot: 'bg-[#0d9488] dark:bg-[#14b8a6]',
    text: 'text-foreground'
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

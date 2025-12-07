import { cn } from '@/lib/utils';

type Priority = 'critical' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityColors: Record<Priority, string> = {
  critical: '#E53935',
  high: '#FB8C00',
  medium: '#FDD835',
  low: '#43A047',
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", className)}>
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: priorityColors[priority] }}
      />
      <span className="capitalize">{priority}</span>
    </span>
  );
}

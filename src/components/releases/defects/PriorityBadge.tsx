import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    P1: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgent' },
    P2: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
    P3: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium' },
    P4: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Low' },
  };
  
  const style = config[priority] || config.P3;
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px]' 
    : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={cn(
      "inline-flex items-center rounded font-semibold",
      style.bg,
      style.text,
      sizeClasses
    )}>
      {priority} — {style.label}
    </span>
  );
}

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red' | null;
  className?: string;
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  if (!health) return null;

  const variants = {
    green: 'bg-[rgba(13,148,136,0.08)] text-[#0d9488] border-[rgba(13,148,136,0.2)]',
    yellow: 'bg-[rgba(217,119,6,0.08)] text-[#d97706] border-[rgba(217,119,6,0.2)]',
    red: 'bg-[rgba(239,68,68,0.08)] text-[#ef4444] border-[rgba(239,68,68,0.2)]',
  };

  return (
    <Badge variant="outline" className={cn(variants[health], className)}>
      {health}
    </Badge>
  );
}

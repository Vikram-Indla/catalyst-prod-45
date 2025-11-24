import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red' | null;
  className?: string;
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  if (!health) return null;

  const variants = {
    green: 'bg-success/10 text-success border-success/20',
    yellow: 'bg-warning/10 text-warning border-warning/20',
    red: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <Badge variant="outline" className={cn(variants[health], className)}>
      {health}
    </Badge>
  );
}

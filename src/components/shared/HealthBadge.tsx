import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HEALTH_TOKENS, type SemanticHealth } from '@/lib/semantic-tokens';

interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red' | null;
  className?: string;
}

export function HealthBadge({ health, className }: HealthBadgeProps) {
  if (!health) return null;

  const healthConfig = HEALTH_TOKENS[health as SemanticHealth];

  return (
    <Badge 
      variant="outline" 
      className={cn('border', healthConfig?.chipClass, className)}
    >
      {health}
    </Badge>
  );
}

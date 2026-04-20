import { Lozenge, type LozengeAppearance } from '@/components/ads';

interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red' | null;
  className?: string;
}

const HEALTH_APPEARANCE: Record<'green' | 'yellow' | 'red', LozengeAppearance> = {
  green: 'success',
  yellow: 'moved',
  red: 'removed',
};

export function HealthBadge({ health, className }: HealthBadgeProps) {
  if (!health) return null;

  const appearance = HEALTH_APPEARANCE[health];

  if (className) {
    return (
      <span className={className}>
        <Lozenge appearance={appearance}>{health}</Lozenge>
      </span>
    );
  }

  return <Lozenge appearance={appearance}>{health}</Lozenge>;
}

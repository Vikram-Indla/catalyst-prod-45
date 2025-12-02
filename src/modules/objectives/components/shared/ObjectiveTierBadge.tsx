import { Briefcase, Layers, FolderKanban, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ObjectiveTier } from '../../types/objective.types';
import { cn } from '@/lib/utils';

const TIER_CONFIG = {
  portfolio: {
    label: 'Portfolio',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    icon: Briefcase,
  },
  program: {
    label: 'Program',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: FolderKanban,
  },
  team: {
    label: 'Team',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    icon: Users,
  },
} as const;

interface ObjectiveTierBadgeProps {
  tier: ObjectiveTier;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function ObjectiveTierBadge({ tier, showIcon = true, size = 'md' }: ObjectiveTierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn(
        config.className,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

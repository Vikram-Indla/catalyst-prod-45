import { Briefcase, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ObjectiveTier } from '../../types/objective.types';
import { cn } from '@/lib/utils';

// Only Portfolio and Program tiers are supported in OKR module
const TIER_CONFIG: Record<ObjectiveTier, { label: string; className: string; icon: typeof Briefcase }> = {
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
};

interface ObjectiveTierBadgeProps {
  tier: ObjectiveTier;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function ObjectiveTierBadge({ tier, showIcon = true, size = 'md' }: ObjectiveTierBadgeProps) {
  // Handle legacy 'team' tier by treating as program (fallback for historical data)
  const safeTier: ObjectiveTier = tier === 'portfolio' || tier === 'program' ? tier : 'program';
  const config = TIER_CONFIG[safeTier];
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

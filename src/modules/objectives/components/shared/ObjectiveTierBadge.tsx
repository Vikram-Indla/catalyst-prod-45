import { Briefcase, FolderKanban } from 'lucide-react';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import type { ObjectiveTier } from '../../types/objective.types';
import { cn } from '@/lib/utils';

// Only Portfolio and Program tiers are supported in OKR module.
// Atlaskit Lozenge appearances replace bespoke Tailwind overrides (§L38).
const TIER_CONFIG: Record<ObjectiveTier, { label: string; appearance: LozengeAppearance; icon: typeof Briefcase }> = {
  portfolio: {
    label: 'Portfolio',
    appearance: 'default', // grey
    icon: Briefcase,
  },
  program: {
    label: 'Program',
    appearance: 'success', // green
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
    <Lozenge appearance={config.appearance}>
      <span className="inline-flex items-center">
        {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
        {config.label}
      </span>
    </Lozenge>
  );
}

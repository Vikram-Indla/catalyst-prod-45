import { cn } from '@/lib/utils';
import { PriorityTier, getTierDisplayInfo } from '@/hooks/usePrioritizationConfig';

interface PriorityPillProps {
  tier: PriorityTier;
  className?: string;
}

export function PriorityPill({ tier, className }: PriorityPillProps) {
  const tierInfo = getTierDisplayInfo(tier);

  // Don't render pill for rejected tier or hidden tiers
  if (tierInfo.hidden) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
        tierInfo.bgColor,
        tierInfo.color,
        className
      )}
    >
      {tierInfo.label}
    </span>
  );
}

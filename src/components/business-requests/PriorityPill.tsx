import { cn } from '@/lib/utils';
import { PriorityTier, getTierDisplayInfo } from '@/hooks/usePrioritizationConfig';

interface PriorityPillProps {
  tier: PriorityTier;
  className?: string;
}

export function PriorityPill({ tier, className }: PriorityPillProps) {
  const { label, color, bgColor } = getTierDisplayInfo(tier);

  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
        bgColor,
        color,
        className
      )}
    >
      {label}
    </span>
  );
}

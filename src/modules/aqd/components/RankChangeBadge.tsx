/**
 * Task¹⁰ Rank Change Badge - Shows direction + magnitude of rank changes
 */
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RankChange {
  direction: 'up' | 'down' | 'new' | 'none';
  magnitude: number;
}

interface RankChangeBadgeProps {
  direction: 'up' | 'down' | 'new' | 'none';
  magnitude: number;
  className?: string;
}

export function RankChangeBadge({ direction, magnitude, className }: RankChangeBadgeProps) {
  // Don't render anything if no change
  if (direction === 'none') {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0',
        'rank-change-badge',
        direction === 'up' && 'bg-emerald-100 text-emerald-700',
        direction === 'down' && 'bg-red-100 text-red-700',
        direction === 'new' && 'bg-blue-100 text-blue-700',
        className
      )}
    >
      {direction === 'up' && (
        <>
          <ArrowUp size={12} strokeWidth={2.5} />
          {magnitude}
        </>
      )}
      {direction === 'down' && (
        <>
          <ArrowDown size={12} strokeWidth={2.5} />
          {magnitude}
        </>
      )}
      {direction === 'new' && 'NEW'}
    </span>
  );
}

/**
 * Calculate rank change from current and previous rank
 */
export function calculateRankChange(
  currentRank: number,
  previousRank: number | null,
  isNewThisWeek: boolean
): RankChange {
  // New items with no previous rank
  if (isNewThisWeek && previousRank === null) {
    return { direction: 'new', magnitude: 0 };
  }
  
  // No previous rank recorded (first time seeing this item)
  if (previousRank === null) {
    return { direction: 'none', magnitude: 0 };
  }
  
  // No change
  if (previousRank === currentRank) {
    return { direction: 'none', magnitude: 0 };
  }
  
  // Lower rank number = higher priority = moved UP
  if (currentRank < previousRank) {
    return { direction: 'up', magnitude: previousRank - currentRank };
  }
  
  // Higher rank number = lower priority = moved DOWN
  return { direction: 'down', magnitude: currentRank - previousRank };
}

export default RankChangeBadge;

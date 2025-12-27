/**
 * DrawerMetadataChips - Score, Rank, Quarter chips
 * Catalyst Design System: Champagne (#D4B896), Bronze (#8B7355), Olive (#5C7C5C)
 */

import { Star, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';

interface DrawerMetadataChipsProps {
  platform?: string | null;
  quarter?: string | null;
  priorityTier?: PriorityTier | string | null;
  priorityScore?: number | null;
  rank?: number | null;
  className?: string;
}

export function DrawerMetadataChips({
  quarter,
  priorityTier,
  priorityScore,
  rank,
  className
}: DrawerMetadataChipsProps) {
  // Format score display
  const getScoreDisplay = () => {
    if (priorityScore) {
      return `Score: ${priorityScore.toFixed(1)}`;
    }
    return 'Unscored';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Score Chip - Champagne background */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium"
        style={{
          background: '#2563eb',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          color: '#ffffff',
        }}
      >
        <Star className="h-3.5 w-3.5" />
        {getScoreDisplay()}
      </div>

      {/* Rank Chip - Olive accent (if ranked) */}
      {rank && (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium"
          style={{
            background: 'var(--status-success-bg)',
            border: '1px solid var(--status-success-border)',
            color: 'var(--status-success)',
          }}
        >
          <Hash className="h-3.5 w-3.5" />
          Rank: {rank}
        </div>
      )}

      {/* Quarter Chip (if set) */}
      {quarter && (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium"
          style={{
            background: 'var(--surface-hover, hsl(var(--muted)))',
            border: '1px solid var(--border-default, hsl(var(--border)))',
            color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
          }}
        >
          {quarter}
        </div>
      )}
    </div>
  );
}

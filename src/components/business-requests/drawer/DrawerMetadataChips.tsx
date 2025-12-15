/**
 * DrawerMetadataChips - Non-ownership tags only (Platform, Quarter, Priority, Rank)
 * Ownership fields (Status, Owner, Dept, Target) are in the Meta Strip above
 */

import { format } from 'date-fns';
import { Layers, CalendarDays, TrendingUp, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';

interface MetadataChip {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  colorClass?: string;
}

interface DrawerMetadataChipsProps {
  platform?: string | null;
  quarter?: string | null;
  priorityTier?: PriorityTier | string | null;
  priorityScore?: number | null;
  rank?: number | null;
  className?: string;
}

export function DrawerMetadataChips({
  platform,
  quarter,
  priorityTier,
  priorityScore,
  rank,
  className
}: DrawerMetadataChipsProps) {
  // Format priority display
  const getPriorityDisplay = () => {
    if (!priorityTier || priorityTier === 'unscored') {
      return null;
    }
    const { label } = getTierDisplayInfo(priorityTier as PriorityTier);
    const score = priorityScore ? ` (${priorityScore.toFixed(1)})` : '';
    return `${label}${score}`;
  };

  const chips: MetadataChip[] = [
    {
      icon: Layers,
      label: 'Platform',
      value: platform,
    },
    {
      icon: CalendarDays,
      label: 'Quarter',
      value: quarter,
    },
    {
      icon: TrendingUp,
      label: 'Priority',
      value: getPriorityDisplay(),
    },
    {
      icon: Hash,
      label: 'Rank',
      value: rank ? `#${rank}` : null,
      colorClass: rank ? 'text-brand-gold' : undefined,
    },
  ].filter(chip => chip.value);

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {chips.map((chip, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
          style={{ 
            background: 'var(--surface-2)', 
            border: '1px solid var(--border-color)',
            color: 'var(--text-2)'
          }}
          title={`${chip.label}: ${chip.value}`}
        >
          <chip.icon className="h-3 w-3 shrink-0" style={{ color: 'var(--text-3)' }} />
          <span className={cn("truncate max-w-[100px]", chip.colorClass)}>
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}

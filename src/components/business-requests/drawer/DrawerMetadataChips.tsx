/**
 * DrawerMetadataChips - Compact metadata chips for drawer header
 * Shows key information like Business Owner, Department, Rank, Target Date
 */

import { format } from 'date-fns';
import { User, Building2, Hash, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetadataChip {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  colorClass?: string;
}

interface DrawerMetadataChipsProps {
  businessOwner?: string | null;
  department?: string | null;
  rank?: number | null;
  targetDate?: string | null;
  className?: string;
}

export function DrawerMetadataChips({
  businessOwner,
  department,
  rank,
  targetDate,
  className
}: DrawerMetadataChipsProps) {
  const chips: MetadataChip[] = [
    {
      icon: User,
      label: 'Owner',
      value: businessOwner,
    },
    {
      icon: Building2,
      label: 'Dept',
      value: department,
    },
    {
      icon: Hash,
      label: 'Rank',
      value: rank ? `#${rank}` : null,
      colorClass: rank ? 'text-brand-gold' : undefined,
    },
    {
      icon: Calendar,
      label: 'Target',
      value: targetDate ? format(new Date(targetDate), 'MMM d') : null,
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
          <span className={cn("truncate max-w-[80px]", chip.colorClass)}>
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  );
}

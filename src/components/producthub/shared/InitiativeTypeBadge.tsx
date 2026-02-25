/**
 * InitiativeTypeBadge — Colored badge showing initiative type with Lucide icons
 */
import { FolderKanban, Zap, Wrench, Link, CircleDashed, type LucideIcon } from 'lucide-react';
import { getTypeColor, getTypeLabel } from '@/utils/initiative-type-utils';

const TYPE_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  enhancement: Zap,
  improvement: Wrench,
  
  entity_integration: Link,
};

interface Props {
  typeKey: string | null | undefined;
  className?: string;
}

export function InitiativeTypeBadge({ typeKey, className = '' }: Props) {
  if (!typeKey) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap ${className}`}
        style={{ background: '#F1F5F9', color: '#94A3B8' }}
      >
        —
      </span>
    );
  }

  const colors = getTypeColor(typeKey);
  const Icon = TYPE_ICONS[typeKey] || CircleDashed;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      <Icon className="w-3 h-3" />
      {getTypeLabel(typeKey)}
    </span>
  );
}

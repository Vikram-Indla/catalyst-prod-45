/**
 * InitiativeTypeBadge — Colored badge showing initiative type with Lucide icons
 */
import { FolderKanban, Zap, Wrench, Link, CircleDashed, Lightbulb, type LucideIcon } from 'lucide-react';
import { getTypeColor, getTypeLabel } from '@/utils/initiative-type-utils';

const TYPE_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  enhancement: Zap,
  improvement: Wrench,
  business_request: Lightbulb,
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
        style={{ background: '#1A1A1A', color: 'var(--fg-4)' }}
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

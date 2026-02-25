/**
 * InitiativeTypeBadge — Colored badge showing initiative type
 */
import { getTypeColor, getTypeIcon, getTypeLabel } from '@/utils/initiative-type-utils';

interface Props {
  typeKey: string | null | undefined;
  className?: string;
}

export function InitiativeTypeBadge({ typeKey, className = '' }: Props) {
  if (!typeKey) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap ${className}`}
        style={{ background: '#F1F5F9', color: '#64748B' }}
      >
        — Untyped
      </span>
    );
  }

  const colors = getTypeColor(typeKey);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap ${className}`}
      style={{ background: colors.bg, color: colors.text }}
    >
      {getTypeIcon(typeKey)} {getTypeLabel(typeKey)}
    </span>
  );
}

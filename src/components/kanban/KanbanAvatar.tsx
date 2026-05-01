/**
 * KanbanAvatar — Reusable avatar component for kanban board
 * GUARDRAIL: Always renders CircleUser face icon when no photo is available.
 */
import { CircleUser } from 'lucide-react';
import type { KanbanThemeTokens } from './kanban-tokens';

const AVATAR_COLORS = ['var(--ds-text-brand, var(--ds-text-brand, #2563EB))', '#0D9488', '#0284C7', 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', '#DB2777', '#FF8B00'];

export function KanbanAvatar({ name, url, size = 24, tk }: {
  name?: string | null;
  url?: string | null;
  size?: number;
  tk: KanbanThemeTokens;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || ''}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const bg = name
    ? AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
    : tk.chipBg;

  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: bg }}
      title={name || undefined}
    >
      <CircleUser size={size * 0.7} color="var(--ds-surface, var(--ds-surface, #FFFFFF))" strokeWidth={1.5} />
    </span>
  );
}

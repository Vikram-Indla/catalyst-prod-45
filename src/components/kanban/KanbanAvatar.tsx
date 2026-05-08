/**
 * KanbanAvatar — Reusable avatar component for kanban board
 * GUARDRAIL: Always renders @atlaskit/icon glyph/person when no photo available.
 * jira-compare 2026-05-08: replaced lucide CircleUser with @atlaskit/icon/glyph/person
 */
import PersonIcon from '@atlaskit/icon/glyph/person';
import type { KanbanThemeTokens } from './kanban-tokens';

const AVATAR_COLORS = ['var(--ds-text-brand, #2563EB)', '#0D9488', '#0284C7', 'var(--ds-text-danger, #DC2626)', '#DB2777', '#FF8B00'];

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
      <PersonIcon label={name || 'Unassigned'} size="small" primaryColor="var(--ds-surface, #FFFFFF)" />
    </span>
  );
}

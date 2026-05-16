/**
 * KanbanAvatar — Reusable avatar component for kanban board.
 * Resolution order: local hashed asset → external url prop → @atlaskit/avatar initials.
 */
import Avatar from '@atlaskit/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { KanbanThemeTokens } from './kanban-tokens';

export function KanbanAvatar({ name, url, size = 24 }: {
  name?: string | null;
  url?: string | null;
  size?: number;
  tk?: KanbanThemeTokens;
}) {
  const src = resolveAvatarUrl(name ?? null) ?? url ?? undefined;
  // Map numeric size to nearest Atlaskit Avatar size token.
  const akSize = size <= 16 ? 'xsmall' : size <= 24 ? 'small' : size <= 32 ? 'medium' : 'large';

  return (
    <span
      className="flex-shrink-0"
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      title={name || undefined}
    >
      <Avatar size={akSize as any} name={name ?? 'Unassigned'} src={src} appearance="circle" />
    </span>
  );
}

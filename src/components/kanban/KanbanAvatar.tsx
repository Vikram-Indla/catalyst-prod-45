/**
 * KanbanAvatar — thin wrapper over CatalystAvatar for kanban board.
 * Maps numeric px size to Atlaskit size tokens.
 */
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import type { CatalystAvatarSize } from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

function pxToSize(px: number): CatalystAvatarSize {
  if (px <= 16) return 'xsmall';
  if (px <= 24) return 'small';
  if (px <= 32) return 'medium';
  return 'large';
}

export function KanbanAvatar({ name, url, size = 24 }: {
  name?: string | null;
  url?: string | null;
  size?: number;
  tk?: any;
}) {
  const src = resolveAvatarUrl(name ?? null) ?? url ?? undefined;
  return (
    <CatalystAvatar
      name={name}
      src={src}
      size={pxToSize(size)}
    />
  );
}

/**
 * KanbanAvatar — Reusable avatar component for kanban board
 */
import { User } from 'lucide-react';
import type { KanbanThemeTokens } from './kanban-tokens';

const AVATAR_COLORS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777', '#FF8B00'];

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

  if (!name) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: tk.chipBg }}
      >
        <User size={size * 0.55} color={tk.textMuted} />
      </span>
    );
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        background: bg,
        fontSize: size * 0.42,
        fontWeight: 700,
        color: '#FFFFFF',
      }}
      title={name}
    >
      {initials}
    </span>
  );
}

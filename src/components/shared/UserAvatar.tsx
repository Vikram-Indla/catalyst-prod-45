/**
 * UserAvatar — canonical Catalyst face component for dashboard rows.
 *
 * Resolves a display name → committed PNG via `src/lib/avatars.ts`, falls
 * back to a Jira-style colored-circle-with-initials when no PNG matches.
 *
 * This is the single source of truth for "show a person's face" in the
 * dashboard widgets. Replaces direct `<Avatar size="..." name={...}/>`
 * calls that produced gray-silhouette empty states.
 *
 * Color scheme: deterministic hash → one of 8 ADS accent token families
 * (blue / purple / red / orange / yellow / green / teal / magenta), so the
 * same person always gets the same color across the app — same pattern
 * Atlassian's own avatar fallback uses.
 */
import { type CSSProperties } from 'react';
import { Avatar } from '@/components/ads';
import { resolveAvatarUrl } from '@/lib/avatars';

export type UserAvatarSize =
  | 'xxsmall'   // 16
  | 'xsmall'    // 20
  | 'small'     // 24
  | 'medium'    // 32
  | 'large'     // 40
  | 'xlarge';

interface UserAvatarProps {
  name: string | null | undefined;
  size?: UserAvatarSize;
  /** Override resolver (e.g. when a Jira-synced URL is provided). */
  src?: string | null;
  /** Custom CSS for the wrapper. */
  className?: string;
}

const SIZE_PX: Record<UserAvatarSize, number> = {
  xxsmall: 16,
  xsmall: 20,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 96,
};

const FONT_SIZE: Record<UserAvatarSize, number> = {
  xxsmall: 8,
  xsmall: 9,
  small: 11,
  medium: 13,
  large: 16,
  xlarge: 32,
};

// 8 accent palettes — the colored-circle look matches Atlassian's
// canonical pattern. Each entry uses ADS accent tokens with hex fallbacks.
const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--ds-background-accent-blue-subtler, #CCE0FF)',    fg: 'var(--ds-text-accent-blue-bolder, #09326C)' },
  { bg: 'var(--ds-background-accent-purple-subtler, #DFD8FD)',  fg: 'var(--ds-text-accent-purple-bolder, #352C63)' },
  { bg: 'var(--ds-background-accent-red-subtler, #FFD5D2)',     fg: 'var(--ds-text-accent-red-bolder, #5D1F1A)' },
  { bg: 'var(--ds-background-accent-orange-subtler, #FFE2BD)',  fg: 'var(--ds-text-accent-orange-bolder, #5F3811)' },
  { bg: 'var(--ds-background-accent-yellow-subtler, #F8E6A0)',  fg: 'var(--ds-text-accent-yellow-bolder, #533F04)' },
  { bg: 'var(--ds-background-accent-green-subtler, #BAF3DB)',   fg: 'var(--ds-text-accent-green-bolder, #164B35)' },
  { bg: 'var(--ds-background-accent-teal-subtler, #C1F0F5)',    fg: 'var(--ds-text-accent-teal-bolder, #1D474B)' },
  { bg: 'var(--ds-background-accent-magenta-subtler, #FDD0EC)', fg: 'var(--ds-text-accent-magenta-bolder, #50253F)' },
];

/** Stable string-hash → palette index. Same name → same color always. */
function paletteFor(name: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Extract two-letter initials, handling multi-word names + Arabic / non-Latin. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({
  name,
  size = 'small',
  src,
  className,
}: UserAvatarProps) {
  if (!name) {
    return <Avatar size={size} className={className} />;
  }
  // Caller-supplied src wins; otherwise consult the on-disk resolver.
  const resolvedSrc = src ?? resolveAvatarUrl(name) ?? null;

  if (resolvedSrc) {
    return <Avatar size={size} name={name} src={resolvedSrc} className={className} />;
  }

  // Fallback: colored circle with initials (Jira-canonical look).
  const px = SIZE_PX[size];
  const fontSize = FONT_SIZE[size];
  const { bg, fg } = paletteFor(name);
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: px,
    height: px,
    borderRadius: '50%',
    background: bg,
    color: fg,
    fontSize,
    fontWeight: 600,
    fontFamily:
      '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
    flexShrink: 0,
    userSelect: 'none',
    lineHeight: 1,
  };
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={className}
      style={style}
    >
      {initialsOf(name)}
    </span>
  );
}

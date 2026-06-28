/**
 * CatalystAvatar — Atlaskit Avatar with deterministic initials fallback.
 *
 * Why this exists (2026-05-17 design-critique):
 * Atlaskit Avatar v11 renders a generic person silhouette when given a
 * `name` but no `src`. The Notifications panel and several other surfaces
 * pass real `name` values but no `src` (avatar URL is null in Supabase
 * for most actors), so every avatar reads as a faceless silhouette.
 *
 * This wrapper:
 *   • renders Atlaskit Avatar with `src` when an image URL exists
 *   • renders a deterministically-coloured circle with INITIALS when only
 *     `name` is available (Jira's pattern)
 *   • falls back to Atlaskit's silhouette only when neither is available
 *
 * Use this anywhere a name or assignee appears: notifications, rails,
 * sidebars, comment threads, presence chips.
 */

import Avatar, { type AvatarProps } from '@atlaskit/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';

export type CatalystAvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';

interface Props {
  name?: string | null;
  src?: string | null;
  size?: CatalystAvatarSize;
  appearance?: 'circle' | 'square';
  presence?: AvatarProps['presence'];
  testId?: string;
  /** Render an explicit border around the circle (used by AvatarGroup overlap). */
  borderColor?: string;
}

const SIZE_PX: Record<CatalystAvatarSize, number> = {
  xsmall: 16,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 96,
  xxlarge: 128,
};

// ADS-palette deterministic colour pick. Same name → same colour across the app.
const PALETTE = [
  'var(--ds-link, #0C66E4)', // blue.bold
  'var(--ds-text-success, #216E4E)', // green.bold
  'var(--ds-background-discovery-bold, #6E5DC6)', // purple.bold
  'var(--ds-text-warning, #974F0C)', // orange.bold
  'var(--ds-text-danger, #AE2A19)', // red.bold
  'var(--ds-background-information-bold, #1D7AFC)', // blue.bold (lighter)
  'var(--ds-background-success-bold, #1F845A)', // green
  'var(--ds-background-discovery-bold, #6E5DC6)', // purple
  'var(--ds-link, #0C66E4)', // blue
  '#206A83', // teal.bold
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '';
  if (parts.length === 1) return (parts[0][0] ?? '').toUpperCase();
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return PALETTE[h % PALETTE.length];
}

// CLAUDE.md §19 — external third-party avatar hosts are banned platform-wide.
// DB rows (profiles.avatar_url) carry Gravatar / Atlassian-CDN URLs synced from
// Jira; those must be ignored so the deterministic initials fallback renders
// instead. First-party (local /src/assets, Supabase storage) URLs pass through.
const BANNED_AVATAR_SRC = /gravatar\.com|atl-paas\.net|atlassian\.(?:net|com)\/.*avatar/i;

export function isBannedAvatarSrc(src?: string | null): boolean {
  return !!src && BANNED_AVATAR_SRC.test(src);
}

export default function CatalystAvatar({
  name,
  src,
  size = 'medium',
  appearance = 'circle',
  presence,
  testId,
  borderColor,
}: Props) {
  // Path 1: real image URL → Atlaskit Avatar (handles presence, fallback on load error).
  // Resolution order: caller-supplied src (if not banned) → bundled photo by name → null.
  // Self-resolving from name means callers never need to import resolveAvatarUrl separately.
  const resolvedSrc = isBannedAvatarSrc(src) ? resolveAvatarUrl(name ?? null)
                    : (src ?? resolveAvatarUrl(name ?? null));
  if (resolvedSrc) {
    return (
      <Avatar
        name={name ?? ''}
        src={resolvedSrc}
        size={size}
        appearance={appearance}
        presence={presence}
        testId={testId}
        borderColor={borderColor}
      />
    );
  }

  // Path 2: name but no src → coloured initials circle (canonical Jira fallback)
  if (name && name.trim()) {
    const px = SIZE_PX[size];
    const initials = getInitials(name);
    const bg = colorForName(name);
    // Font scaling: ~0.42 of diameter → 6px / 10px / 14px / 17px / 40px / 54px
    const fontSize = Math.max(9, Math.floor(px * 0.42));
    return (
      <span
        role="img"
        aria-label={name}
        title={name}
        data-testid={testId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: px,
          height: px,
          borderRadius: appearance === 'square' ? Math.max(2, Math.floor(px * 0.15)) : '50%',
          backgroundColor: bg,
          color: 'var(--ds-text-inverse, #FFFFFF)',
          fontWeight: 600,
          fontSize,
          lineHeight: 1,
          flexShrink: 0,
          userSelect: 'none',
          letterSpacing: 0,
          boxShadow: borderColor ? `0 0 0 2px ${borderColor}` : undefined,
          fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
        }}
      >
        {initials}
      </span>
    );
  }

  // Path 3: nothing — fall through to Atlaskit's silhouette
  return <Avatar size={size} appearance={appearance} testId={testId} />;
}

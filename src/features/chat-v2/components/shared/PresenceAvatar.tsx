import React from 'react';
import { resolveAvatarUrl } from '@/lib/avatars';

interface PresenceAvatarProps {
  name: string;
  size?: number;
  presence?: 'online' | 'offline' | 'away' | null;
  /**
   * When set, replaces the auto-derived initials. Use for group DM avatars
   * where Slack shows the OTHER-member count (e.g. "2") instead of letters.
   */
  displayLabel?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function PresenceAvatar({ name, size = 36, presence = null, displayLabel }: PresenceAvatarProps) {
  const dotSize = Math.max(8, Math.round(size * 0.28));
  const fallbackBg = `hsl(${hashHue(name)} 50% 45%)`;
  // CLAUDE.md §19: never render a caller-supplied external avatar URL. Resolve
  // the photo only from the bundled-local resolver; fall back to initials.
  const photo = resolveAvatarUrl(name);
  return (
    <span
      aria-label={name}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flex: '0 0 auto',
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            borderRadius: 'var(--cv2-radius-md)',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            borderRadius: 'var(--cv2-radius-md)',
            background: fallbackBg,
            color: 'var(--ds-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.max(11, Math.round(size * 0.38)),
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {displayLabel ?? initials(name)}
        </span>
      )}
      {presence && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background:
              presence === 'online'
                ? 'var(--cv2-presence-online)'
                : presence === 'away'
                ? '#E8A87C' // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                : 'transparent',
            border:
              presence === 'offline'
                ? '2px solid var(--cv2-text-muted)'
                : '2px solid var(--cv2-bg-sidebar)',
            boxSizing: 'border-box',
          }}
        />
      )}
    </span>
  );
}

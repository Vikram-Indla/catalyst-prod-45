/**
 * Avatar helpers shared across the chat main view.
 * Renders initials in a deterministically-coloured circle — NEVER an
 * external <img>. Colour is derived from the author/name so the same
 * person reads the same colour everywhere.
 */
import React from 'react';
import { resolveAvatarUrl } from '@/lib/avatars';

export type AvatarColor = 'green' | 'red' | 'amber' | 'grey' | 'brand' | 'purple';
export type PresenceColor = 'green' | 'blue' | 'red' | 'amber' | 'grey';

const COLORS: AvatarColor[] = ['green', 'red', 'amber', 'purple', 'brand', 'grey'];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(seed: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export interface AvatarProps {
  name: string;
  seed?: string;
  className?: string;
  color?: AvatarColor;
  presence?: PresenceColor | null;
  /**
   * Pixel size of the avatar circle. Defaults to 28px. Avatar has no
   * intrinsic size from CSS — without this prop OR a sized className,
   * a bundled photo file would expand the container to its natural
   * resolution (causing the giant "AA" defect, 2026-06-08).
   */
  size?: number;
}

export function Avatar({ name, seed, className, color, presence, size = 28 }: AvatarProps) {
  const resolved = color ?? colorFor(seed ?? name);
  const photo = resolveAvatarUrl(name);
  // Explicit size lock — width/height/font-size all derive from `size`.
  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: Math.max(10, Math.round(size * 0.42)),
  };
  return (
    <div
      className={`cc-av cc-av--${resolved}${photo ? ' cc-av--photo' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {photo ? (
        <img src={photo} alt="" className="cc-av__img" />
      ) : (
        initialsOf(name)
      )}
      {presence ? <span className={`cc-dot cc-dot--${presence}`} /> : null}
    </div>
  );
}

/**
 * UserAvatar — canonical Catalyst face component for dashboard rows.
 *
 * Apr 26, 2026 — ADS compliance rewrite.
 *   The previous build emitted a hand-rolled <span> for the initials
 *   fallback, which violated the ADS guardrail (Avatar must come from
 *   @atlaskit/avatar so the consistent chrome — ring, focus state,
 *   hover, presence dot, status dot, click handler, accessible name —
 *   stays uniform across every surface).
 *
 *   New strategy: ALWAYS render Atlaskit's <Avatar>. When neither a
 *   committed PNG nor a Jira-synced URL is available, we synthesize a
 *   tiny SVG data URL containing the colored initials and pass it to
 *   Avatar's `src` prop. The Atlaskit primitive supplies all the
 *   chrome; we just provide the bitmap.
 *
 *   For system actors ("System", "Bot", "Anonymous", "Jira sync") we
 *   feed a cog-glyph SVG instead of initials so transition rows don't
 *   render as "SY".
 *
 *   Sizes are forwarded verbatim to Atlaskit:
 *     xxsmall → 16  ·  xsmall → 20  ·  small → 24  ·  medium → 32
 *     large    → 40  ·  xlarge → 96
 */
import { Avatar } from '@/components/ads';
import { resolveAvatarUrl } from '@/lib/avatars';

export type UserAvatarSize =
  | 'xxsmall'
  | 'xsmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge';

interface UserAvatarProps {
  name: string | null | undefined;
  size?: UserAvatarSize;
  /** Override resolver (e.g. when a Jira-synced URL is provided). */
  src?: string | null;
  /** Custom CSS for the wrapper. */
  className?: string;
}

/** Atlaskit Avatar size → pixel size used to size our generated SVG. */
const SIZE_PX: Record<UserAvatarSize, number> = {
  xxsmall: 16,
  xsmall: 20,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 96,
};

// 8 ADS-canonical accent palettes, hex-resolved (CSS variables don't
// resolve inside an SVG data URL — we'd get black text on transparent).
// These hex values are the same fallbacks used by the bolder/subtler
// Atlaskit tokens, so the SVG matches the design system at paint time.
const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: '#CCE0FF', fg: '#09326C' }, // blue
  { bg: '#DFD8FD', fg: '#352C63' }, // purple
  { bg: '#FFD5D2', fg: '#5D1F1A' }, // red
  { bg: '#FFE2BD', fg: '#5F3811' }, // orange
  { bg: '#F8E6A0', fg: '#533F04' }, // yellow
  { bg: '#BAF3DB', fg: '#164B35' }, // green
  { bg: '#C1F0F5', fg: '#1D474B' }, // teal
  { bg: '#FDD0EC', fg: '#50253F' }, // magenta
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

/** Detect non-person actors that should render as a cog, not initials. */
function isSystemActor(name: string): boolean {
  const v = name.trim().toLowerCase();
  return (
    v === 'system' ||
    v === 'bot' ||
    v === 'anonymous' ||
    v === 'automation' ||
    v === 'jira' ||
    v === 'jira sync' ||
    v.endsWith('-bot') ||
    v.startsWith('bot ')
  );
}

/** Build an SVG data URL containing colored initials. */
function initialsSvgDataUrl(name: string, size: number): string {
  const { bg, fg } = paletteFor(name);
  const initials = initialsOf(name);
  // Atlaskit Avatar clips to a circle; we paint a flat color rect since
  // the round corners come from the wrapper, not the bitmap.
  const fontSize = Math.round(size * 0.44);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}' ` +
    `width='${size}' height='${size}'>` +
    `<rect width='${size}' height='${size}' fill='${bg}'/>` +
    `<text x='50%' y='50%' dy='0.35em' text-anchor='middle' ` +
    `font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' ` +
    `font-size='${fontSize}' font-weight='600' fill='${fg}'>${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Build an SVG data URL containing a neutral cog glyph for system actors. */
function cogSvgDataUrl(size: number): string {
  const fg = '#505258';
  const bg = '#F1F2F4';
  const inner = Math.round(size * 0.55);
  const offset = (size - inner) / 2;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}' ` +
    `width='${size}' height='${size}'>` +
    `<rect width='${size}' height='${size}' fill='${bg}'/>` +
    `<g transform='translate(${offset} ${offset}) scale(${inner / 24})' ` +
    `fill='none' stroke='${fg}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>` +
    `<circle cx='12' cy='12' r='3'/>` +
    `<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'/>` +
    `</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function UserAvatar({
  name,
  size = 'small',
  src,
  className,
}: UserAvatarProps) {
  // Caller-supplied src wins; otherwise consult the on-disk resolver.
  const explicitSrc = src ?? (name ? resolveAvatarUrl(name) : null) ?? null;

  // Pick a generated bitmap when nothing else is available so Atlaskit's
  // Avatar always has something to render (no gray silhouette).
  const px = SIZE_PX[size];
  const fallbackSrc = !explicitSrc
    ? !name
      ? cogSvgDataUrl(px)
      : isSystemActor(name)
        ? cogSvgDataUrl(px)
        : initialsSvgDataUrl(name, px)
    : null;

  return (
    <span className={className}>
      <Avatar
        size={size}
        name={name ?? undefined}
        src={explicitSrc ?? fallbackSrc ?? undefined}
      />
    </span>
  );
}

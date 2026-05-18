/**
 * UserAvatar — canonical Catalyst face component.
 *
 * Composition over duplication: the avatar layer (photo / initials /
 * deterministic colour / silhouette fallback) lives in @/components/shared
 * /CatalystAvatar. This wrapper adds ONE thing on top: an optional
 * country flag chip in the bottom-right corner that admin/people surfaces
 * use to indicate user country.
 *
 * Pinned by: UserAvatar-canonical.test.ts (Phase A, 2026-05-18).
 *   • Single canonical file for all UserAvatar usage across Catalyst.
 *   • ADS-canonical size scale (matches @atlaskit/avatar + CatalystAvatar).
 *   • Exports BOTH named and default for backward compat with existing
 *     default-import consumers (3 project-hub dashboard widgets).
 *
 * Design System reference: surfaced at /admin/design-system/components
 * via componentPreviewFixtures.tsx → previewFixtures['user-avatar'].
 */
import { cn } from '@/lib/utils';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

/** ADS-canonical size scale. Forwarded verbatim to CatalystAvatar / @atlaskit/avatar. */
export type UserAvatarSize =
  | 'xsmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | 'xxlarge';

/** Country → emoji flag map. Keep small and admin-people focused. */
const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦',
  'Pakistan': '🇵🇰',
  'Egypt': '🇪🇬',
  'India': '🇮🇳',
  'Jordan': '🇯🇴',
  'Sudan': '🇸🇩',
  'Kosovo': '🇽🇰',
  'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'UK': '🇬🇧',
  'United Kingdom': '🇬🇧',
};

/** Flag chip size keyed by avatar size. Tailwind utility classes. */
const FLAG_SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xsmall: 'w-3 h-3 text-[8px]',
  small: 'w-4 h-4 text-[10px]',
  medium: 'w-[18px] h-[18px] text-sm',
  large: 'w-5 h-5 text-base',
  xlarge: 'w-7 h-7 text-lg',
  xxlarge: 'w-9 h-9 text-xl',
};

interface UserAvatarProps {
  /** Display name — drives initials fallback + deterministic colour. */
  name: string | null | undefined;
  /** Explicit photo URL. Falls back to resolveAvatarUrl(name) when absent. */
  src?: string | null;
  /** Country name → looks up an emoji flag for the overlay chip. */
  country?: string | null;
  /** Explicit flag SVG URL (e.g. from resource_countries.flag_svg). Overrides country emoji. */
  flagUrl?: string | null;
  onClick?: () => void;
  size?: UserAvatarSize;
  className?: string;
}

export function UserAvatar({
  name,
  src,
  country,
  flagUrl,
  onClick,
  size = 'medium',
  className,
}: UserAvatarProps) {
  // Photo resolution chain: explicit src → local-named fallback → null.
  // CatalystAvatar handles null by rendering deterministic-colour initials.
  const effectiveSrc = src ?? (name ? resolveAvatarUrl(name) : null);
  const flagEmoji = country ? COUNTRY_FLAGS[country] : null;

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <CatalystAvatar
        name={name ?? ''}
        src={effectiveSrc}
        size={size}
      />
      {(flagUrl || flagEmoji) && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-background overflow-hidden',
            FLAG_SIZE_CLASSES[size],
          )}
        >
          {flagUrl ? (
            <img
              src={flagUrl}
              alt={country || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="leading-none">{flagEmoji}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default UserAvatar;

/**
 * AtlaskitAvatar — @atlaskit/avatar-based avatar component with full customization.
 *
 * Wraps @atlaskit/avatar to provide:
 * - Deterministic color seeding from user ID or name
 * - Optional presence indicator (green/red/amber/grey dot)
 * - Profile picture resolution with fallback to initials
 * - Tooltip support showing full name + status
 * - Size normalization (pixel to Atlaskit size mapping)
 *
 * This component is the recommended avatar for new chat surfaces.
 * Existing surfaces use the legacy Avatar component (chat/main/avatar.tsx).
 */

import React, { useMemo } from 'react';
import AtlaskitAvatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { resolveAvatarUrl } from '@/lib/avatars';

export type AvatarPresenceColor = 'green' | 'red' | 'amber' | 'grey';

/**
 * Atlaskit avatar size strings mapped to approximate pixel sizes
 */
const ATLASKIT_SIZE_MAP: Record<'xsmall' | 'small' | 'medium' | 'large' | 'xlarge', number> = {
  xsmall: 16,
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 48,
};

/**
 * Convert pixel size to closest Atlaskit size
 */
function pixelSizeToAtlaskitSize(px: number): 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' {
  if (px <= 20) return 'xsmall';
  if (px <= 28) return 'small';
  if (px <= 36) return 'medium';
  if (px <= 44) return 'large';
  return 'xlarge';
}

/**
 * Generate deterministic color based on seed string
 */
function getColorForSeed(seed: string): string {
  // Use a stable color palette
  const colors = [
    '#0C66E4', // blue (brand)
    '#216E4E', // green
    '#AE2A19', // red
    '#974F0C', // orange/amber
    '#5E4DB2', // purple
    '#626F86', // grey
  ];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Extract initials from a name string
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AtlaskitAvatarProps {
  /** User's display name — used for initials if no image */
  name: string;
  /** Seed for deterministic color (user ID preferred). Falls back to name if not provided. */
  seed?: string;
  /** Explicit CSS size in pixels. Takes precedence over `size` prop. */
  pixelSize?: number;
  /** Atlaskit size: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'. Ignored if pixelSize set. */
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
  /** Avatar shape — 'circle' for people (default), 'square' for projects/channels/spaces. Maps to @atlaskit/avatar appearance. */
  shape?: 'circle' | 'square';
  /** Optional presence indicator: green (online) / red (offline) / amber (away) / grey (idle) */
  presence?: AvatarPresenceColor | null;
  /** Full name for tooltip (if different from name). Shows in tooltip hover state. */
  fullName?: string;
  /** Status string for tooltip (e.g., 'Online', 'In a meeting'). Shows below full name in tooltip. */
  status?: string;
  /** Custom CSS class to apply to the wrapper div */
  className?: string;
  /** Click handler — called when avatar is clicked */
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  /** Whether avatar is disabled (visual state). Defaults to false. */
  isDisabled?: boolean;
}

/**
 * AtlaskitAvatar component — recommended for new chat surfaces.
 *
 * @example
 * // Simple avatar with presence
 * <AtlaskitAvatar name="John Smith" seed="user-123" presence="green" />
 *
 * // Avatar with tooltip
 * <AtlaskitAvatar
 *   name="Jane Doe"
 *   seed="user-456"
 *   fullName="Jane Smith Doe"
 *   status="In a meeting"
 *   size="medium"
 * />
 *
 * // Avatar with click handler
 * <AtlaskitAvatar
 *   name="Bob Jones"
 *   seed="user-789"
 *   pixelSize={40}
 *   onClick={handleOpenProfile}
 * />
 */
export function AtlaskitAvatar({
  name,
  seed,
  pixelSize,
  size = 'medium',
  shape = 'circle',
  presence,
  fullName,
  status,
  className,
  onClick,
  isDisabled = false,
}: AtlaskitAvatarProps) {
  // Determine effective Atlaskit size
  const atlaskitSize = pixelSize ? pixelSizeToAtlaskitSize(pixelSize) : size;
  const effectivePixelSize = pixelSize ?? ATLASKIT_SIZE_MAP[atlaskitSize];

  // Resolve profile picture URL
  const photoUrl = resolveAvatarUrl(name);

  // Generate deterministic color seed
  const colorSeed = seed ?? name;
  const backgroundColor = useMemo(() => getColorForSeed(colorSeed), [colorSeed]);

  // Compute wrapper styles for presence dot positioning
  const wrapperStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      display: 'inline-block',
      width: pixelSize,
      height: pixelSize,
    }),
    [pixelSize],
  );

  // Presence dot colors
  const presenceColorMap: Record<AvatarPresenceColor, string> = {
    green: 'var(--ds-background-success, #216E4E)',
    red: 'var(--ds-background-danger, #AE2A19)',
    amber: 'var(--ds-background-warning, #974F0C)',
    grey: 'var(--ds-background-neutral, #626F86)',
  };

  const avatarElement = (
    <div
      style={pixelSize ? wrapperStyle : undefined}
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onClick(e as any);
              }
            }
          : undefined
      }
    >
      <AtlaskitAvatar
        appearance={shape}
        size={atlaskitSize}
        src={photoUrl ?? undefined}
        name={name}
        isDisabled={isDisabled}
        borderColor="transparent"
        label={fullName || name}
      />

      {/* Presence indicator dot — positioned at bottom-right */}
      {presence && (
        <span
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: `${Math.max(6, Math.round(effectivePixelSize * 0.25))}px`,
            height: `${Math.max(6, Math.round(effectivePixelSize * 0.25))}px`,
            borderRadius: '50%',
            backgroundColor: presenceColorMap[presence],
            border: `2px solid var(--ds-surface, #FFFFFF)`,
            boxSizing: 'border-box',
          }}
          aria-label={`Status: ${presence}`}
        />
      )}
    </div>
  );

  // Wrap in tooltip if fullName or status provided
  if (fullName || status) {
    const tooltipContent = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {fullName && (
          <div style={{ fontWeight: 500, fontSize: '14px', lineHeight: '20px' }}>
            {fullName}
          </div>
        )}
        {status && (
          <div
            style={{
              fontSize: '12px',
              lineHeight: '16px',
              color: 'var(--ds-text-subtlest, #6B778C)',
            }}
          >
            {status}
          </div>
        )}
      </div>
    );
    return <Tooltip content={tooltipContent}>{avatarElement}</Tooltip>;
  }

  return avatarElement;
}

export default AtlaskitAvatar;

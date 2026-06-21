/**
 * UnassignedAvatar — canonical placeholder for assignee / reporter / any
 * person picker when no user is selected. Mirrors Jira's stock unassigned
 * avatar — a gray-blue circle with a filled white person silhouette
 * (the same glyph Atlaskit ships when an Avatar is rendered with no
 * `name` / `src`). Wraps @atlaskit/avatar so the chrome — size grid,
 * border radius, presence ring slot — stays in lockstep with every
 * other avatar in the app.
 *
 * 2026-06-21: single source of truth. Use this anywhere a person picker
 * needs a fallback. NEVER render "None" — always "Unassigned" + this glyph.
 */
import AkAvatar from '@atlaskit/avatar';
import type { ReactNode } from 'react';

export interface UnassignedAvatarProps {
  /** Atlaskit size scale. Defaults to 'small' (24px). */
  size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | number;
  className?: string;
  /** Optional wrapper style — passed to a sizing div when `size` is a number. */
  style?: React.CSSProperties;
}

/**
 * Maps Catalyst's numeric sizes onto Atlaskit's named scale so callers can
 * still pass `size={22}` without rolling a custom wrapper. Atlaskit sizes:
 *   xxsmall=16, xsmall=20, small=24, medium=32, large=40, xlarge=96, xxlarge=128.
 */
function toAtlaskitSize(size: UnassignedAvatarProps['size']): 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' {
  if (typeof size === 'string') return size;
  const n = size ?? 24;
  if (n <= 16) return 'xxsmall';
  if (n <= 20) return 'xsmall';
  if (n <= 24) return 'small';
  if (n <= 32) return 'medium';
  if (n <= 40) return 'large';
  if (n <= 96) return 'xlarge';
  return 'xxlarge';
}

export function UnassignedAvatar({ size = 'small', className, style }: UnassignedAvatarProps): ReactNode {
  const akSize = toAtlaskitSize(size);
  return (
    <span
      role="img"
      aria-label="Unassigned"
      title="Unassigned"
      className={className}
      style={{ display: 'inline-flex', flexShrink: 0, ...style }}
    >
      {/* No `name`, no `src` → Atlaskit renders the Jira default silhouette
          (gray circle + filled white person). */}
      <AkAvatar appearance="circle" size={akSize} label="Unassigned" />
    </span>
  );
}

export default UnassignedAvatar;

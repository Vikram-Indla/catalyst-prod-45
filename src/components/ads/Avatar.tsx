// @ts-nocheck
/**
 * Avatar — Catalyst wrapper over @atlaskit/avatar.
 *
 * Why not use @atlaskit/avatar directly in product code?
 * - Atlaskit's Avatar accepts a `presence` slot that takes a foreign
 *   component instance. We normalise it to a canonical 'online' / 'offline'
 *   / 'busy' enum so product code never needs to import Atlaskit's
 *   presence enum.
 * - The `size` type is widened across Atlaskit versions. We lock to our
 *   Catalyst-owned sizes to keep layouts stable.
 *
 * AvatarGroup is a separate export in the same file — callers that stack
 * multiple assignees (LinkedWorkItems row, backlog cell) reach for it.
 */
import AkAvatar, { AvatarItem as AkAvatarItem } from '@atlaskit/avatar';
import AkAvatarGroup from '@atlaskit/avatar-group';
import { type ReactNode } from 'react';
import { forwardTestId } from './internal/forwardTestId';

export type AvatarSize = 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
export type AvatarPresence = 'online' | 'busy' | 'offline' | 'focus';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps {
  /** Image URL. Falls back to initials if missing. */
  src?: string;
  /** Display name — used for initials, tooltip, aria-label. */
  name: string;
  size?: AvatarSize;
  presence?: AvatarPresence;
  shape?: AvatarShape;
  onClick?: () => void;
  /** Accessible label override — defaults to `name`. */
  'aria-label'?: string;
  testId?: string;
}

export function Avatar({
  src,
  name,
  size = 'medium',
  presence,
  shape = 'circle',
  onClick,
  testId,
  ...rest
}: AvatarProps) {
  return (
    <AkAvatar
      src={src}
      name={name}
      size={size}
      presence={presence}
      appearance={shape}
      onClick={onClick}
      label={rest['aria-label'] ?? name}
      {...forwardTestId(testId)}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * AvatarItem — row-style "avatar + primary text + secondary text"
 * ───────────────────────────────────────────────────────────────── */

export interface AvatarItemProps {
  avatar: ReactNode;
  primaryText: ReactNode;
  secondaryText?: ReactNode;
  onClick?: () => void;
  testId?: string;
}

export function AvatarItem({
  avatar,
  primaryText,
  secondaryText,
  onClick,
  testId,
}: AvatarItemProps) {
  return (
    <AkAvatarItem
      avatar={avatar as never}
      primaryText={primaryText}
      secondaryText={secondaryText}
      onClick={onClick}
      {...forwardTestId(testId)}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * AvatarGroup — stack of up to N avatars with overflow badge
 * ───────────────────────────────────────────────────────────────── */

export interface AvatarGroupData {
  key: string;
  src?: string;
  name: string;
  presence?: AvatarPresence;
}

export interface AvatarGroupProps {
  /** Items to render. Beyond `maxCount`, a +N badge shows. */
  data: AvatarGroupData[];
  size?: AvatarSize;
  /** Max visible before overflow badge. Default: 5. */
  maxCount?: number;
  /** Horizontal stack (default) or vertical popover menu. */
  appearance?: 'stack' | 'grid';
  onAvatarClick?: (item: AvatarGroupData) => void;
  testId?: string;
  'aria-label'?: string;
}

export function AvatarGroup({
  data,
  size = 'medium',
  maxCount = 5,
  appearance = 'stack',
  onAvatarClick,
  testId,
  ...rest
}: AvatarGroupProps) {
  return (
    <AkAvatarGroup
      appearance={appearance}
      size={size}
      maxCount={maxCount}
      data={data.map((d) => ({
        key: d.key,
        src: d.src,
        name: d.name,
        presence: d.presence,
        onClick: onAvatarClick ? () => onAvatarClick(d) : undefined,
      }))}
      label={rest['aria-label']}
      testId={testId}
    />
  );
}
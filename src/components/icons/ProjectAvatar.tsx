/**
 * ProjectAvatar — canonical Catalyst project avatar.
 *
 * Code word: "RESET ICONS"
 *
 * Renders a project's flat-illustration avatar by project key.
 * Runtime overrides from /admin/icons take precedence over bundled assets.
 */

import * as React from 'react';
import {
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  type ProjectKey,
  type StockAvatarId,
} from './icons.registry';
import { useIconOverrides } from './useIconOverrides';

const AVATAR_SIZE_PX = {
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 80,
} as const;

export type ProjectAvatarSize = keyof typeof AVATAR_SIZE_PX | number;

export interface ProjectAvatarProps {
  projectKey: ProjectKey | string | null | undefined;
  size?: ProjectAvatarSize;
  fallback?: StockAvatarId | 'initials';
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

function resolveSize(size: ProjectAvatarSize): number {
  return typeof size === 'number' ? size : AVATAR_SIZE_PX[size];
}

export function ProjectAvatar({
  projectKey, size = 'medium', fallback, label, className, style, testId,
}: ProjectAvatarProps) {
  const { data: overrides } = useIconOverrides();
  const sizePx = resolveSize(size);
  const sharedStyle: React.CSSProperties = {
    width: sizePx,
    height: sizePx,
    borderRadius: 4,
    flexShrink: 0,
    display: 'inline-block',
    objectFit: 'cover',
    ...style,
  };

  if (projectKey && typeof projectKey === 'string' && projectKey in PROJECT_AVATAR_REGISTRY) {
    const meta = PROJECT_AVATAR_REGISTRY[projectKey as ProjectKey];
    const override = overrides?.projectAvatar?.[projectKey];
    const url = override ?? meta.url;
    const resolvedLabel = label ?? meta.name;
    return (
      <img
        src={url}
        width={sizePx}
        height={sizePx}
        alt={resolvedLabel}
        role="img"
        aria-label={resolvedLabel}
        title={resolvedLabel}
        className={className}
        style={sharedStyle}
        data-testid={testId ?? `project-avatar--${projectKey}`}
        data-project-key={projectKey}
        data-icon-source={override ? 'override' : 'bundled'}
        draggable={false}
      />
    );
  }

  if (fallback && fallback !== 'initials' && fallback in STOCK_AVATAR_REGISTRY) {
    const url = STOCK_AVATAR_REGISTRY[fallback as StockAvatarId];
    return (
      <img
        src={url}
        width={sizePx}
        height={sizePx}
        alt={label ?? `Project: ${projectKey ?? 'unassigned'}`}
        role="img"
        aria-label={label ?? `Project: ${projectKey ?? 'unassigned'}`}
        className={className}
        style={sharedStyle}
        data-testid={testId ?? `project-avatar--stock-${fallback}`}
        data-project-key={projectKey ?? ''}
        data-fallback={fallback}
        draggable={false}
      />
    );
  }

  if (fallback === 'initials' && projectKey) {
    const initials = projectKey.slice(0, 2).toUpperCase();
    return (
      <span
        role="img"
        aria-label={label ?? `Project: ${projectKey}`}
        className={className}
        style={{
          ...sharedStyle,
          background: '#DCDFE4',
          color: '#172B4D',
          fontFamily: 'inherit',
          fontWeight: 600,
          fontSize: Math.round(sizePx * 0.42),
          textAlign: 'center',
          lineHeight: `${sizePx}px`,
        }}
        data-testid={testId ?? `project-avatar--initials-${projectKey}`}
        data-project-key={projectKey}
        data-fallback="initials"
      >
        {initials}
      </span>
    );
  }

  return null;
}

export default ProjectAvatar;

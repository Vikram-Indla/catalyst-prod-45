/**
 * ProjectAvatar — canonical Catalyst project avatar component.
 *
 * Code word: "RESET ICONS"
 *
 * Renders a project's flat-illustration avatar by project key
 * (BAU, DATA, DET, ESS, FSM, ICP, IN, INV, IP, IRP, ISA, MDT,
 * MIMI, MWR, SAPI, SIMP, SS, TAH).
 *
 * Avatars are full-bleed self-contained illustrations — they look
 * identical in light and dark mode (correct, matches Jira's pattern).
 *
 * Usage:
 *   <ProjectAvatar projectKey="BAU" size={32} />
 *   <ProjectAvatar projectKey="MDT" size={40} label="MIM Digital Transformation" />
 *
 * For projects without an assigned avatar (or unknown keys), pass a
 * `fallback` of either a stock-pool id or a literal initial-pair to
 * render an Atlaskit-style colored circle.
 *
 * NEVER import an avatar PNG directly — always go through this component.
 */

import * as React from 'react';
import {
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  type ProjectKey,
  type StockAvatarId,
} from './icons.registry';

const AVATAR_SIZE_PX = {
  small: 24,
  medium: 32,
  large: 40,
  xlarge: 80,
} as const;

export type ProjectAvatarSize = keyof typeof AVATAR_SIZE_PX | number;

export interface ProjectAvatarProps {
  /** Catalyst project key (e.g. "BAU", "MDT"). Case-sensitive. */
  projectKey: ProjectKey | string | null | undefined;
  /** Render size — Atlaskit name or px number. Defaults to "medium" (32 px). */
  size?: ProjectAvatarSize;
  /**
   * Fallback strategy when projectKey is unknown:
   *   - StockAvatarId: render that stock avatar
   *   - 'initials': render the first 2 chars of projectKey on a neutral disc
   *   - undefined: render nothing
   */
  fallback?: StockAvatarId | 'initials';
  /** aria-label override. Defaults to the project name from the registry. */
  label?: string;
  /** Pass-through className. */
  className?: string;
  /** Pass-through inline style. */
  style?: React.CSSProperties;
  /** Stable test id. Defaults to `project-avatar--{projectKey}`. */
  testId?: string;
}

function resolveSize(size: ProjectAvatarSize): number {
  return typeof size === 'number' ? size : AVATAR_SIZE_PX[size];
}

export function ProjectAvatar({
  projectKey,
  size = 'medium',
  fallback,
  label,
  className,
  style,
  testId,
}: ProjectAvatarProps) {
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

  // Direct hit — registered project key.
  if (projectKey && typeof projectKey === 'string' && projectKey in PROJECT_AVATAR_REGISTRY) {
    const meta = PROJECT_AVATAR_REGISTRY[projectKey as ProjectKey];
    const resolvedLabel = label ?? meta.name;
    return (
      <img
        src={meta.url}
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
        draggable={false}
      />
    );
  }

  // Stock-pool fallback.
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

  // Initials fallback.
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

  // No fallback configured — render nothing.
  return null;
}

export default ProjectAvatar;

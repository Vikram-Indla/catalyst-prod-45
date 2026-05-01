/**
 * PriorityIcon — canonical Catalyst priority icon component.
 *
 * Code word: "RESET ICONS"
 *
 * Renders one of 6 priority levels (Highest, High, Medium, Low, Lowest, None).
 * Color semantics: red = urgent, orange = medium, blue = calm, muted = none.
 *
 * Light/dark mode handled automatically — only `none` ships a dark variant
 * (the legacy 29% opacity glyph is invisible on dark surfaces).
 *
 * Usage:
 *   <PriorityIcon level="highest" size={16} />
 *   <PriorityIcon level={normalizePriority(rawPriority)} size={12} />
 *
 * NEVER import an SVG asset directly — always go through this component.
 */

import * as React from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  PRIORITY_REGISTRY,
  normalizePriority,
  type PriorityLevel,
  type PriorityMeta,
} from './icons.registry';

export interface PriorityIconProps {
  /**
   * Canonical Catalyst priority level OR any free-text string from a backend
   * (e.g., "Critical", "Blocker", "Trivial"). Free-text is normalized via
   * `normalizePriority`.
   */
  level: PriorityLevel | string | null | undefined;
  /** Render size in CSS px. Defaults to 16. Common: 12, 16, 20. */
  size?: number;
  /**
   * aria-label override. Defaults to the level's human label.
   * Pass empty string for decorative use (sets aria-hidden="true").
   */
  label?: string;
  /** Pass-through className. */
  className?: string;
  /** Pass-through inline style. */
  style?: React.CSSProperties;
  /** Stable test id. Defaults to `priority-icon--{resolvedLevel}`. */
  testId?: string;
}

export function PriorityIcon({
  level,
  size = 16,
  label,
  className,
  style,
  testId,
}: PriorityIconProps) {
  const { isDark } = useTheme();
  const resolvedLevel: PriorityLevel = normalizePriority(
    typeof level === 'string' ? level : level ?? null,
  );
  const meta: PriorityMeta = PRIORITY_REGISTRY[resolvedLevel];

  const src = isDark ? meta.dark : meta.light;
  const resolvedLabel = label ?? meta.label;
  const isDecorative = resolvedLabel === '';

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={isDecorative ? '' : `Priority: ${resolvedLabel}`}
      role={isDecorative ? 'presentation' : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={isDecorative ? undefined : `Priority: ${resolvedLabel}`}
      title={isDecorative ? undefined : `Priority: ${resolvedLabel}`}
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', ...style }}
      data-testid={testId ?? `priority-icon--${resolvedLevel}`}
      data-priority-level={resolvedLevel}
      draggable={false}
    />
  );
}

export default PriorityIcon;

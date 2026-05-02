/**
 * PriorityIcon — canonical Catalyst priority icon.
 *
 * Code word: "RESET ICONS"
 *
 * Renders one of 6 priority levels with theme-aware variants.
 * Runtime overrides from /admin/icons take precedence over bundled assets.
 */

import * as React from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  PRIORITY_REGISTRY,
  normalizePriority,
  type PriorityLevel,
  type PriorityMeta,
} from './icons.registry';
import { useIconOverrides } from './useIconOverrides';

export interface PriorityIconProps {
  level: PriorityLevel | string | null | undefined;
  size?: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export function PriorityIcon({
  level, size = 16, label, className, style, testId,
}: PriorityIconProps) {
  const { isDark } = useTheme();
  const { data: overrides } = useIconOverrides();
  const resolvedLevel: PriorityLevel = normalizePriority(
    typeof level === 'string' ? level : level ?? null,
  );
  const meta: PriorityMeta = PRIORITY_REGISTRY[resolvedLevel];

  const variantKey = isDark ? 'dark' : 'light';
  const override = overrides?.priority?.[resolvedLevel]?.[variantKey];
  const src = override ?? (isDark ? meta.dark : meta.light);

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
      data-icon-source={override ? 'override' : 'bundled'}
      draggable={false}
    />
  );
}

export default PriorityIcon;

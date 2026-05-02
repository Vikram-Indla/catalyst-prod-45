/**
 * WorkItemTypeIcon — canonical Catalyst work-item type icon.
 *
 * Code word: "RESET ICONS"
 *
 * Renders one of 14 work-item type icons. Light/dark mode handled
 * automatically. Runtime overrides from /admin/icons take precedence
 * over the bundled compile-time asset URL.
 */

import * as React from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  WORK_TYPE_REGISTRY,
  normalizeWorkItemType,
  type WorkItemType,
  type WorkTypeMeta,
} from './icons.registry';
import { useIconOverrides } from './useIconOverrides';

export interface WorkItemTypeIconProps {
  /** Canonical Catalyst type id OR free-text Jira string. */
  type: WorkItemType | string;
  /** Render size in CSS px. Defaults to 16. */
  size?: number;
  /** aria-label override. Empty string = decorative (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

const TASK_FALLBACK: WorkTypeMeta = WORK_TYPE_REGISTRY.task;
const warned = new Set<string>();

function warnUnknown(rawType: string) {
  if (!import.meta.env.DEV) return;
  const k = rawType.toLowerCase();
  if (warned.has(k)) return;
  warned.add(k);
  console.warn(
    `[WorkItemTypeIcon] Unknown type "${rawType}" — falling back to Task icon. ` +
      `Add a normalization rule in src/components/icons/icons.registry.ts.`,
  );
}

export function WorkItemTypeIcon({
  type, size = 16, label, className, style, testId,
}: WorkItemTypeIconProps) {
  const { isDark } = useTheme();
  const { data: overrides } = useIconOverrides();

  let meta: WorkTypeMeta = TASK_FALLBACK;
  let resolvedType: WorkItemType = 'task';

  if (type && typeof type === 'string') {
    if (type in WORK_TYPE_REGISTRY) {
      resolvedType = type as WorkItemType;
      meta = WORK_TYPE_REGISTRY[resolvedType];
    } else {
      const normalized = normalizeWorkItemType(type);
      if (normalized) {
        resolvedType = normalized;
        meta = WORK_TYPE_REGISTRY[normalized];
      } else {
        warnUnknown(type);
      }
    }
  }

  const variantKey = isDark ? 'dark' : 'light';
  const override = overrides?.workType?.[resolvedType]?.[variantKey];
  const src = override ?? (isDark ? meta.dark : meta.light);

  const resolvedLabel = label ?? meta.label;
  const isDecorative = resolvedLabel === '';

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={isDecorative ? '' : resolvedLabel}
      role={isDecorative ? 'presentation' : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={isDecorative ? undefined : resolvedLabel}
      title={isDecorative ? undefined : resolvedLabel}
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', ...style }}
      data-testid={testId ?? `work-type-icon--${resolvedType}`}
      data-icon-type={resolvedType}
      data-icon-source={override ? 'override' : 'bundled'}
      draggable={false}
    />
  );
}

export default WorkItemTypeIcon;

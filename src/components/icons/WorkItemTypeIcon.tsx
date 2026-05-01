/**
 * WorkItemTypeIcon — canonical Catalyst work-item type icon component.
 *
 * Code word: "RESET ICONS"
 *
 * Renders one of 14 work-item type icons (Story, Task, Epic, Sub-task,
 * QA Bug, Feature, Change Request, Production Incident, Business Gap,
 * API Requirement, Frontend, Backend, Integration, Figma) at any size.
 *
 * Light/dark mode handled automatically — only icons that fail WCAG AA
 * on Catalyst's dark surface (currently: Figma) ship a dark variant;
 * everything else keeps its brand color in both modes (Jira parity).
 *
 * Accepts either a strict-typed `WorkItemType` or a free-text string
 * (which is normalized via `normalizeWorkItemType`); unknown strings
 * fall back to the 'task' icon with a DEV-only console warning.
 *
 * Usage:
 *   <WorkItemTypeIcon type="story" size={20} />
 *   <WorkItemTypeIcon type={someJiraType} size={16} />          // legacy
 *   <WorkItemTypeIcon type="qa-bug" size={16} label="" />       // decorative
 *
 * NEVER import an SVG asset directly — always go through this component.
 */

import * as React from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  WORK_TYPE_REGISTRY,
  normalizeWorkItemType,
  type WorkItemType,
  type WorkTypeMeta,
} from './icons.registry';

export interface WorkItemTypeIconProps {
  /**
   * Canonical Catalyst work-item type id (kebab-case) OR any free-text
   * string from a backend (e.g., "Bug", "Sub-task", "Production Incident").
   * Free-text is normalized via `normalizeWorkItemType`.
   */
  type: WorkItemType | string;
  /** Render size in CSS px. Defaults to 16. Common: 16, 20, 24. */
  size?: number;
  /**
   * aria-label override. Defaults to the type's human label.
   * Pass empty string for decorative use (sets aria-hidden="true").
   */
  label?: string;
  /** Pass-through className. */
  className?: string;
  /** Pass-through inline style. */
  style?: React.CSSProperties;
  /** Stable test id. Defaults to `work-type-icon--{resolvedType}`. */
  testId?: string;
}

const TASK_FALLBACK_META: WorkTypeMeta = WORK_TYPE_REGISTRY.task;
const warnedUnknownTypes = new Set<string>();

function warnUnknown(rawType: string) {
  if (!import.meta.env.DEV) return;
  const key = rawType.toLowerCase();
  if (warnedUnknownTypes.has(key)) return;
  warnedUnknownTypes.add(key);
  console.warn(
    `[WorkItemTypeIcon] Unknown type "${rawType}" — falling back to Task icon. ` +
      `Add a normalization rule in src/components/icons/icons.registry.ts.`,
  );
}

export function WorkItemTypeIcon({
  type,
  size = 16,
  label,
  className,
  style,
  testId,
}: WorkItemTypeIconProps) {
  const { isDark } = useTheme();

  // Resolve type → meta. Direct hit, then alias resolver, then fallback.
  let meta: WorkTypeMeta = TASK_FALLBACK_META;
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

  const src = isDark ? meta.dark : meta.light;
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
      draggable={false}
    />
  );
}

export default WorkItemTypeIcon;

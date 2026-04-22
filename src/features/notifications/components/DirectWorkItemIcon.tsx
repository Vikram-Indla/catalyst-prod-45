/**
 * DirectWorkItemIcon — thin wrapper around the canonical WorkItemIcon.
 *
 * ⛔ DO NOT add or modify SVG paths here.
 *    All icon definitions live in src/components/shared/WorkItemIcon.tsx (CLAUDE.md §11).
 *    This file exists solely to bridge the DirectWorkItemIconType used in the
 *    notifications feature to the shared component.
 */
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import type { DirectWorkItemIconType } from '../types';

interface Props {
  type: DirectWorkItemIconType | string;
  size?: number;
}

export default function DirectWorkItemIcon({ type, size = 16 }: Props) {
  return <WorkItemIcon type={normalizeIconType(type)} size={size} />;
}

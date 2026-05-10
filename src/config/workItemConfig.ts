import React from 'react';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import BugIcon from '@atlaskit/icon/core/bug';
import FileIcon from '@atlaskit/icon/core/file';
import WarningIcon from '@atlaskit/icon/core/warning';

// No @atlaskit/icon equivalent — inline SVG components
const CircleIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2, className, 'aria-hidden': true,
  }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));

const Building2Icon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  },
    React.createElement('path', { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' }),
    React.createElement('path', { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' }),
    React.createElement('path', { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' }),
    React.createElement('path', { d: 'M10 6h4' }),
    React.createElement('path', { d: 'M10 10h4' }),
    React.createElement('path', { d: 'M10 14h4' }),
    React.createElement('path', { d: 'M10 18h4' }),
  );

const SquareIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  }, React.createElement('rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }));

const GemIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  },
    React.createElement('path', { d: 'M6 3h12l4 6-10 13L2 9Z' }),
    React.createElement('path', { d: 'M11 3 8 9l4 13 4-13-3-6' }),
    React.createElement('path', { d: 'M2 9h20' }),
  );

const GitBranchIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  },
    React.createElement('line', { x1: 6, y1: 3, x2: 6, y2: 15 }),
    React.createElement('circle', { cx: 18, cy: 6, r: 3 }),
    React.createElement('circle', { cx: 6, cy: 18, r: 3 }),
    React.createElement('path', { d: 'M18 9a9 9 0 0 1-9 9' }),
  );

const TargetIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  },
    React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
    React.createElement('circle', { cx: 12, cy: 12, r: 6 }),
    React.createElement('circle', { cx: 12, cy: 12, r: 2 }),
  );

const SirenIcon = ({ className, size }: { className?: string; size?: number }) =>
  React.createElement('svg', {
    width: size || 16, height: size || 16, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true,
  },
    React.createElement('path', { d: 'M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v0' }),
    React.createElement('path', { d: 'M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v0H5v0Z' }),
    React.createElement('path', { d: 'M12 2v3' }),
    React.createElement('path', { d: 'M4.2 4.2 6 6' }),
    React.createElement('path', { d: 'M2 12h3' }),
    React.createElement('path', { d: 'M19.8 4.2 18 6' }),
    React.createElement('path', { d: 'M22 12h-3' }),
    React.createElement('path', { d: 'M16 16h0' }),
    React.createElement('path', { d: 'M8 16h0' }),
    React.createElement('path', { d: 'M12 16v4' }),
  );

export type WorkItemType =
  | 'theme'
  | 'snapshot'
  | 'objective'
  | 'business-request'
  | 'epic'
  | 'feature'
  | 'story'
  | 'defect'
  | 'incident'
  | 'dependency'
  | 'risk';

export interface WorkItemConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  moduleCode: string | null;
  category: 'enterprise' | 'product' | 'program' | 'project' | 'other';
}

/**
 * Centralized work item configuration for consistent icons and colors across the app.
 *
 * Categories:
 * - enterprise: Themes, Objectives
 * - product: Business Request
 * - program: Epics
 * - project: Feature, Story, Defect, Incidents
 * - other: Dependencies, Risks
 */
export const workItemConfig: Record<WorkItemType, WorkItemConfig> = {
  // === ENTERPRISE ===
  'theme': {
    key: 'theme',
    label: 'Themes',
    icon: CircleIcon,
    color: 'text-workitem-theme',
    bgColor: 'bg-workitem-theme',
    moduleCode: 'ENTERPRISE',
    category: 'enterprise',
  },
  'snapshot': {
    key: 'snapshot',
    label: 'Snapshots',
    icon: CalendarIcon as unknown as React.ComponentType<{ className?: string; size?: number }>,
    color: 'text-brand-primary',
    bgColor: 'bg-brand-primary',
    moduleCode: 'ENTERPRISE',
    category: 'enterprise',
  },
  'objective': {
    key: 'objective',
    label: 'Objectives',
    icon: TargetIcon,
    color: 'text-brand-primary',
    bgColor: 'bg-brand-primary',
    moduleCode: 'ENTERPRISE',
    category: 'enterprise',
  },

  // === PRODUCT ===
  'business-request': {
    key: 'business-request',
    label: 'Business Request',
    icon: Building2Icon,
    color: 'text-brand-primary',
    bgColor: 'bg-brand-primary',
    moduleCode: 'PRODUCT',
    category: 'product',
  },

  // === PROGRAM ===
  'epic': {
    key: 'epic',
    label: 'Epics',
    icon: SquareIcon,
    color: 'text-workitem-epic',
    bgColor: 'bg-workitem-epic',
    moduleCode: 'PROGRAM',
    category: 'program',
  },

  // === PROJECT (TEAM module) ===
  'feature': {
    key: 'feature',
    label: 'Features',
    icon: GemIcon,
    color: 'text-workitem-feature',
    bgColor: 'bg-workitem-feature',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'story': {
    key: 'story',
    label: 'Stories',
    icon: FileIcon as unknown as React.ComponentType<{ className?: string; size?: number }>,
    color: 'text-workitem-story',
    bgColor: 'bg-workitem-story',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'defect': {
    key: 'defect',
    label: 'Defects',
    icon: BugIcon as unknown as React.ComponentType<{ className?: string; size?: number }>,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'incident': {
    key: 'incident',
    label: 'Incidents',
    icon: SirenIcon,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: 'TEAM',
    category: 'project',
  },

  // === OTHER ===
  'dependency': {
    key: 'dependency',
    label: 'Dependencies',
    icon: GitBranchIcon,
    color: 'text-brand-primary',
    bgColor: 'bg-brand-primary',
    moduleCode: null,
    category: 'other',
  },
  'risk': {
    key: 'risk',
    label: 'Risks',
    icon: WarningIcon as unknown as React.ComponentType<{ className?: string; size?: number }>,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: null,
    category: 'other',
  },
};

/**
 * Get work items by category
 */
export function getWorkItemsByCategory(category: WorkItemConfig['category']): WorkItemConfig[] {
  return Object.values(workItemConfig).filter(item => item.category === category);
}

/**
 * Get icon for a work item type
 */
export function getWorkItemIcon(type: WorkItemType): React.ComponentType<{ className?: string; size?: number }> {
  return workItemConfig[type]?.icon || CircleIcon;
}

/**
 * Get color class for a work item type
 */
export function getWorkItemColor(type: WorkItemType): string {
  return workItemConfig[type]?.color || 'text-muted-foreground';
}

/**
 * Get background color class for a work item type
 */
export function getWorkItemBgColor(type: WorkItemType): string {
  return workItemConfig[type]?.bgColor || 'bg-muted';
}

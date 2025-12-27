/**
 * WorkItemIcon - Unified icon component for work item types
 * Uses only Catalyst design system tokens from index.css
 */

import { cn } from '@/lib/utils';

export type WorkItemIconType = 
  | 'objective'
  | 'keyresult' 
  | 'epic'
  | 'feature'
  | 'story'
  | 'demand'
  | 'dependency'
  | 'risk'
  | 'theme'
  | 'snapshot';

interface WorkItemIconProps {
  type: WorkItemIconType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 14,
  md: 18,
  lg: 24,
};

/**
 * Get CSS variable color for work item type
 * Uses existing Catalyst tokens
 */
function getTypeColor(type: WorkItemIconType): string {
  switch (type) {
    case 'objective':
      return '#2563eb'; // Blue
    case 'keyresult':
      return 'var(--brand-gold)';
    case 'epic':
      return '#8b5cf6'; // Purple
    case 'feature':
      return '#22c55e'; // Green
    case 'story':
      return '#2563eb'; // Blue
    case 'demand':
      return '#2563eb'; // Blue
    case 'dependency':
      return '#2563eb'; // Blue
    case 'risk':
      return '#f97316'; // Orange
    case 'theme':
      return '#2563eb'; // Blue
    case 'snapshot':
      return '#2563eb'; // Blue
    default:
      return 'var(--text-muted)';
  }
}

/**
 * SVG path data for each work item type
 */
function getIconPath(type: WorkItemIconType): React.ReactNode {
  switch (type) {
    case 'objective':
      // Target icon (matching lucide Target icon)
      return (
        <>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      );
    case 'keyresult':
      // Key icon
      return (
        <path
          d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'epic':
      // Lightning bolt / flash icon
      return (
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      );
    case 'feature':
      // Puzzle piece icon
      return (
        <path
          d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z"
          fill="currentColor"
        />
      );
    case 'story':
      // Document/page icon
      return (
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'demand':
      // Inbox/request icon
      return (
        <path
          d="M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'dependency':
      // Link/chain icon
      return (
        <path
          d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'risk':
      // Warning triangle icon
      return (
        <path
          d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'theme':
      // Outline circle icon (matching unfilled style)
      return (
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      );
    case 'snapshot':
      // Camera icon (outline style)
      return (
        <>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        </>
      );
    default:
      return null;
  }
}

export function WorkItemIcon({ type, size = 'md', className }: WorkItemIconProps) {
  const pixelSize = SIZE_MAP[size];
  const color = getTypeColor(type);

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
      style={{ color }}
    >
      {getIconPath(type)}
    </svg>
  );
}

/**
 * Get label for work item type
 */
export function getWorkItemTypeLabel(type: WorkItemIconType): string {
  const labels: Record<WorkItemIconType, string> = {
    objective: 'Objective',
    keyresult: 'Key Result',
    epic: 'Epic',
    feature: 'Feature',
    story: 'Story',
    demand: 'Demand',
    dependency: 'Dependency',
    risk: 'Risk',
    theme: 'Theme',
    snapshot: 'Snapshot',
  };
  return labels[type] || type;
}

/**
 * WorkItemBadge - Icon with type label
 */
interface WorkItemBadgeProps {
  type: WorkItemIconType;
  displayId?: string;
  name?: string;
  compact?: boolean;
  className?: string;
}

export function WorkItemBadge({ 
  type, 
  displayId, 
  name, 
  compact = false, 
  className 
}: WorkItemBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <WorkItemIcon type={type} size={compact ? 'sm' : 'md'} />
      {displayId && (
        <span className="text-xs font-mono text-muted-foreground">{displayId}</span>
      )}
      {name && !compact && (
        <span className="text-sm truncate">{name}</span>
      )}
    </div>
  );
}

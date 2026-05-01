import React from 'react';

export type WorkItemType = 'story' | 'feature' | 'task' | 'defect' | 'epic';

interface WorkItemTypeIconProps {
  type: WorkItemType;
  size?: number;
}

const ICON_COLORS: Record<WorkItemType, string> = {
  epic: '#904EE2', // Purple - represents large scope
  story: '#36B37E', // Green
  feature: 'var(--ds-text-warning, #F59E0B)', // Amber (was purple - per design system governance)
  task: '#0065FF', // Blue
  defect: '#FF5630', // Red
};

export function WorkItemTypeIcon({ type, size = 16 }: WorkItemTypeIconProps) {
  const color = ICON_COLORS[type];
  
  switch (type) {
    case 'epic':
      // Purple thunderbolt icon - represents large scope and power
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M9.5 2L4 9H7.5L6.5 14L12 7H8.5L9.5 2Z" fill="white" />
        </svg>
      );
    case 'story':
      // Green bookmark/story icon
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="1" width="12" height="14" rx="1" fill={color} />
          <path d="M5 4H11M5 7H11M5 10H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'feature':
      // Amber lightning bolt
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="white" />
        </svg>
      );
    case 'task':
      // Blue checkbox
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'defect':
      // Red bug icon
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" fill={color} />
          <circle cx="8" cy="8" r="4" fill="white" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}

export function getWorkItemTypeLabel(type: WorkItemType): string {
  const labels: Record<WorkItemType, string> = {
    epic: 'Epic',
    story: 'Story',
    feature: 'Feature',
    task: 'Task',
    defect: 'Defect',
  };
  return labels[type];
}

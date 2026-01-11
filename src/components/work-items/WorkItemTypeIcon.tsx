/**
 * WorkItemTypeIcon — Renders colored icon for work item types
 * Story (teal), Task (blue), Defect (red), Subtask (gray)
 * Matches Catalyst V5 design system
 */

import React from 'react';
import { FileText, CheckSquare, CircleDot, Circle } from 'lucide-react';
import { WorkItemType, TYPE_ICON_CONFIG } from '@/types/work-items';
import { cn } from '@/lib/utils';

interface WorkItemTypeIconProps {
  type: WorkItemType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { container: 'w-5 h-5', icon: 12 },
  md: { container: 'w-6 h-6', icon: 14 },
  lg: { container: 'w-8 h-8', icon: 18 },
};

const ICON_MAP: Record<WorkItemType, React.ElementType> = {
  story: FileText,
  task: CheckSquare,
  defect: CircleDot,
  subtask: Circle,
};

export function WorkItemTypeIcon({ 
  type, 
  size = 'md',
  className 
}: WorkItemTypeIconProps) {
  const config = TYPE_ICON_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];
  const IconComponent = ICON_MAP[type];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded',
        sizeConfig.container,
        className
      )}
      style={{ backgroundColor: config.bgColor }}
      title={config.label}
      aria-label={`${config.label} icon`}
    >
      <IconComponent 
        size={sizeConfig.icon} 
        className="text-white" 
        strokeWidth={2}
      />
    </div>
  );
}

export function getWorkItemTypeLabel(type: WorkItemType): string {
  return TYPE_ICON_CONFIG[type].label;
}

export default WorkItemTypeIcon;

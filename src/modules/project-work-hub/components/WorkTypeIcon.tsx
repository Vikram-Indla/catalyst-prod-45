import React from 'react';
import { WorkItemType, WORK_ITEM_TYPE_CONFIG } from '../types';
import { Zap, Bookmark, CheckSquare, Bug, AlertTriangle } from 'lucide-react';

interface WorkTypeIconProps {
  type: WorkItemType;
  size?: 'small' | 'medium';
}

export const WorkTypeIcon: React.FC<WorkTypeIconProps> = ({ type, size = 'small' }) => {
  const config = WORK_ITEM_TYPE_CONFIG[type];
  const sizeClass = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';
  
  const IconComponent = {
    FEATURE: Zap,
    STORY: Bookmark,
    SUBTASK: CheckSquare,
    DEFECT: Bug,
    INCIDENT: AlertTriangle,
  }[type];

  return (
    <span 
      className={`inline-flex items-center justify-center ${sizeClass}`}
      style={{ color: config.color }}
      title={config.label}
    >
      <IconComponent className={sizeClass} />
    </span>
  );
};

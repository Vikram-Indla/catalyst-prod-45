import React from 'react';
import { Priority, PRIORITY_CONFIG } from '../types';
import { ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from 'lucide-react';

interface PriorityIconProps {
  priority: Priority;
  showLabel?: boolean;
}

export const PriorityIcon: React.FC<PriorityIconProps> = ({ priority, showLabel = false }) => {
  const config = PRIORITY_CONFIG[priority];
  
  const IconComponent = {
    HIGHEST: ChevronsUp,
    HIGH: ChevronUp,
    MEDIUM: Minus,
    LOW: ChevronDown,
    LOWEST: ChevronsDown,
  }[priority];

  return (
    <span 
      className="inline-flex items-center gap-1"
      style={{ color: config.color }}
      title={config.label}
    >
      <IconComponent className="w-4 h-4" />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  );
};

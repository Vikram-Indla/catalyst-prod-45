/**
 * Module 3B-2: Priority badge component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ArrowUp, 
  Minus, 
  ArrowDown 
} from 'lucide-react';
import { 
  PRIORITY_CONFIGS, 
  getPriorityFromValue,
  type PriorityLevel 
} from '../../types/queue-management';

interface PriorityBadgeProps {
  priority: PriorityLevel | number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const priorityIcons: Record<PriorityLevel, React.ReactNode> = {
  critical: <AlertTriangle className="h-3 w-3" />,
  high: <ArrowUp className="h-3 w-3" />,
  medium: <Minus className="h-3 w-3" />,
  low: <ArrowDown className="h-3 w-3" />,
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  className,
}: PriorityBadgeProps) {
  const priorityLevel = typeof priority === 'number' 
    ? getPriorityFromValue(priority) 
    : priority;
  
  const config = PRIORITY_CONFIGS[priorityLevel];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium inline-flex items-center gap-1 shrink-0',
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && priorityIcons[priorityLevel]}
      <span>{config.label}</span>
    </Badge>
  );
}

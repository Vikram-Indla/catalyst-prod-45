/**
 * Individual row component for the list panel
 */

import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { RoadmapDemand } from '../types/roadmap';
import { catalystTokens } from '../lib/design-tokens';

interface RoadmapListRowProps {
  item: RoadmapDemand;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

const getStatusColor = (status: string | null): string => {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return colors[status || 'draft'] || colors.draft;
};

const getHealthColor = (health: string | null): string => {
  const colors: Record<string, string> = {
    on_track: 'text-green-600 dark:text-green-400',
    at_risk: 'text-amber-600 dark:text-amber-400',
    off_track: 'text-red-600 dark:text-red-400',
  };
  return colors[health || ''] || 'text-muted-foreground';
};

export function RoadmapListRow({
  item,
  index,
  isFocused,
  isSelected,
  onClick,
  isDragging,
}: RoadmapListRowProps) {
  const productColor = item.product?.color || catalystTokens.secondary.grey.base;
  
  return (
    <div
      role="row"
      tabIndex={0}
      data-row-index={index}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 border-b border-border cursor-pointer transition-colors',
        'hover:bg-accent/50',
        isFocused && 'ring-2 ring-inset ring-primary',
        isSelected && 'bg-accent',
        isDragging && 'opacity-50 bg-muted'
      )}
    >
      {/* Drag handle */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Product color indicator */}
      <div 
        className="w-1 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: productColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Key and title row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
            {item.request_key}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {item.title}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2">
          {item.product && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {item.product.name}
            </span>
          )}
          
          {/* Progress indicator */}
          {item.progress > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Progress value={item.progress} className="w-12 h-1.5" />
              <span className="text-[10px] text-muted-foreground">{item.progress}%</span>
            </div>
          )}

          {/* Health indicator */}
          {item.health && (
            <span className={cn('text-[10px] font-medium', getHealthColor(item.health))}>
              {item.health.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge 
        variant="secondary" 
        className={cn(
          'flex-shrink-0 text-[10px] px-2 py-0.5',
          getStatusColor(item.process_step)
        )}
      >
        {(item.process_step || 'draft').replace('_', ' ')}
      </Badge>
    </div>
  );
}

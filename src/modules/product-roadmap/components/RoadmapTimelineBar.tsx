/**
 * Timeline bar representing a demand on the timeline
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RoadmapDemand } from '../types/roadmap';
import { catalystTokens } from '../lib/design-tokens';
import { format, parseISO } from 'date-fns';

interface RoadmapTimelineBarProps {
  item: RoadmapDemand;
  left: number; // percentage
  width: number; // percentage
  isSelected: boolean;
  onClick: () => void;
}

export function RoadmapTimelineBar({
  item,
  left,
  width,
  isSelected,
  onClick,
}: RoadmapTimelineBarProps) {
  const productColor = item.product?.color || catalystTokens.secondary.grey.base;
  
  // Format dates for tooltip
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer',
            'transition-all duration-150 ease-out',
            'hover:shadow-md hover:z-10',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            isSelected && 'ring-2 ring-primary shadow-md z-10'
          )}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 2)}%`, // Minimum 2% width for visibility
            backgroundColor: productColor,
          }}
        >
          {/* Progress overlay */}
          {item.progress > 0 && item.progress < 100 && (
            <div 
              className="absolute inset-0 rounded bg-black/20"
              style={{
                clipPath: `inset(0 ${100 - item.progress}% 0 0)`,
              }}
            />
          )}

          {/* Content - only show if bar is wide enough */}
          {width > 8 && (
            <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
              <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                {item.request_key}
              </span>
            </div>
          )}

          {/* Completed indicator */}
          {item.progress === 100 && (
            <div className="absolute -right-1 -top-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Resize handles (visual only for now) */}
          <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 rounded-l" />
          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30 rounded-r" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium">{item.request_key}: {item.title}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </div>
          {item.product && (
            <div className="text-xs text-muted-foreground">
              Product: {item.product.name}
            </div>
          )}
          {item.progress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={item.progress} className="w-20 h-1.5" />
              <span className="text-xs">{item.progress}%</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Unscheduled indicator for items without dates
 */
export function RoadmapUnscheduledIndicator({ item }: { item: RoadmapDemand }) {
  const productColor = item.product?.color || catalystTokens.secondary.grey.base;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-muted-foreground"
        >
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: productColor }}
          />
          <span className="text-xs">Unscheduled</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div>
          <div className="font-medium">{item.request_key}: {item.title}</div>
          <div className="text-xs text-muted-foreground mt-1">
            No start/end dates set. Drag to schedule.
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

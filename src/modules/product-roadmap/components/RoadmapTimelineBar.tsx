/**
 * Timeline bar representing a demand on the timeline
 * Enterprise-grade styling with Catalyst colors
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';
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
  const productColor = item.product?.color || catalystTokens.brand.primary;
  
  // Format dates for tooltip
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Calculate a slightly darker color for the progress overlay
  const progressOpacity = item.progress > 0 && item.progress < 100 ? 0.25 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-7 rounded-md cursor-pointer',
            'flex items-center px-2 overflow-hidden',
            'transition-all duration-150 ease-out',
            'hover:brightness-95 hover:-translate-y-[calc(50%+2px)] hover:shadow-lg',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            isSelected && 'ring-2 shadow-lg z-10'
          )}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 3)}%`, // Minimum 3% width for visibility
            backgroundColor: productColor,
            '--tw-ring-color': catalystTokens.brand.primary,
          } as React.CSSProperties}
        >
          {/* Progress overlay - darker section showing completion */}
          {progressOpacity > 0 && (
            <div 
              className="absolute inset-0 rounded-md"
              style={{
                background: `linear-gradient(90deg, rgba(0,0,0,${progressOpacity}) 0%, rgba(0,0,0,${progressOpacity}) ${item.progress}%, transparent ${item.progress}%)`,
              }}
            />
          )}

          {/* Content - only show if bar is wide enough */}
          {width > 6 && (
            <span className="text-xs font-medium text-white truncate drop-shadow-sm relative z-10">
              {width > 12 ? item.title : item.request_key}
            </span>
          )}

          {/* Completed indicator */}
          {item.progress === 100 && (
            <div 
              className="absolute -right-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center border-2"
              style={{
                backgroundColor: catalystTokens.status.success.base,
                borderColor: 'var(--background)'
              }}
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Resize handles */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l-md opacity-0 hover:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r-md opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="font-semibold" style={{ color: catalystTokens.light.text.primary }}>
            {item.request_key}: {item.title}
          </div>
          <div className="text-xs flex items-center gap-1.5" style={{ color: catalystTokens.light.text.secondary }}>
            <Calendar className="w-3 h-3" />
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </div>
          {item.product && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: catalystTokens.light.text.secondary }}>
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: item.product.color || catalystTokens.brand.primary }}
              />
              {item.product.name}
            </div>
          )}
          {item.progress > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Progress value={item.progress} className="w-20 h-1.5" />
              <span className="text-xs font-medium">{item.progress}%</span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Unscheduled indicator for items without dates
 * Shows actionable button to set dates
 */
interface RoadmapUnscheduledIndicatorProps {
  item: RoadmapDemand;
  onSetDates?: () => void;
}

export function RoadmapUnscheduledIndicator({ item, onSetDates }: RoadmapUnscheduledIndicatorProps) {
  const productColor = item.product?.color || catalystTokens.secondary.grey.base;
  
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
      {/* Color indicator */}
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0" 
        style={{ backgroundColor: productColor }}
      />
      
      {/* No dates text */}
      <span 
        className="text-sm italic"
        style={{ color: catalystTokens.light.text.muted }}
      >
        No dates set
      </span>
      
      {/* Set dates action button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSetDates?.();
        }}
        className="text-xs font-medium transition-colors hover:underline"
        style={{ 
          color: catalystTokens.brand.primary,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = catalystTokens.brand.primaryHover;
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = catalystTokens.brand.primary;
        }}
      >
        + Set dates
      </button>
    </div>
  );
}

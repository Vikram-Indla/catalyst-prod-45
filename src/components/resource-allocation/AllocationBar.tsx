/**
 * Allocation Bar Component
 * Horizontal bar representing an allocation on the timeline
 * Catalyst V5 Enterprise Design System
 */

import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import type { TimelineBar } from '@/types/resource-allocation.types';
import { Tooltip } from '@/components/ads';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface AllocationBarProps {
  bar: TimelineBar;
  columnWidth: number;
  onClick: () => void;
  onDelete?: () => void;
  stackIndex?: number; // For stacking multiple bars vertically
}

export function AllocationBar({ bar, columnWidth, onClick, onDelete, stackIndex = 0 }: AllocationBarProps) {
  const left = bar.startIndex * columnWidth;
  const width = bar.spanCount * columnWidth - 8; // 8px padding
  const topOffset = 8 + stackIndex * 36; // Stack bars vertically with 36px spacing
  
  const isCommitted = bar.status === 'committed';
  
  return (
    <Popover>
      <Tooltip
        position="top"
        delay={200}
        content={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: bar.assignmentColor }}
              />
              <span className="font-bold text-[13px]">{bar.assignmentName}</span>
            </div>
            <div className="text-[11px] opacity-80 space-y-0.5">
              <div>Allocation: <span className="font-semibold">{bar.percentage}%</span></div>
              <div>Status: <span className="font-semibold capitalize">{bar.status}</span></div>
              <div>Period: <span className="font-semibold">{bar.startDate} → {bar.endDate}</span></div>
            </div>
            <div className="text-[10px] opacity-60 pt-1 border-t border-white/20 mt-2">
              Click for actions
            </div>
          </div>
        }
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "absolute h-7 rounded-md flex items-center justify-center",
              "text-[11px] font-bold",
              "transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              // Committed = solid with white text, Forecast = light fill with dotted border
              isCommitted
                ? "shadow-[0_2px_6px_rgba(0,0,0,0.15)] text-white"
                : "text-foreground"
            )}
            style={{
              top: topOffset,
              left: left + 4,
              width: Math.max(40, width),
              backgroundColor: isCommitted
                ? bar.assignmentColor
                : `${bar.assignmentColor}15`,
              border: isCommitted
                ? 'none'
                : `2px dotted ${bar.assignmentColor}`,
            }}
            aria-label={`${bar.assignmentName}: ${bar.percentage}% ${bar.status}`}
          >
            <span className="px-2 truncate font-bold">
              {bar.percentage}%
            </span>
          </button>
        </PopoverTrigger>
      </Tooltip>

      {/* Popover with Edit/Delete actions */}
      <PopoverContent
        side="top" 
        align="center"
        className="w-auto p-1.5 bg-card border border-border shadow-xl"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 gap-2 text-xs font-medium hover:bg-primary/10 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 gap-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

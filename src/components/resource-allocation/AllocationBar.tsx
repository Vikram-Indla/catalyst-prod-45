/**
 * Allocation Bar Component
 * Horizontal bar representing an allocation on the timeline
 * Catalyst V5 Enterprise Design System
 */

import { cn } from '@/lib/utils';
import type { TimelineBar } from '@/types/resource-allocation.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AllocationBarProps {
  bar: TimelineBar;
  columnWidth: number;
  onClick: () => void;
}

export function AllocationBar({ bar, columnWidth, onClick }: AllocationBarProps) {
  const left = bar.startIndex * columnWidth;
  const width = bar.spanCount * columnWidth - 8; // 8px padding
  
  const isCommitted = bar.status === 'committed';
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "absolute top-2 h-8 rounded-md flex items-center justify-center",
              "text-[11px] font-bold text-white",
              "transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              // Committed = solid, Forecast = striped
              isCommitted 
                ? "shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                : "opacity-80"
            )}
            style={{
              left: left + 4,
              width: Math.max(40, width),
              backgroundColor: isCommitted ? bar.assignmentColor : 'transparent',
              background: isCommitted 
                ? bar.assignmentColor 
                : `repeating-linear-gradient(
                    45deg,
                    ${bar.assignmentColor}40,
                    ${bar.assignmentColor}40 4px,
                    ${bar.assignmentColor}70 4px,
                    ${bar.assignmentColor}70 8px
                  )`,
              border: isCommitted ? 'none' : `2px dashed ${bar.assignmentColor}`,
              color: isCommitted ? 'white' : bar.assignmentColor,
            }}
            aria-label={`${bar.assignmentName}: ${bar.percentage}% ${bar.status}`}
          >
            <span className={cn(
              "px-2 truncate",
              !isCommitted && "font-extrabold"
            )}>
              {bar.percentage}%
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-foreground text-background p-3 rounded-lg shadow-xl max-w-[250px]"
        >
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
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

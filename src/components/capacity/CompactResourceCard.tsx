/**
 * Compact Resource Card - CIO Executive Cockpit
 * Max height: 72px | Dense information | Risk indicators
 * Updated for Time-Boxed Allocations with stacked allocation bars
 */

import { cn } from '@/lib/utils';
import { 
  getAssignmentTheme, 
  getAllocationTheme,
  CATALYST_GOLDEN_HOUR 
} from '@/lib/catalyst-colors';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompactResourceCardProps {
  id: string;
  name: string;
  role?: string;
  department?: string;
  assignmentName?: string | null;
  totalAllocation: number;
  allocations?: ResourceAllocation[];  // For stacked bars
  onOpen360: () => void;
  onEdit: () => void;
}

// Golden Hour colors for allocation segments
const ALLOCATION_SEGMENT_COLORS = [
  CATALYST_GOLDEN_HOUR.olive,
  CATALYST_GOLDEN_HOUR.bronze,
  CATALYST_GOLDEN_HOUR.gold,
  CATALYST_GOLDEN_HOUR.champagne,
  CATALYST_GOLDEN_HOUR.grey,
];

export function CompactResourceCard({ 
  id,
  name, 
  role, 
  department,
  assignmentName,
  totalAllocation,
  allocations = [],
  onOpen360, 
  onEdit 
}: CompactResourceCardProps) {
  // FIX #4: Avatar color from assignment theme
  const theme = getAssignmentTheme(assignmentName);
  // FIX #9 & #10: Status-based colors for border and progress bar
  const alloc = getAllocationTheme(totalAllocation);
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isRisk = totalAllocation > 100;
  const isStretched = totalAllocation > 100 && totalAllocation <= 120;

  // Prepare stacked segments - only show multi-allocation bar when multiple exist
  const hasMultipleAllocations = allocations.length > 1;
  const segments = hasMultipleAllocations 
    ? allocations.map((a, i) => ({
        id: a.id,
        name: a.assignment_name || 'Unknown',
        percent: a.allocation_percent,
        color: ALLOCATION_SEGMENT_COLORS[i % ALLOCATION_SEGMENT_COLORS.length],
      }))
    : [];

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "relative bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md group",
          isRisk ? "border-amber-200" : "border-slate-200 hover:border-slate-300"
        )}
        style={{ 
          // FIX #9: Card left border by STATUS (not assignment)
          borderLeftWidth: '3px', 
          borderLeftColor: alloc.bar,
          maxHeight: '80px',
        }}
        onClick={onEdit}
      >
        {/* Risk indicator dot */}
        {isRisk && (
          <div 
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: isStretched ? '#d97706' : '#8b7355' }}
          />
        )}

        <div className="flex items-center gap-2.5">
          {/* FIX #4: Avatar with assignment-based color */}
          <div 
            onClick={(e) => { e.stopPropagation(); onOpen360(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 shrink-0 transition-all"
            style={{ backgroundColor: theme.accent }}
          >
            {initials}
          </div>

          {/* Info - Compact */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{name}</p>
            <p className="text-[11px] text-slate-500 truncate leading-tight">{role || 'Team Member'}</p>
          </div>

          {/* Allocation Badge with status color */}
          <span 
            className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
            style={{ backgroundColor: alloc.bg, color: alloc.text }}
          >
            {totalAllocation}%
          </span>
        </div>

        {/* Split Allocation Indicator */}
        {hasMultipleAllocations && (
          <div className="absolute top-1 right-6 flex items-center gap-0.5">
            {segments.slice(0, 3).map((seg, i) => (
              <div 
                key={seg.id} 
                className="w-2 h-2 rounded-full ring-1 ring-white"
                style={{ backgroundColor: seg.color, marginLeft: i > 0 ? '-4px' : 0 }}
                title={`${seg.name}: ${seg.percent}%`}
              />
            ))}
            {segments.length > 3 && (
              <span className="text-[8px] text-slate-500 ml-0.5">+{segments.length - 3}</span>
            )}
          </div>
        )}

        {/* Stacked Progress Bar OR Single Bar */}
        <div className="mt-2 flex items-center gap-2">
          {hasMultipleAllocations ? (
            // Stacked allocation bars with tooltips
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              {segments.map((seg) => (
                <Tooltip key={seg.id}>
                  <TooltipTrigger asChild>
                    <div 
                      className="h-full transition-all cursor-default"
                      style={{ 
                        width: `${Math.min(seg.percent, 100)}%`,
                        backgroundColor: seg.color
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-foreground text-background text-xs">
                    <p className="font-medium">{seg.name}</p>
                    <p>{seg.percent}%</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            // Single progress bar
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.min(totalAllocation, 100)}%`,
                  backgroundColor: alloc.bar
                }}
              />
            </div>
          )}
          
          {/* FIX #7: Status label with proper color (NOT grey) */}
          <span 
            className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ 
              color: alloc.labelColor,
              backgroundColor: alloc.labelBg
            }}
          >
            {alloc.label}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

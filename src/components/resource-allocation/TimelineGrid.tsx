/**
 * Timeline Grid Component
 * Displays the timeline with horizontal bars for each assignment
 * Catalyst V5 Enterprise Design System
 */

import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import type { 
  TimelinePeriod, 
  TimelineBar, 
  PeriodCapacity,
  Assignment,
  TimelineView 
} from '@/types/resource-allocation.types';
import { AllocationBar } from './AllocationBar';

interface TimelineGridProps {
  periods: TimelinePeriod[];
  timelineBars: TimelineBar[];
  periodCapacities: PeriodCapacity[];
  assignmentsInUse: Assignment[];
  view: TimelineView;
  firstForecastIndex: number;
  onAddClick: () => void;
  onEditBar: (allocationId: string) => void;
  onDeleteBar: (allocationId: string) => void;
}

export function TimelineGrid({
  periods,
  timelineBars,
  periodCapacities,
  assignmentsInUse,
  view,
  firstForecastIndex,
  onAddClick,
  onEditBar,
  onDeleteBar,
}: TimelineGridProps) {
  const columnWidth = view === 'weeks' ? 65 : 100;
  
  // Group bars by assignment
  const barsByAssignment = new Map<string, TimelineBar[]>();
  timelineBars.forEach(bar => {
    if (!barsByAssignment.has(bar.assignmentId)) {
      barsByAssignment.set(bar.assignmentId, []);
    }
    barsByAssignment.get(bar.assignmentId)!.push(bar);
  });

  return (
    <div className="min-w-max" role="grid" aria-label="Resource allocation timeline">
      {/* Header Row */}
      <div className="flex sticky top-0 z-10 bg-card border-b border-border" role="row">
        <div 
          className="w-[200px] flex-shrink-0 p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]" 
          role="columnheader"
        >
          Assignment
        </div>
        {periods.map((period, index) => (
          <div 
            key={period.id}
            className={cn(
              "flex-shrink-0 p-2 text-center border-l border-border relative",
              period.isPast && "bg-muted/30",
              period.isCurrent && "bg-destructive/5",
              !period.isPast && !period.isCurrent && "bg-[#f8fafc] dark:bg-muted/10"
            )}
            style={{ width: columnWidth }}
            role="columnheader"
          >
            {/* Forecast boundary marker */}
            {index === firstForecastIndex && firstForecastIndex > 0 && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#d97706]" />
            )}
            {index === firstForecastIndex && (
              <div className="absolute top-1 left-0 text-[8px] font-extrabold text-[#d97706] bg-[#fef3c7] border border-[#fcd34d] border-l-0 px-2 py-0.5 rounded-r-md uppercase tracking-wider whitespace-nowrap z-10">
                FORECAST →
              </div>
            )}
            <div className={cn(
              "text-[11px] font-bold",
              period.isPast ? "text-muted-foreground/50" : period.isCurrent ? "text-destructive" : "text-foreground"
            )}>
              {period.label}
            </div>
            <div className={cn(
              "text-[9px] font-medium mt-0.5",
              period.isPast ? "text-muted-foreground/40" : "text-muted-foreground"
            )}>
              {period.shortLabel}
            </div>
            {period.isCurrent && (
              <div className="text-[8px] font-extrabold text-white mt-0.5 bg-destructive rounded px-1.5 py-0.5 inline-block">
                NOW
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Assignment Rows with Timeline Bars */}
      {assignmentsInUse.map((assignment, rowIndex) => {
        const bars = barsByAssignment.get(assignment.id) || [];
        
        return (
          <div 
            key={assignment.id}
            className="flex border-b border-border hover:bg-muted/20 transition-colors group"
            role="row"
          >
            {/* Assignment Name */}
            <div 
              className="w-[200px] flex-shrink-0 p-3 flex items-center gap-2" 
              role="rowheader"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: assignment.color }}
              />
              <span className="text-[12px] font-semibold text-foreground truncate">
                {assignment.name}
              </span>
              <button
                onClick={() => {
                  const bar = bars[0];
                  if (bar) onDeleteBar(bar.allocationId);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/10 text-destructive transition-all"
                aria-label={`Remove ${assignment.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Timeline cells with bars */}
            <div className="flex relative" style={{ height: 48 }}>
              {periods.map((period, colIndex) => (
                <div 
                  key={period.id}
                  className={cn(
                    "flex-shrink-0 border-l border-border",
                    period.isPast && "bg-muted/20",
                    period.isCurrent && "bg-destructive/5"
                  )}
                  style={{ width: columnWidth, height: '100%' }}
                  role="gridcell"
                />
              ))}
              
              {/* Render bars as absolute positioned elements */}
              {bars.map((bar) => (
                <AllocationBar
                  key={bar.allocationId}
                  bar={bar}
                  columnWidth={columnWidth}
                  leftOffset={200}
                  onClick={() => onEditBar(bar.allocationId)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Assignment Row */}
      <div className="flex border-b border-border" role="row">
        <div 
          className="w-[200px] flex-shrink-0 p-3" 
          role="rowheader"
        >
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add assignment
          </button>
        </div>
        {periods.map((period) => (
          <div 
            key={period.id}
            className="flex-shrink-0 border-l border-border bg-muted/10"
            style={{ width: columnWidth, height: 48 }}
            role="gridcell"
          />
        ))}
      </div>

      {/* Empty State */}
      {assignmentsInUse.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-sm font-medium">No assignments found</p>
          <p className="text-xs mt-1">Click "+ Add assignment" to assign this resource to a project.</p>
        </div>
      )}

      {/* Capacity Row */}
      {assignmentsInUse.length > 0 && (
        <div className="flex bg-muted/30 border-t-2 border-border sticky bottom-0" role="row">
          <div 
            className="w-[200px] flex-shrink-0 p-3 flex items-center" 
            role="rowheader"
          >
            <span className="text-[12px] font-extrabold text-foreground uppercase tracking-wide">
              CAPACITY
            </span>
          </div>
          {periodCapacities.map((cap) => (
            <div 
              key={cap.periodId}
              className="flex-shrink-0 p-2 text-center border-l border-border"
              style={{ width: columnWidth }}
              role="gridcell"
            >
              <div className={cn(
                "text-[13px] font-extrabold",
                cap.status === 'over' ? "text-destructive" : 
                cap.status === 'full' ? "text-primary" : 
                "text-foreground"
              )}>
                {cap.total}%
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    cap.status === 'over' ? "bg-destructive" : 
                    cap.status === 'full' ? "bg-primary" : 
                    "bg-[#0d9488]"
                  )}
                  style={{ width: `${Math.min(100, cap.total)}%` }}
                />
              </div>
              {cap.status === 'over' && (
                <div className="text-[9px] text-destructive font-semibold mt-0.5">OVER</div>
              )}
              {cap.status === 'full' && (
                <div className="text-[9px] text-primary font-semibold mt-0.5">FULL</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

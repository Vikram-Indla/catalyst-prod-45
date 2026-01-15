/**
 * Timeline Grid Component
 * Displays the timeline with horizontal bars for each assignment
 * Catalyst V5 Enterprise Design System - Linear/Notion Style
 */

import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
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
  const columnWidth = view === 'weeks' ? 72 : 120;
  const assignmentColumnWidth = 220;
  
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
          className="flex-shrink-0 px-4 py-3 text-[11px] font-semibold text-muted-foreground tracking-wide" 
          style={{ width: assignmentColumnWidth }}
          role="columnheader"
        >
          Assignment
        </div>
        {periods.map((period, index) => (
          <div 
            key={period.id}
            className={cn(
              "flex-shrink-0 py-2 text-center border-l border-border",
              period.isCurrent && "bg-destructive/5"
            )}
            style={{ width: columnWidth }}
            role="columnheader"
          >
            <div className="flex items-center justify-center gap-1">
              <span className={cn(
                "text-[12px] font-bold",
                period.isPast ? "text-muted-foreground/50" : 
                period.isCurrent ? "text-foreground" : 
                "text-foreground"
              )}>
                {period.label}
              </span>
              {period.isCurrent && (
                <span className="text-[9px] font-bold text-white bg-destructive rounded px-1.5 py-0.5">
                  NOW
                </span>
              )}
            </div>
            <div className={cn(
              "text-[10px] font-medium",
              period.isPast ? "text-muted-foreground/40" : "text-muted-foreground"
            )}>
              {view === 'weeks' 
                ? period.shortLabel.split('-')[0] // Just show "Jan 13"
                : period.shortLabel
              }
            </div>
          </div>
        ))}
      </div>

      {/* Assignment Rows with Timeline Bars */}
      {assignmentsInUse.map((assignment) => {
        const bars = barsByAssignment.get(assignment.id) || [];
        const firstBar = bars[0];
        
        return (
          <div 
            key={assignment.id}
            className="flex border-b border-border hover:bg-muted/10 transition-colors"
            role="row"
          >
            {/* Assignment Name with Details */}
            <div 
              className="flex-shrink-0 px-4 py-3 flex flex-col justify-center gap-1" 
              style={{ width: assignmentColumnWidth }}
              role="rowheader"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: assignment.color }}
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-foreground truncate">
                    {assignment.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {firstBar?.percentage || 0}%
                    </span>
                    {firstBar && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                        firstBar.status === 'committed' 
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-[#fef3c7] text-[#92400e] border border-[#fcd34d]"
                      )}>
                        {firstBar.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Timeline cells with bars */}
            <div className="flex relative" style={{ minHeight: 64 }}>
              {/* Background cells */}
              {periods.map((period) => (
                <div 
                  key={period.id}
                  className={cn(
                    "flex-shrink-0 border-l border-border",
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
          className="flex-shrink-0 px-4 py-3" 
          style={{ width: assignmentColumnWidth }}
          role="rowheader"
        >
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </div>
            Add assignment
          </button>
        </div>
        {periods.map((period) => (
          <div 
            key={period.id}
            className="flex-shrink-0 border-l border-border"
            style={{ width: columnWidth, height: 48 }}
            role="gridcell"
          />
        ))}
      </div>

      {/* Empty State */}
      {assignmentsInUse.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No assignments yet</p>
          <p className="text-xs mt-1">Click "+ Add assignment" to get started.</p>
        </div>
      )}

      {/* TOTAL Row */}
      {assignmentsInUse.length > 0 && (
        <div className="flex bg-card border-t-2 border-border sticky bottom-0" role="row">
          <div 
            className="flex-shrink-0 px-4 py-3 flex items-center" 
            style={{ width: assignmentColumnWidth }}
            role="rowheader"
          >
            <span className="text-[12px] font-bold text-foreground uppercase tracking-wide">
              TOTAL
            </span>
          </div>
          {periodCapacities.map((cap) => (
            <div 
              key={cap.periodId}
              className="flex-shrink-0 px-2 py-2 text-center border-l border-border flex flex-col justify-center"
              style={{ width: columnWidth }}
              role="gridcell"
            >
              <div className={cn(
                "text-[13px] font-bold",
                cap.status === 'over' ? "text-destructive" : 
                cap.status === 'full' ? "text-primary" : 
                "text-foreground"
              )}>
                {cap.total}%
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden mx-1">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

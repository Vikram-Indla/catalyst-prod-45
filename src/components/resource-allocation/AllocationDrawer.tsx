/**
 * Resource Allocation Drawer
 * Main container for viewing and editing resource allocations
 * Catalyst V5 Enterprise Design System
 */

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getISOWeek } from 'date-fns';
import { useAllocationDrawer } from '@/hooks/useAllocationDrawer';
import type { AllocationResource, Assignment, WeeklyAllocation, WeekColumn, VisualState } from '@/types/resource-allocation.types';
import { DEPARTMENT_GRADIENTS, ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';
import { getVisualState, isCellEditable, getAllocationForCell, getTotalForWeek } from '@/utils/allocation.utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AllocationDrawerProps {
  resource: AllocationResource;
  onClose: () => void;
}

export function AllocationDrawer({ resource, onClose }: AllocationDrawerProps) {
  const {
    assignments,
    allocations,
    visibleWeeks,
    today,
    weekOffset,
    editingCell,
    isDirty,
    isSaving,
    isLoading,
    validation,
    setEditingCell,
    updateAllocation,
    navigateWeeks,
    goToToday,
    saveChanges,
    discardChanges,
  } = useAllocationDrawer({ resource, onClose });

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingCell) {
          setEditingCell(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingCell, setEditingCell, onClose]);

  const initials = resource.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const departmentGradient = DEPARTMENT_GRADIENTS[resource.department] || DEPARTMENT_GRADIENTS.Delivery;
  const contractEnd = parseISO(resource.contractEnd);
  const daysToEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const showContractWarning = daysToEnd <= 90;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[4px] z-[1000] animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="fixed top-0 right-0 bottom-0 w-[480px] max-w-[100vw] bg-card z-[1001] flex flex-col animate-in slide-in-from-right duration-300"
        style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.15)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header - 64px */}
        <div className="h-16 px-5 flex items-center gap-4 border-b border-border bg-muted/30 flex-shrink-0">
          {/* Avatar */}
          <div 
            className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[14px] font-extrabold text-white flex-shrink-0"
            style={{ 
              background: departmentGradient,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            {initials}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div id="drawer-title" className="text-[15px] font-bold text-foreground tracking-[-0.02em] truncate">
              {resource.name}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span className="truncate">{resource.role}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground flex-shrink-0" />
              <span className="truncate">{resource.department}</span>
              {showContractWarning && (
                <>
                  <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground flex-shrink-0" />
                  <span className="px-1.5 py-0.5 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[10px] font-semibold">
                    Ends {format(contractEnd, 'MMM d')}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Close */}
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center transition-colors hover:bg-muted"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Legend Bar - 44px */}
        <div className="h-11 px-5 flex items-center gap-4 border-b border-border bg-muted/20 flex-shrink-0">
          <LegendItem label="Actual" type="actual" />
          <LegendItem label="Committed" type="committed" />
          <LegendItem label="Forecast" type="forecast" />
          <div className="w-px h-4 bg-border" />
          <LegendItem label="Available" type="available" />
        </div>

        {/* Timeline Nav - 40px */}
        <div className="h-10 px-5 flex items-center gap-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigateWeeks('prev')}
              className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => navigateWeeks('next')}
              className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          
          <span className="text-[12px] font-semibold text-foreground">
            {visibleWeeks[0] && format(parseISO(visibleWeeks[0].weekStart), 'MMMM')} — {visibleWeeks[11] && format(parseISO(visibleWeeks[11].weekStart), 'MMMM yyyy')}
          </span>
          
          <button 
            onClick={goToToday}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-[#fef2f2] border border-[#fecaca] text-[10px] font-semibold text-[#dc2626]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
            Today: {format(today, 'MMM d')} (W{getISOWeek(today)})
          </button>
        </div>

        {/* Allocation Grid - Scrollable */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="min-w-max" role="grid" aria-label="Resource allocation grid">
              {/* Header Row */}
              <div className="flex sticky top-0 z-10 bg-card border-b border-border" role="row">
                <div className="w-[140px] flex-shrink-0 p-2 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em]" role="columnheader">
                  Assignment
                </div>
                {visibleWeeks.map(week => (
                  <div 
                    key={week.weekStart}
                    className={cn(
                      "w-14 flex-shrink-0 p-2 text-center border-l border-border",
                      week.isCurrent && "bg-primary/5"
                    )}
                    role="columnheader"
                  >
                    <div className={cn(
                      "text-[11px] font-bold",
                      week.isPast ? "text-muted-foreground/50" : week.isCurrent ? "text-primary" : "text-foreground"
                    )}>
                      {week.label}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium">
                      {week.dateRange}
                    </div>
                    {week.isCurrent && (
                      <div className="text-[8px] font-bold text-primary mt-0.5">NOW</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Assignment Rows */}
              {assignments.map((assignment, index) => (
                <AllocationRow
                  key={assignment.id}
                  assignment={assignment}
                  allocations={allocations}
                  visibleWeeks={visibleWeeks}
                  today={today}
                  colorIndex={index}
                  onCellClick={(weekStart) => setEditingCell({ assignmentId: assignment.id, weekStart })}
                />
              ))}

              {/* Available Row */}
              <div className="flex bg-[#f0fdf4] dark:bg-emerald-950/20 border-t border-border" role="row">
                <div className="w-[140px] flex-shrink-0 p-2 flex items-center gap-2" role="rowheader">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">Available</span>
                </div>
                {visibleWeeks.map(week => {
                  const totals = getTotalForWeek(allocations, week.weekStart);
                  const available = Math.max(0, 100 - totals.committed);
                  return (
                    <div key={week.weekStart} className="w-14 flex-shrink-0 p-1 border-l border-border" role="gridcell">
                      <div className={cn(
                        "h-8 rounded-[6px] flex items-center justify-center text-[11px] font-bold",
                        available > 0 
                          ? "bg-[repeating-linear-gradient(45deg,#f0fdf4,#f0fdf4_3px,#bbf7d0_3px,#bbf7d0_6px)] border border-[#86efac] text-[#15803d]"
                          : "bg-muted/50 border border-border text-muted-foreground"
                      )}>
                        {available}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Row */}
              <div className="flex bg-muted/30 border-t-2 border-border" role="row">
                <div className="w-[140px] flex-shrink-0 p-2 flex items-center" role="rowheader">
                  <span className="text-[12px] font-bold text-foreground">TOTAL</span>
                </div>
                {visibleWeeks.map(week => {
                  const totals = getTotalForWeek(allocations, week.weekStart);
                  const isOver = totals.committed > 100;
                  const isOverForecast = totals.total > 100 && totals.committed <= 100;
                  return (
                    <div key={week.weekStart} className="w-14 flex-shrink-0 p-2 text-center border-l border-border" role="gridcell">
                      <div className={cn(
                        "text-[12px] font-extrabold",
                        isOver ? "text-[#dc2626]" : isOverForecast ? "text-[#d97706]" : "text-primary"
                      )}>
                        {totals.total}%
                      </div>
                      {isOverForecast && (
                        <div className="text-[8px] text-[#d97706] font-semibold">
                          +{totals.forecast}% fcst
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer - 56px */}
        <div className="h-14 px-5 flex items-center gap-3 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="flex-1 text-[11px] text-muted-foreground">
            {!validation.isValid && (
              <span className="text-[#dc2626]">⚠️ {validation.errors[0]}</span>
            )}
            {validation.isValid && validation.warnings.length > 0 && (
              <span className="text-[#d97706]">Note: {validation.warnings[0]}</span>
            )}
            {validation.isValid && validation.warnings.length === 0 && !isDirty && (
              <span>No changes to save</span>
            )}
            {isDirty && validation.isValid && validation.warnings.length === 0 && (
              <span className="text-primary">Unsaved changes</span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={discardChanges}
            disabled={!isDirty || isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={!isDirty || !validation.isValid || isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </>
  );
}

// Legend Item Component
function LegendItem({ label, type }: { label: string; type: 'actual' | 'committed' | 'forecast' | 'available' }) {
  const styles: Record<string, string> = {
    actual: 'bg-primary/50',
    committed: 'bg-primary shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]',
    forecast: 'bg-[repeating-linear-gradient(-45deg,rgba(37,99,235,0.2),rgba(37,99,235,0.2)_2px,rgba(37,99,235,0.35)_2px,rgba(37,99,235,0.35)_4px)] border-2 border-dashed border-primary',
    available: 'bg-[repeating-linear-gradient(45deg,#f0fdf4,#f0fdf4_2px,#bbf7d0_2px,#bbf7d0_4px)] border border-[#86efac]',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-6 h-3 rounded-[3px]', styles[type])} />
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

// Allocation Row Component
function AllocationRow({ 
  assignment, 
  allocations, 
  visibleWeeks, 
  today,
  colorIndex,
  onCellClick 
}: { 
  assignment: Assignment;
  allocations: WeeklyAllocation[];
  visibleWeeks: WeekColumn[];
  today: Date;
  colorIndex: number;
  onCellClick: (weekStart: string) => void;
}) {
  const colors = ['#2563eb', '#0d9488', '#ea580c', '#7c3aed'];
  const color = assignment.color || colors[colorIndex % colors.length];

  return (
    <div className="flex border-b border-border hover:bg-muted/20 transition-colors" role="row">
      <div className="w-[140px] flex-shrink-0 p-2 flex items-center gap-2" role="rowheader">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[12px] font-semibold text-foreground truncate">{assignment.name}</span>
      </div>
      {visibleWeeks.map(week => {
        const alloc = getAllocationForCell(allocations, assignment.id, week.weekStart);
        const isEditable = isCellEditable(parseISO(week.weekStart), today);
        const visualState = alloc ? getVisualState(alloc, today) : null;
        
        return (
          <div 
            key={week.weekStart} 
            className={cn(
              "w-14 flex-shrink-0 p-1 border-l border-border",
              isEditable && "cursor-pointer hover:bg-primary/5",
              week.isCurrent && "bg-primary/5"
            )}
            role="gridcell"
            tabIndex={isEditable ? 0 : undefined}
            onClick={() => isEditable && onCellClick(week.weekStart)}
            aria-label={alloc ? `${alloc.percentage}% ${visualState}` : 'Empty'}
          >
            <AllocationBlock 
              allocation={alloc} 
              color={color} 
              visualState={visualState}
              isLocked={!isEditable}
            />
          </div>
        );
      })}
    </div>
  );
}

// Allocation Block Component
function AllocationBlock({ 
  allocation, 
  color, 
  visualState,
  isLocked
}: { 
  allocation: WeeklyAllocation | undefined;
  color: string;
  visualState: VisualState | null;
  isLocked: boolean;
}) {
  if (!allocation || allocation.percentage === 0) {
    return (
      <div className="h-8 rounded-[6px] bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground font-medium">
        —
      </div>
    );
  }

  const blockStyles: Record<string, React.CSSProperties> = {
    actual: {
      backgroundColor: color,
      opacity: 0.5,
    },
    committed: {
      backgroundColor: color,
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25)',
    },
    forecast: {
      background: `repeating-linear-gradient(-45deg, color-mix(in srgb, ${color} 20%, transparent), color-mix(in srgb, ${color} 20%, transparent) 3px, color-mix(in srgb, ${color} 35%, transparent) 3px, color-mix(in srgb, ${color} 35%, transparent) 6px)`,
      border: `2px dashed ${color}`,
      color: color,
    },
  };

  const style = visualState ? blockStyles[visualState] : {};

  return (
    <div 
      className={cn(
        "h-8 rounded-[6px] flex items-center justify-center text-[11px] font-bold transition-transform",
        visualState !== 'forecast' && "text-white",
        !isLocked && "hover:scale-[1.03] hover:shadow-md"
      )}
      style={style}
    >
      {allocation.percentage}%
    </div>
  );
}

export default AllocationDrawer;

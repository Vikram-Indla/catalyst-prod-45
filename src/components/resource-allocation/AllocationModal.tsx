/**
 * Resource Allocation Modal
 * Main container for viewing and editing resource allocations
 * Catalyst V5 Enterprise Design System
 * 
 * CRITICAL: This is a CENTERED MODAL (max-width 900px), NOT a side drawer
 */

import { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getISOWeek } from 'date-fns';
import { useResourceAllocation } from '@/hooks/useResourceAllocation';
import type { AllocationResource, Assignment, Allocation, WeekColumn } from '@/types/resource-allocation.types';
import { DEPARTMENT_GRADIENTS, ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';
import { getVisualState, isCellEditable, getTotalForWeek } from '@/utils/allocation.utils';
import { Button } from '@/components/ui/button';
import { EditAllocationModal } from './EditAllocationModal';

interface AllocationModalProps {
  resource: AllocationResource;
  onClose: () => void;
}

export function AllocationModal({ resource, onClose }: AllocationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
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
  } = useResourceAllocation({ resource, onClose });

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

  // Focus trap for accessibility
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  const initials = resource.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const departmentGradient = DEPARTMENT_GRADIENTS[resource.department] || DEPARTMENT_GRADIENTS.Delivery;
  const contractEnd = parseISO(resource.contractEnd);
  const daysToEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const showContractWarning = daysToEnd <= 90;

  // Find the first forecast week to show the "FORECAST →" marker
  const firstForecastWeekIndex = visibleWeeks.findIndex(w => w.isForecast);

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[4px] z-[1000] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className={cn(
          "fixed inset-0 z-[1001] flex items-center justify-center p-4",
          "animate-in fade-in zoom-in-95 duration-250"
        )}
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      >
        {/* Modal */}
        <div 
          className={cn(
            "bg-card rounded-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden",
            "shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
        >
          {/* Header - 64px */}
          <div className="h-16 px-6 flex items-center gap-4 border-b border-border bg-muted/30 flex-shrink-0">
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
              <div id="modal-title" className="text-[15px] font-bold text-foreground tracking-[-0.02em] truncate">
                {resource.name}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium flex-wrap">
                <span className="truncate">{resource.role}</span>
                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground flex-shrink-0" />
                <span className="truncate">{resource.department}</span>
                {showContractWarning && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground flex-shrink-0" />
                    <span className="px-1.5 py-0.5 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[10px] font-semibold whitespace-nowrap">
                      Ends {format(contractEnd, 'MMM d')}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Legend Bar - 44px */}
          <div className="h-11 px-6 flex items-center gap-4 border-b border-border bg-muted/20 flex-shrink-0 flex-wrap">
            <LegendItem label="Actual" type="actual" />
            <LegendItem label="Committed" type="committed" />
            <LegendItem label="Forecast" type="forecast" />
            <div className="w-px h-4 bg-border" />
            <LegendItem label="Available" type="available" />
            <span className="text-[9px] text-muted-foreground font-medium ml-auto">
              Click any future cell to edit
            </span>
          </div>

          {/* Timeline Nav - 40px */}
          <div className="h-10 px-6 flex items-center gap-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigateWeeks('prev')}
                className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Previous weeks"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigateWeeks('next')}
                className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Next weeks"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            
            <span className="text-[12px] font-semibold text-foreground">
              {visibleWeeks[0] && format(parseISO(visibleWeeks[0].weekStart), 'MMMM')} — {visibleWeeks[11] && format(parseISO(visibleWeeks[11].weekStart), 'MMMM yyyy')}
            </span>
            
            <button 
              onClick={goToToday}
              className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-[#fef2f2] border border-[#fecaca] text-[10px] font-semibold text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
              Today: {format(today, 'MMM d')} (W{getISOWeek(today)})
            </button>
          </div>

          {/* Allocation Grid - Scrollable */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="min-w-max" role="grid" aria-label="Resource allocation grid">
                {/* Header Row */}
                <div className="flex sticky top-0 z-10 bg-card border-b border-border" role="row">
                  <div className="w-[160px] flex-shrink-0 p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em]" role="columnheader">
                    Assignment
                  </div>
                  {visibleWeeks.map((week, index) => (
                    <div 
                      key={week.weekStart}
                      className={cn(
                        "w-[60px] flex-shrink-0 p-2 text-center border-l border-border relative",
                        week.isCurrent && "bg-primary/8"
                      )}
                      role="columnheader"
                    >
                      {/* Forecast boundary marker */}
                      {index === firstForecastWeekIndex && firstForecastWeekIndex > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#d97706]" />
                      )}
                      {index === firstForecastWeekIndex && (
                        <div className="absolute -top-0 left-0 text-[7px] font-extrabold text-[#d97706] uppercase tracking-wider whitespace-nowrap" style={{ transform: 'translateX(-2px)' }}>
                          FORECAST →
                        </div>
                      )}
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
                        <div className="text-[8px] font-bold text-primary mt-0.5 bg-primary/10 rounded px-1 py-0.5 inline-block">
                          NOW
                        </div>
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

                {/* Empty state if no assignments */}
                {assignments.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No assignments found</p>
                    <p className="text-xs mt-1">This resource has no allocations to display.</p>
                  </div>
                )}

                {/* Available Row */}
                {assignments.length > 0 && (
                  <div className="flex bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-border" role="row">
                    <div className="w-[160px] flex-shrink-0 p-3 flex items-center gap-2" role="rowheader">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">Available</span>
                    </div>
                    {visibleWeeks.map(week => {
                      const totals = getTotalForWeek(allocations, week.weekStart);
                      const available = Math.max(0, 100 - totals.committed);
                      return (
                        <div key={week.weekStart} className="w-[60px] flex-shrink-0 p-1 border-l border-border" role="gridcell">
                          <div className={cn(
                            "h-9 rounded-[6px] flex items-center justify-center text-[11px] font-bold",
                            available > 0 
                              ? "bg-[repeating-linear-gradient(45deg,#f0fdf4,#f0fdf4_3px,#bbf7d0_3px,#bbf7d0_6px)] dark:bg-[repeating-linear-gradient(45deg,rgba(16,185,129,0.1),rgba(16,185,129,0.1)_3px,rgba(16,185,129,0.2)_3px,rgba(16,185,129,0.2)_6px)] border border-[#86efac] dark:border-emerald-700 text-[#15803d] dark:text-emerald-400"
                              : "bg-muted/50 border border-border text-muted-foreground"
                          )}>
                            {available}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Totals Row */}
                {assignments.length > 0 && (
                  <div className="flex bg-muted/30 border-t-2 border-border" role="row">
                    <div className="w-[160px] flex-shrink-0 p-3 flex items-center" role="rowheader">
                      <span className="text-[12px] font-bold text-foreground uppercase tracking-wide">TOTAL</span>
                    </div>
                    {visibleWeeks.map(week => {
                      const totals = getTotalForWeek(allocations, week.weekStart);
                      const isOver = totals.committed > 100;
                      const isOverForecast = totals.total > 100 && totals.committed <= 100;
                      return (
                        <div key={week.weekStart} className="w-[60px] flex-shrink-0 p-2 text-center border-l border-border" role="gridcell">
                          <div className={cn(
                            "text-[12px] font-extrabold",
                            isOver ? "text-[#dc2626]" : isOverForecast ? "text-[#d97706]" : totals.total === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                          )}>
                            {totals.total}%
                          </div>
                          {totals.total === 100 && !isOver && !isOverForecast && (
                            <div className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold">full</div>
                          )}
                          {isOverForecast && (
                            <div className="text-[8px] text-[#d97706] font-semibold">
                              +{totals.forecast}% fcst
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - 56px */}
          <div className="h-14 px-6 flex items-center gap-3 border-t border-border bg-muted/30 flex-shrink-0">
            <div className="flex-1 text-[11px] text-muted-foreground truncate">
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
                <span className="text-primary font-medium">Unsaved changes</span>
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
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Allocation Modal */}
      {editingCell && (
        <EditAllocationModal
          assignmentId={editingCell.assignmentId}
          assignmentName={assignments.find(a => a.id === editingCell.assignmentId)?.name || 'Assignment'}
          weekStart={editingCell.weekStart}
          weekLabel={visibleWeeks.find(w => w.weekStart === editingCell.weekStart)?.label || ''}
          currentAllocation={allocations.find(
            a => a.assignmentId === editingCell.assignmentId && a.weekStart === editingCell.weekStart
          )}
          onApply={(percentage, status) => {
            updateAllocation(editingCell.assignmentId, editingCell.weekStart, percentage, status);
            setEditingCell(null);
          }}
          onClose={() => setEditingCell(null)}
        />
      )}
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
  allocations: Allocation[];
  visibleWeeks: WeekColumn[];
  today: Date;
  colorIndex: number;
  onCellClick: (weekStart: string) => void;
}) {
  const colorKeys = ['primary', 'teal', 'orange', 'purple'];
  const colorKey = colorKeys[colorIndex % colorKeys.length];
  const color = ASSIGNMENT_COLORS[colorKey];

  return (
    <div className="flex border-b border-border hover:bg-muted/20 transition-colors" role="row">
      <div className="w-[160px] flex-shrink-0 p-3 flex items-center gap-2" role="rowheader">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[12px] font-semibold text-foreground truncate">{assignment.name}</span>
      </div>
      {visibleWeeks.map(week => {
        const alloc = allocations.find(
          a => a.assignmentId === assignment.id && a.weekStart === week.weekStart
        );
        const isEditable = isCellEditable(parseISO(week.weekStart), today);
        const visualState = alloc ? getVisualState(alloc, today) : null;
        
        return (
          <div 
            key={week.weekStart} 
            className={cn(
              "w-[60px] flex-shrink-0 p-1 border-l border-border transition-colors",
              isEditable ? "cursor-pointer hover:bg-primary/[0.06]" : "cursor-not-allowed",
              week.isCurrent && "bg-primary/5"
            )}
            role="gridcell"
            tabIndex={isEditable ? 0 : undefined}
            onClick={() => isEditable && onCellClick(week.weekStart)}
            onKeyDown={(e) => {
              if (isEditable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onCellClick(week.weekStart);
              }
            }}
            aria-label={alloc ? `${alloc.percentage}% ${visualState}` : 'Empty - click to add allocation'}
            title={!isEditable ? 'Past allocations cannot be edited' : undefined}
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
  allocation: Allocation | undefined;
  color: string;
  visualState: 'actual' | 'committed' | 'forecast' | null;
  isLocked: boolean;
}) {
  if (!allocation || allocation.percentage === 0) {
    return (
      <div className={cn(
        "h-9 rounded-[6px] bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground font-medium border border-transparent",
        !isLocked && "hover:border-primary/30 hover:bg-muted/50 transition-all"
      )}>
        —
      </div>
    );
  }

  // Build styles based on visual state
  const getBlockStyles = (): React.CSSProperties => {
    switch (visualState) {
      case 'actual':
        return {
          backgroundColor: color,
          opacity: 0.5,
        };
      case 'committed':
        return {
          backgroundColor: color,
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25)',
        };
      case 'forecast':
        // Use CSS variables for the striped pattern
        return {
          background: `repeating-linear-gradient(
            -45deg,
            color-mix(in srgb, ${color} 20%, transparent),
            color-mix(in srgb, ${color} 20%, transparent) 3px,
            color-mix(in srgb, ${color} 35%, transparent) 3px,
            color-mix(in srgb, ${color} 35%, transparent) 6px
          )`,
          border: `2px dashed ${color}`,
          color: color,
        };
      default:
        return {};
    }
  };

  return (
    <div 
      className={cn(
        "h-9 rounded-[6px] flex items-center justify-center text-[11px] font-bold transition-transform",
        visualState !== 'forecast' && "text-white",
        !isLocked && "hover:scale-[1.05] hover:shadow-md active:scale-95"
      )}
      style={getBlockStyles()}
    >
      {allocation.percentage}%
    </div>
  );
}

export default AllocationModal;

/**
 * Resource Allocation Modal
 * Main container for viewing and editing resource allocations
 * Catalyst V5 Enterprise Design System
 * 
 * CRITICAL: This is a CENTERED MODAL (max-width 1100px), NOT a side drawer
 */

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getISOWeek } from 'date-fns';
import { useResourceAllocation } from '@/hooks/useResourceAllocation';
import type { AllocationResource, Assignment, Allocation, WeekColumn } from '@/types/resource-allocation.types';
import { DEPARTMENT_GRADIENTS, ASSIGNMENT_COLORS } from '@/types/resource-allocation.types';
import { getVisualState, isCellEditable, getTotalForWeek } from '@/utils/allocation.utils';
import { Button } from '@/components/ui/button';
import { EditAllocationModal } from './EditAllocationModal';
import { AddAssignmentModal } from './AddAssignmentModal';

interface AllocationModalProps {
  resource: AllocationResource;
  onClose: () => void;
}

export function AllocationModal({ resource, onClose }: AllocationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  
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
    availableProjects,
    setEditingCell,
    updateAllocation,
    addAssignment,
    removeAssignment,
    navigateWeeks,
    goToToday,
    saveChanges,
    discardChanges,
  } = useResourceAllocation({ resource, onClose });

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddAssignment) {
          setShowAddAssignment(false);
        } else if (editingCell) {
          setEditingCell(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingCell, showAddAssignment, setEditingCell, onClose]);

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
          "fixed inset-0 z-[1001] flex items-center justify-center p-5",
          "animate-in fade-in zoom-in-95 duration-250"
        )}
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      >
        {/* Modal - 1100px max width as per spec */}
        <div 
          className={cn(
            "bg-card rounded-2xl w-full max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden",
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
            {/* Avatar - 52px as per spec */}
            <div 
              className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[18px] font-extrabold text-white flex-shrink-0"
              style={{ 
                background: departmentGradient,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
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
                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Contract ends {format(contractEnd, 'MMM d, yyyy')}
                </span>
                {showContractWarning && (
                  <span className="px-1.5 py-0.5 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[10px] font-semibold whitespace-nowrap ml-1">
                    {daysToEnd}d left
                  </span>
                )}
              </div>
            </div>
            
            {/* Add Assignment Button */}
            <button
              onClick={() => setShowAddAssignment(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0d9488] hover:bg-[#14b8a6] text-white rounded-[10px] text-[13px] font-semibold transition-all hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(13,148,136,0.3)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.4)]"
            >
              <Plus className="w-4 h-4" />
              Add Assignment
            </button>
            
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
          <div className="h-11 px-6 flex items-center gap-6 border-b border-border bg-[#f1f5f9] dark:bg-muted/20 flex-shrink-0 flex-wrap">
            <LegendItem label="Actual (Past)" type="actual" />
            <LegendItem label="Committed" type="committed" />
            <LegendItem label="Forecast" type="forecast" />
            <div className="w-px h-4 bg-border" />
            <LegendItem label="Available" type="available" />
            <div className="ml-auto px-3 py-1.5 bg-card rounded-md border border-border">
              <span className="text-[11px] text-muted-foreground font-medium">
                Click any <span className="text-primary font-semibold">future cell</span> to edit
              </span>
            </div>
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
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#fef2f2] border border-[#fecaca] text-[12px] font-bold text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-pulse" />
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
                  <div className="w-[180px] flex-shrink-0 p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.08em]" role="columnheader">
                    Assignment
                  </div>
                  {visibleWeeks.map((week, index) => (
                    <div 
                      key={week.weekStart}
                      className={cn(
                        "w-[65px] flex-shrink-0 p-2 text-center border-l border-border relative",
                        week.isPast && "bg-[#fafafa] dark:bg-muted/30",
                        week.isCurrent && "bg-[rgba(220,38,38,0.08)]",
                        !week.isPast && !week.isCurrent && "bg-[#f8fafc] dark:bg-muted/10"
                      )}
                      role="columnheader"
                    >
                      {/* Forecast boundary marker */}
                      {index === firstForecastWeekIndex && firstForecastWeekIndex > 0 && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#d97706]" />
                      )}
                      {index === firstForecastWeekIndex && (
                        <div className="absolute top-1 left-0 text-[8px] font-extrabold text-[#d97706] bg-[#fef3c7] border border-[#fcd34d] border-l-0 px-2 py-0.5 rounded-r-md uppercase tracking-wider whitespace-nowrap">
                          FORECAST →
                        </div>
                      )}
                      <div className={cn(
                        "text-[11px] font-bold",
                        week.isPast ? "text-muted-foreground/50" : week.isCurrent ? "text-[#dc2626]" : "text-foreground"
                      )}>
                        {week.label}
                      </div>
                      <div className={cn(
                        "text-[9px] font-medium",
                        week.isPast ? "text-muted-foreground/40" : "text-muted-foreground"
                      )}>
                        {week.dateRange}
                      </div>
                      {week.isCurrent && (
                        <div className="text-[8px] font-extrabold text-white mt-0.5 bg-[#dc2626] rounded px-1.5 py-0.5 inline-block">
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
                    onRemove={() => removeAssignment(assignment.id)}
                  />
                ))}

                {/* Add Assignment Row */}
                <AddAssignmentRow 
                  visibleWeeks={visibleWeeks}
                  onAddClick={() => setShowAddAssignment(true)}
                />

                {/* Empty state if no assignments */}
                {assignments.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm font-medium">No assignments found</p>
                    <p className="text-xs mt-1">Click "+ Add Assignment" to assign this resource to a project.</p>
                  </div>
                )}

                {/* Available Row */}
                {assignments.length > 0 && (
                  <div className="flex bg-[#f0fdf4] dark:bg-emerald-950/20 border-t border-border" role="row">
                    <div className="w-[180px] flex-shrink-0 p-3 flex items-center gap-2" role="rowheader">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-semibold text-[#15803d] dark:text-emerald-400">Available</span>
                    </div>
                    {visibleWeeks.map(week => {
                      const totals = getTotalForWeek(allocations, week.weekStart);
                      const available = Math.max(0, 100 - totals.committed);
                      return (
                        <div key={week.weekStart} className="w-[65px] flex-shrink-0 p-1.5 border-l border-border" role="gridcell">
                          <div className={cn(
                            "h-[38px] rounded-[8px] flex items-center justify-center text-[12px] font-bold",
                            available > 0 
                              ? "bg-[repeating-linear-gradient(45deg,#f0fdf4,#f0fdf4_3px,#dcfce7_3px,#dcfce7_6px)] dark:bg-[repeating-linear-gradient(45deg,rgba(16,185,129,0.1),rgba(16,185,129,0.1)_3px,rgba(16,185,129,0.2)_3px,rgba(16,185,129,0.2)_6px)] border border-[#86efac] dark:border-emerald-700 text-[#15803d] dark:text-emerald-400"
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
                    <div className="w-[180px] flex-shrink-0 p-3 flex items-center" role="rowheader">
                      <span className="text-[12px] font-extrabold text-foreground uppercase tracking-wide">TOTAL</span>
                    </div>
                    {visibleWeeks.map(week => {
                      const totals = getTotalForWeek(allocations, week.weekStart);
                      const isOver = totals.committed > 100;
                      const isOverForecast = totals.total > 100 && totals.committed <= 100;
                      const isFull = totals.total === 100;
                      return (
                        <div key={week.weekStart} className="w-[65px] flex-shrink-0 p-2 text-center border-l border-border" role="gridcell">
                          <div className={cn(
                            "text-[13px] font-extrabold",
                            isOver ? "text-[#dc2626]" : 
                            isOverForecast ? "text-[#d97706]" : 
                            isFull ? "text-primary" : 
                            "text-foreground"
                          )}>
                            {totals.total}%
                          </div>
                          {isFull && !isOver && !isOverForecast && (
                            <div className="text-[9px] text-primary font-semibold">committed</div>
                          )}
                          {isOverForecast && (
                            <div className="text-[9px] text-[#d97706] font-semibold">
                              +{totals.forecast}% fcst
                            </div>
                          )}
                          {isOver && (
                            <div className="text-[9px] text-[#dc2626] font-semibold">OVER</div>
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
            <div className="flex-1 text-[12px] text-muted-foreground truncate">
              {!validation.isValid && (
                <span className="text-[#dc2626] font-medium">⚠️ {validation.errors[0]}</span>
              )}
              {validation.isValid && validation.warnings.length > 0 && (
                <span className="text-[#d97706] font-medium">Note: {validation.warnings[0]}</span>
              )}
              {validation.isValid && validation.warnings.length === 0 && !isDirty && (
                <span>No changes to save</span>
              )}
              {isDirty && validation.isValid && validation.warnings.length === 0 && (
                <span className="text-[#d97706] font-semibold">You have unsaved changes</span>
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
              className="min-w-[120px]"
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
          assignmentColor={ASSIGNMENT_COLORS[assignments.find(a => a.id === editingCell.assignmentId)?.color || 'primary']}
          weekStart={editingCell.weekStart}
          weekLabel={visibleWeeks.find(w => w.weekStart === editingCell.weekStart)?.label || ''}
          weekDateRange={visibleWeeks.find(w => w.weekStart === editingCell.weekStart)?.dateRange || ''}
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

      {/* Add Assignment Modal */}
      {showAddAssignment && (
        <AddAssignmentModal
          resourceName={resource.name}
          existingAssignmentIds={assignments.map(a => a.id)}
          availableAssignments={availableProjects}
          onAdd={(assignment) => {
            addAssignment(assignment);
            setShowAddAssignment(false);
          }}
          onClose={() => setShowAddAssignment(false)}
        />
      )}
    </>
  );
}

// Legend Item Component
function LegendItem({ label, type }: { label: string; type: 'actual' | 'committed' | 'forecast' | 'available' }) {
  const styles: Record<string, string> = {
    actual: 'bg-primary/50',
    committed: 'bg-primary shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)]',
    forecast: 'bg-[repeating-linear-gradient(-45deg,rgba(37,99,235,0.2),rgba(37,99,235,0.2)_2px,rgba(37,99,235,0.4)_2px,rgba(37,99,235,0.4)_4px)] border-2 border-dashed border-primary',
    available: 'bg-[repeating-linear-gradient(45deg,#f0fdf4,#f0fdf4_2px,#bbf7d0_2px,#bbf7d0_4px)] border border-[#86efac]',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-8 h-4 rounded-[4px]', styles[type])} />
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

// Add Assignment Row Component
function AddAssignmentRow({ 
  visibleWeeks,
  onAddClick
}: { 
  visibleWeeks: WeekColumn[];
  onAddClick: () => void;
}) {
  return (
    <div className="flex border-b border-border hover:bg-muted/10 transition-colors" role="row">
      <div className="w-[180px] flex-shrink-0 p-3" role="rowheader">
        <button
          onClick={onAddClick}
          className="w-full flex items-center gap-2 px-3 py-2 bg-transparent border border-dashed border-border rounded-[8px] text-[11px] font-semibold text-muted-foreground hover:border-[#0d9488] hover:text-[#0d9488] hover:bg-[rgba(13,148,136,0.04)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Assignment
        </button>
      </div>
      {visibleWeeks.map(week => (
        <div key={week.weekStart} className="w-[65px] flex-shrink-0 p-1.5 border-l border-border" role="gridcell">
          <button
            onClick={onAddClick}
            className="w-full h-[38px] rounded-[8px] border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-[#0d9488] hover:text-[#0d9488] hover:bg-[rgba(13,148,136,0.04)] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ))}
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
  onCellClick,
  onRemove
}: { 
  assignment: Assignment;
  allocations: Allocation[];
  visibleWeeks: WeekColumn[];
  today: Date;
  colorIndex: number;
  onCellClick: (weekStart: string) => void;
  onRemove: () => void;
}) {
  const colorKeys = ['primary', 'teal', 'orange', 'purple'];
  const colorKey = colorKeys[colorIndex % colorKeys.length];
  const color = ASSIGNMENT_COLORS[colorKey];

  return (
    <div className="flex border-b border-border group hover:bg-muted/20 transition-colors" role="row">
      <div className="w-[180px] flex-shrink-0 p-3 flex items-center gap-2.5 relative" role="rowheader">
        <div className="w-3 h-3 rounded-[4px] flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-foreground truncate">{assignment.name}</div>
          <div className="text-[9px] text-muted-foreground">Project Assignment</div>
        </div>
        {/* Remove button - appears on hover */}
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#dc2626] hover:border-[#dc2626] hover:text-white"
          title="Remove assignment"
        >
          <Trash2 className="w-3 h-3" />
        </button>
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
              "w-[65px] flex-shrink-0 p-1.5 border-l border-border transition-colors",
              isEditable ? "cursor-pointer hover:bg-[rgba(37,99,235,0.06)]" : "cursor-not-allowed bg-[#fafafa] dark:bg-muted/20",
              week.isCurrent && "bg-[rgba(220,38,38,0.04)]"
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
        "h-[38px] rounded-[8px] bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground font-medium border border-dashed border-transparent",
        !isLocked && "hover:border-primary/50 hover:bg-muted/50 hover:text-primary transition-all"
      )}>
        —
      </div>
    );
  }

  // Build styles based on visual state per spec
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
        // Striped pattern with dashed border
        return {
          background: `repeating-linear-gradient(
            -45deg,
            color-mix(in srgb, ${color} 15%, transparent),
            color-mix(in srgb, ${color} 15%, transparent) 3px,
            color-mix(in srgb, ${color} 30%, transparent) 3px,
            color-mix(in srgb, ${color} 30%, transparent) 6px
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
        "h-[38px] rounded-[8px] flex items-center justify-center text-[12px] font-bold transition-transform",
        visualState !== 'forecast' && "text-white",
        !isLocked && "hover:scale-[1.05] hover:shadow-[0_3px_10px_rgba(0,0,0,0.12)] active:scale-95"
      )}
      style={getBlockStyles()}
    >
      {allocation.percentage}%
    </div>
  );
}

export default AllocationModal;

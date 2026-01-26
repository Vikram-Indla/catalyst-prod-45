/**
 * Resource Allocation Modal - Linear/Notion Style Timeline
 * Main container for viewing and editing resource allocations
 * Catalyst V5 Enterprise Design System
 */

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, getISOWeek } from 'date-fns';
import { useResourceAllocationTimeline } from '@/hooks/useResourceAllocationTimeline';
import type { AllocationResource } from '@/types/resource-allocation.types';
import { DEPARTMENT_GRADIENTS } from '@/types/resource-allocation.types';
import { Button } from '@/components/ui/button';
import { TimelineGrid } from './TimelineGrid';
import { AddAssignmentModal } from './AddAssignmentModal';
import { EditAllocationRowModal } from './EditAllocationRowModal';
import { ViewToggle } from './ViewToggle';
import { StatusLegend } from './StatusLegend';

interface AllocationModalProps {
  resource: AllocationResource;
  onClose: () => void;
}

export function AllocationModal({ resource, onClose }: AllocationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  
  const {
    allocations,
    assignmentsInUse,
    availableAssignments,
    periods,
    timelineBars,
    periodCapacities,
    summary,
    today,
    view,
    editingAllocationId,
    isLoading,
    isSaving,
    setView,
    navigatePeriods,
    goToToday,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    setEditingAllocationId,
  } = useResourceAllocationTimeline({ resource, onClose });

  // Find the allocation being edited
  const editingAllocation = editingAllocationId 
    ? timelineBars.find(bar => bar.allocationId === editingAllocationId)
    : null;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddAssignment) {
          setShowAddAssignment(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAddAssignment, onClose]);

  // Focus trap
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  const initials = resource.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const departmentGradient = DEPARTMENT_GRADIENTS[resource.department] || DEPARTMENT_GRADIENTS.Delivery;
  const contractEnd = parseISO(resource.contractEnd);
  const daysToEnd = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const showContractWarning = daysToEnd <= 90 && daysToEnd > 0;

  // Find first forecast period for marker
  const firstForecastIndex = periods.findIndex(p => p.isForecast);

  // Period range label
  const periodRangeLabel = periods.length > 0
    ? view === 'weeks'
      ? `${format(parseISO(periods[0].date), 'MMMM')} — ${format(parseISO(periods[periods.length - 1].date), 'MMMM yyyy')}`
      : `${format(parseISO(periods[0].date), 'MMMM yyyy')} — ${format(parseISO(periods[periods.length - 1].date), 'MMMM yyyy')}`
    : '';

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
        {/* Modal */}
        <div 
          className={cn(
            "bg-card rounded-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden",
            "shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-border"
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="h-16 px-6 flex items-center gap-4 border-b border-border bg-muted/30 flex-shrink-0">
            {/* Avatar */}
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
                  <span className="px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-semibold whitespace-nowrap ml-1">
                    {daysToEnd}d left
                  </span>
                )}
              </div>
            </div>
            
            {/* Add Assignment Button */}
            <Button
              onClick={() => setShowAddAssignment(true)}
              className="bg-[#0d9488] hover:bg-[#14b8a6] text-white rounded-[10px] text-[13px] font-semibold shadow-[0_2px_8px_rgba(13,148,136,0.3)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.4)]"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Assignment
            </Button>
            
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center transition-colors hover:bg-muted"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="h-12 px-6 flex items-center gap-4 border-b border-border bg-[#f8fafc] dark:bg-muted/10 flex-shrink-0">
            <StatusLegend />
            
            <div className="ml-auto flex items-center gap-3">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {/* Timeline Navigation */}
          <div className="h-10 px-6 flex items-center gap-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigatePeriods('prev')}
                className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Previous periods"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigatePeriods('next')}
                className="w-7 h-7 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Next periods"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            
            <span className="text-[12px] font-semibold text-foreground">
              {periodRangeLabel}
            </span>
            
            <button 
              onClick={goToToday}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-destructive/10 border border-destructive/20 text-[12px] font-bold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              Today: {format(today, 'MMM d')} (W{getISOWeek(today)})
            </button>
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <TimelineGrid
                periods={periods}
                timelineBars={timelineBars}
                periodCapacities={periodCapacities}
                assignmentsInUse={assignmentsInUse}
                view={view}
                firstForecastIndex={firstForecastIndex}
                onAddClick={() => setShowAddAssignment(true)}
                onEditBar={(allocationId) => setEditingAllocationId(allocationId)}
                onDeleteBar={(allocationId) => deleteAllocation(allocationId)}
                resourceName={resource.name}
              />
            )}
          </div>

          {/* Footer */}
          <div className="h-14 px-6 flex items-center gap-4 border-t border-border bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-muted-foreground">
                Total Committed: <span className="font-bold text-primary">{summary.committed}%</span>
              </span>
              <span className="w-px h-4 bg-border" />
              <span className="text-muted-foreground">
                Total Forecast: <span className="font-bold text-[#d97706]">{summary.forecast}%</span>
              </span>
            </div>
            
            <div className="ml-auto flex items-center gap-3">
              <Button
                onClick={onClose}
                variant="default"
                className="rounded-[10px] px-6"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showAddAssignment && (
        <AddAssignmentModal
          resourceId={resource.id}
          resourceName={resource.name}
          existingAssignmentIds={assignmentsInUse.map(a => a.id)}
          availableAssignments={availableAssignments}
          defaultView={view}
          onAdd={async (data) => {
            await createAllocation(data);
            setShowAddAssignment(false);
          }}
          onClose={() => setShowAddAssignment(false)}
        />
      )}

      {/* Edit Allocation Row Modal */}
      {editingAllocation && (
        <EditAllocationRowModal
          allocation={editingAllocation}
          onSave={async (data) => {
            await updateAllocation({
              ...data,
              originalIds: editingAllocation.originalIds,
            });
            setEditingAllocationId(null);
          }}
          onClose={() => setEditingAllocationId(null)}
        />
      )}
    </>
  );
}

export { AllocationModal as ResourceAllocationModal };

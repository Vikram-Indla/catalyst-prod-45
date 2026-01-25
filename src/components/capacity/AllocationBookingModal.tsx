/**
 * Allocation Booking Modal - V2.1 Monopoly-Grade Implementation
 * Matches the reference design exactly
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Pencil, Calendar, AlertTriangle, Zap, Clock, UserMinus, Building2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, addMonths, startOfMonth, eachMonthOfInterval, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { 
  getAssignmentTheme, 
  getAllocationStatusTheme, 
  CATALYST_V5,
  ALLOCATION_SEGMENT_COLORS,
} from '@/lib/catalyst-colors';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useResourceProfiles } from '@/hooks/useResourceProfiles';
import type { 
  CapacityResource, 
  ResourceAllocation, 
  AllocationBookingInput 
} from '@/modules/capacity-planner/types';

export interface CapacityDepartment {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resource: CapacityResource | null;
  existingAllocations: ResourceAllocation[];
  resourceAssignments: { id: string; name: string }[];
  departments?: CapacityDepartment[];
  onSave: (resourceId: string, allocations: AllocationBookingInput[]) => Promise<void>;
  onUpdateDepartment?: (resourceId: string, departmentId: string | null) => Promise<void>;
  mode: 'add' | 'edit';
}

export function AllocationBookingModal({
  isOpen,
  onClose,
  resource,
  existingAllocations,
  resourceAssignments,
  departments = [],
  onSave,
  onUpdateDepartment,
  mode
}: Props) {
  const [allocations, setAllocations] = useState<AllocationBookingInput[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newAllocation, setNewAllocation] = useState<AllocationBookingInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const allocationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  // Get profile data for contract end date validation
  const { getProfile } = useResourceProfiles();
  const profile = resource ? getProfile(resource.id) : null;
  const contractEndDate = profile?.contract_end_date;

  // Timeline configuration - 6 months from current month
  const timelineStart = startOfMonth(new Date());
  const timelineEnd = addMonths(timelineStart, 6);
  const months = eachMonthOfInterval({ start: timelineStart, end: addMonths(timelineStart, 5) });

  // Merge consecutive monthly records with same assignment_id into single allocations
  // Tracks all original IDs to properly sync with DB on save
  function mergeConsecutiveAllocations(allocs: typeof existingAllocations) {
    if (allocs.length === 0) return [];
    
    // Sort by assignment_id then by start_date
    const sorted = [...allocs].sort((a, b) => {
      if (a.assignment_id !== b.assignment_id) {
        return (a.assignment_id || '').localeCompare(b.assignment_id || '');
      }
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
    
    const merged: AllocationBookingInput[] = [];
    let current: AllocationBookingInput | null = null;
    let currentOriginalIds: string[] = [];
    
    for (const alloc of sorted) {
      if (!current) {
        current = {
          id: alloc.id,
          originalIds: [alloc.id],
          assignment_id: alloc.assignment_id || '',
          assignment_name: alloc.assignment_name || '',
          allocation_percent: alloc.allocation_percent,
          start_date: alloc.start_date,
          end_date: alloc.end_date || '',
        };
        currentOriginalIds = [alloc.id];
        continue;
      }
      
      // Check if this allocation should be merged with current
      // Same assignment_id and same allocation_percent and dates are consecutive/overlapping
      const currentEnd = current.end_date ? new Date(current.end_date) : null;
      const allocStart = new Date(alloc.start_date);
      
      const isSameAssignment = current.assignment_id === alloc.assignment_id;
      const isSamePercent = current.allocation_percent === alloc.allocation_percent;
      // Consider consecutive if gap is <= 1 day (handles month boundaries)
      const isConsecutive = currentEnd && (allocStart.getTime() - currentEnd.getTime()) <= 24 * 60 * 60 * 1000;
      
      if (isSameAssignment && isSamePercent && isConsecutive) {
        // Extend current allocation's end date and track the merged ID
        current.end_date = alloc.end_date || current.end_date;
        currentOriginalIds.push(alloc.id);
        current.originalIds = [...currentOriginalIds];
      } else {
        // Push current and start new
        merged.push(current);
        current = {
          id: alloc.id,
          originalIds: [alloc.id],
          assignment_id: alloc.assignment_id || '',
          assignment_name: alloc.assignment_name || '',
          allocation_percent: alloc.allocation_percent,
          start_date: alloc.start_date,
          end_date: alloc.end_date || '',
        };
        currentOriginalIds = [alloc.id];
      }
    }
    
    // Don't forget the last one
    if (current) {
      merged.push(current);
    }
    
    return merged;
  }

  // Initialize from existing allocations and department
  useEffect(() => {
    if (resource && existingAllocations.length > 0) {
      // Merge consecutive monthly records into single allocations
      const mergedAllocations = mergeConsecutiveAllocations(existingAllocations);
     console.log('[AllocationBookingModal] Merged allocations:', mergedAllocations);
      setAllocations(mergedAllocations);
    } else {
      setAllocations([]);
    }
    // Initialize department from resource
    if (resource?.department_id) {
      setSelectedDepartmentId(resource.department_id);
    } else {
      setSelectedDepartmentId(null);
    }
    setEditingIndex(null);
    setNewAllocation(null);
  }, [resource, existingAllocations, isOpen]);

  function createEmptyAllocation(): AllocationBookingInput {
    const today = new Date();
    const threeMonths = addMonths(today, 3);
    
    return {
      assignment_id: '',
      assignment_name: '',
      allocation_percent: 50,
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(threeMonths, 'yyyy-MM-dd'),
    };
  }

  function startAddingAllocation() {
    setNewAllocation(createEmptyAllocation());
    setEditingIndex(null);
  }

  function cancelNewAllocation() {
    setNewAllocation(null);
  }

  function confirmNewAllocation() {
    if (newAllocation && newAllocation.assignment_id) {
      // Validate against contract end date
      if (contractEndDate && newAllocation.end_date) {
        const allocEnd = new Date(newAllocation.end_date);
        const contractEnd = new Date(contractEndDate);
        if (allocEnd > contractEnd) {
          toast.error('Allocation end date cannot exceed contract end date', {
            description: `Contract ends on ${format(contractEnd, 'MMM d, yyyy')}. Please adjust the allocation end date.`
          });
          return;
        }
      }
      setAllocations([...allocations, newAllocation]);
      setNewAllocation(null);
      setHasUnsavedChanges(true);
    }
  }

  function removeAllocation(index: number) {
    setAllocations(allocations.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function updateAllocation(index: number, field: keyof AllocationBookingInput, value: string | number) {
    setAllocations(allocations.map((a, i) => {
      if (i === index) {
        const updated = { ...a, [field]: value };
        if (field === 'assignment_id') {
          const assignment = resourceAssignments.find(ra => ra.id === value);
          updated.assignment_name = assignment?.name || '';
        }
        return updated;
      }
      return a;
    }));
  }

  function updateNewAllocation(field: keyof AllocationBookingInput, value: string | number) {
    if (!newAllocation) return;
    const updated = { ...newAllocation, [field]: value };
    if (field === 'assignment_id') {
      const assignment = resourceAssignments.find(ra => ra.id === value);
      updated.assignment_name = assignment?.name || '';
    }
    setNewAllocation(updated);
  }

  // Calculate monthly totals - group by assignment_id to avoid double-counting monthly records
  const monthlyTotals = useMemo(() => {
    return months.map(month => {
      const monthStart = month;
      const monthEnd = addMonths(month, 1);
      
      // Group allocations by assignment_id and take max percentage per assignment
      const assignmentMaxPercent = new Map<string, number>();
      
      allocations.forEach(alloc => {
        if (!alloc.start_date) return;
        const allocStart = parseISO(alloc.start_date);
        const allocEnd = alloc.end_date ? parseISO(alloc.end_date) : addMonths(new Date(), 12);
        
        // Check if allocation overlaps with this month
        if (allocStart < monthEnd && allocEnd > monthStart) {
          const assignmentKey = alloc.assignment_id || alloc.id || 'unknown';
          const currentMax = assignmentMaxPercent.get(assignmentKey) || 0;
          // Take the max percentage for this assignment in this month
          assignmentMaxPercent.set(assignmentKey, Math.max(currentMax, alloc.allocation_percent));
        }
      });
      
      // Sum max percentages across all distinct assignments
      let total = 0;
      assignmentMaxPercent.forEach(percent => {
        total += percent;
      });
      
      return { month, total };
    });
  }, [allocations, months]);

  // Current allocation = max concurrent allocation across visible months (not simple sum)
  const currentAllocation = useMemo(() => {
    // Get the current month's total allocation (allocations that overlap with today)
    const today = new Date();
    const currentMonthTotal = monthlyTotals.find(mt => 
      mt.month.getMonth() === today.getMonth() && 
      mt.month.getFullYear() === today.getFullYear()
    );
    return currentMonthTotal?.total || 0;
  }, [monthlyTotals]);

  // For backwards compatibility, keep totalAllocation but make it smarter
  const totalAllocation = currentAllocation;

  // Find conflict periods (months where allocation > 100%)
  const conflictPeriods = useMemo(() => {
    return monthlyTotals.filter(mt => mt.total > 100);
  }, [monthlyTotals]);

  const hasConflict = conflictPeriods.length > 0;
  const maxConflict = Math.max(...monthlyTotals.map(mt => mt.total), 0);
  const overflowAmount = Math.max(0, maxConflict - 100);
  const status = maxConflict > 100 ? 'over' : maxConflict === 100 ? 'atCapacity' : 'available';
  const statusLabel = status === 'over' ? 'OVER-ALLOCATED' : status === 'atCapacity' ? 'AT CAPACITY' : 'AVAILABLE';
  const statusColor = status === 'over' ? CATALYST_V5.overAllocated.hex : status === 'atCapacity' ? CATALYST_V5.optimal.hex : CATALYST_V5.available.hex;

  // Quick fix suggestions for conflicts
  const quickFixes = useMemo(() => {
    if (!hasConflict || allocations.length < 2) return [];
    
    const fixes: { label: string; description: string; action: () => void }[] = [];
    
    // Find the newest allocation (likely the one to adjust)
    const sorted = [...allocations].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    const newest = sorted[0];
    const newestIdx = allocations.findIndex(a => a === newest);
    
    if (newest && newestIdx >= 0) {
      const reduceAmount = Math.min(newest.allocation_percent, overflowAmount);
      const newPercent = newest.allocation_percent - reduceAmount;
      
      if (newPercent >= 10) {
        fixes.push({
          label: `Reduce ${newest.assignment_name} to ${newPercent}%`,
          description: `Reduces conflict by ${reduceAmount}%`,
          action: () => {
            updateAllocation(newestIdx, 'allocation_percent', newPercent);
            setHasUnsavedChanges(true);
          }
        });
      }
      
      // Delay start option
      if (conflictPeriods.length > 0) {
        const firstConflictEnd = addMonths(conflictPeriods[conflictPeriods.length - 1].month, 1);
        fixes.push({
          label: `Delay start to ${format(firstConflictEnd, 'MMM d')}`,
          description: 'Avoids overlap with existing allocations',
          action: () => {
            updateAllocation(newestIdx, 'start_date', format(firstConflictEnd, 'yyyy-MM-dd'));
            setHasUnsavedChanges(true);
          }
        });
      }
    }
    
    return fixes;
  }, [hasConflict, allocations, overflowAmount, conflictPeriods]);

  // Calculate bar positions for timeline
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const todayOffset = differenceInDays(new Date(), timelineStart);
  const todayPercent = Math.max(0, Math.min(100, (todayOffset / totalDays) * 100));

  function getAllocationBars(allocs: AllocationBookingInput[]) {
    return allocs.map((alloc, idx) => {
      if (!alloc.start_date || !alloc.assignment_name) return null;
      
      const allocStart = parseISO(alloc.start_date);
      const allocEnd = alloc.end_date ? parseISO(alloc.end_date) : timelineEnd;
      
      const startOffset = Math.max(0, differenceInDays(allocStart, timelineStart));
      const endOffset = Math.min(totalDays, differenceInDays(allocEnd, timelineStart));
      
      const left = (startOffset / totalDays) * 100;
      const width = ((endOffset - startOffset) / totalDays) * 100;
      
      const theme = getAssignmentTheme(alloc.assignment_name);
      const isOngoing = !alloc.end_date;
      
      return {
        alloc,
        left,
        width: Math.max(width, 2),
        color: theme.accent,
        isOngoing,
        idx
      };
    }).filter(Boolean);
  }

  const allocationBars = getAllocationBars(allocations);

  function handleClose() {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }

  function confirmDelete(index: number) {
    setAllocations(allocations.filter((_, i) => i !== index));
    setDeleteConfirmIndex(null);
    setHasUnsavedChanges(true);
  }

  async function handleSave() {
    if (!resource) return;
    
    // Validate all allocations against contract end date
    if (contractEndDate) {
      const contractEnd = new Date(contractEndDate);
      const invalidAllocation = allocations.find(alloc => {
        if (alloc.end_date) {
          const allocEnd = new Date(alloc.end_date);
          return allocEnd > contractEnd;
        }
        return false;
      });
      
      if (invalidAllocation) {
        toast.error('Allocation end date cannot exceed contract end date', {
          description: `Contract ends on ${format(contractEnd, 'MMM d, yyyy')}. Please adjust the allocation "${invalidAllocation.assignment_name}" end date.`
        });
        return;
      }
    }
    
    setIsSaving(true);
    try {
      // Save department change if it differs from current
      if (onUpdateDepartment && selectedDepartmentId !== resource.department_id) {
        await onUpdateDepartment(resource.id, selectedDepartmentId);
      }
      // Save allocations
      await onSave(resource.id, allocations.filter(a => a.assignment_id));
      setHasUnsavedChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save allocations:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDepartmentChange(value: string) {
    setSelectedDepartmentId(value === 'unassigned' ? null : value);
    setHasUnsavedChanges(true);
  }

  // Get current department name for display
  const currentDepartmentName = selectedDepartmentId 
    ? departments.find(d => d.id === selectedDepartmentId)?.name || 'Unassigned'
    : 'Unassigned';

  if (!resource) return null;

  const initials = resource.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-[var(--ct-surface)] border-[var(--ct-border)] rounded-[var(--ct-radius-xl)]">
        {/* Header - V8 Modal Header */}
        <div className="ct-modal-header flex items-center justify-between px-6 py-4 border-b border-[var(--ct-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--ct-primary)] text-white text-lg font-bold">
              {initials}
            </div>
            <div>
              <h2 className="ct-modal-title text-lg font-bold text-[var(--ct-text)]">
                Edit Allocations: {resource.name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[var(--ct-text-secondary)]">
                  {resource.role}
                </span>
                <span className="text-[var(--ct-border)]">•</span>
                {/* Department Selector - inline with role */}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--ct-text-muted)]" />
                  <Select value={selectedDepartmentId || 'unassigned'} onValueChange={handleDepartmentChange}>
                    <SelectTrigger className="w-32 h-6 text-xs border-dashed bg-transparent px-2 border-[var(--ct-border)]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--ct-surface)] border-[var(--ct-border)] z-[9999]">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="ct-modal-body flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* Current Allocation Summary */}
          <div className="bg-[var(--ct-bg)] rounded-[var(--ct-radius-lg)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Current Allocation Summary
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total:</span>
                <span className="text-lg font-bold" style={{ color: statusColor }}>
                  {totalAllocation}%
                </span>
                <span 
                  className="px-2 py-0.5 text-xs font-semibold rounded border"
                  style={{ 
                    color: statusColor, 
                    borderColor: statusColor,
                    backgroundColor: `${statusColor}10`
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="h-4 bg-white dark:bg-slate-700 rounded-full overflow-hidden flex">
              {allocations.map((alloc, idx) => {
                const theme = getAssignmentTheme(alloc.assignment_name || '');
                const segmentColor = ALLOCATION_SEGMENT_COLORS[idx % ALLOCATION_SEGMENT_COLORS.length];
                return (
                  <div
                    key={idx}
                    className="h-full transition-all"
                    style={{
                      width: `${alloc.allocation_percent}%`,
                      backgroundColor: segmentColor
                    }}
                  />
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                {allocations.map((alloc, idx) => {
                  const segmentColor = ALLOCATION_SEGMENT_COLORS[idx % ALLOCATION_SEGMENT_COLORS.length];
                  return (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segmentColor }}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {alloc.assignment_name} {alloc.allocation_percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {Math.max(0, 100 - totalAllocation)}% available for new bookings
              </span>
            </div>
          </div>

          {/* CONFLICT RESOLUTION BANNER */}
          {hasConflict && (
            <div 
              className="rounded-xl border-2 overflow-hidden"
              style={{ borderColor: CATALYST_V5.overAllocated.hex }}
            >
              {/* Banner Header */}
              <div 
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: CATALYST_V5.overAllocated.bgSolid }}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${CATALYST_V5.overAllocated.hex}20` }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: CATALYST_V5.overAllocated.hex }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold" style={{ color: CATALYST_V5.overAllocated.hex }}>
                    Conflict Detected: +{overflowAmount}% over capacity
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {conflictPeriods.length === 1 
                      ? `In ${format(conflictPeriods[0].month, 'MMMM yyyy')} (${conflictPeriods[0].total}%)`
                      : `In ${conflictPeriods.length} periods: ${conflictPeriods.map(p => format(p.month, 'MMM')).join(', ')}`
                    }
                  </p>
                </div>
              </div>
              
              {/* Quick Fix Options */}
              {quickFixes.length > 0 && (
                <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Quick Fixes</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickFixes.map((fix, idx) => (
                      <button
                        key={idx}
                        onClick={fix.action}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        <span>{fix.label}</span>
                        <span className="text-amber-600 dark:text-amber-400">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Allocation Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Allocation Timeline
              </h3>
            </div>
            
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              {/* Month Headers */}
              <div className="flex mb-2">
                {months.map((month, i) => (
                  <div 
                    key={i} 
                    className="flex-1 text-xs text-slate-500 dark:text-slate-400 font-medium"
                  >
                    {format(month, "MMM ''yy")}
                  </div>
                ))}
              </div>
              
              {/* Timeline Grid with Bars */}
              <div className="relative h-24 mb-2">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex">
                  {months.map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 border-l border-slate-100 dark:border-slate-700 first:border-l-0"
                    />
                  ))}
                </div>
                
                {/* Today Marker */}
                {todayPercent > 0 && todayPercent < 100 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                    style={{ left: `${todayPercent}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  </div>
                )}
                
                {/* Allocation Bars - Clickable to edit */}
                <div className="absolute inset-0 pt-2 space-y-2">
                  {allocationBars.map((bar, i) => {
                    if (!bar) return null;
                    return (
                      <div
                        key={i}
                        className="absolute h-7 rounded flex items-center px-2 text-xs font-medium text-white overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-white/50"
                        style={{
                          left: `${bar.left}%`,
                          width: `${bar.width}%`,
                          top: i * 32,
                          backgroundColor: bar.color
                        }}
                        onClick={() => {
                          setEditingIndex(bar.idx);
                          // Scroll to the allocation edit form
                          setTimeout(() => {
                            allocationRefs.current[bar.idx]?.scrollIntoView({ 
                              behavior: 'smooth', 
                              block: 'center' 
                            });
                          }, 50);
                        }}
                        title="Click to edit this allocation"
                      >
                        <span className="truncate">
                          {bar.alloc.assignment_name} ({bar.alloc.allocation_percent}%)
                          {bar.isOngoing && ' — Ongoing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Monthly Totals */}
              <div className="flex border-t border-slate-100 pt-2">
                {monthlyTotals.map((mt, i) => (
                  <div 
                    key={i} 
                    className="flex-1 text-center text-sm font-semibold"
                    style={{ 
                      color: mt.total > 100 ? '#d97706' : mt.total === 100 ? '#2563eb' : '#0d9488'
                    }}
                  >
                    {mt.total}%
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Existing Allocations List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
              Existing Allocations ({allocations.length})
            </h3>
            
            <div className="space-y-2">
              {allocations.map((alloc, index) => {
                const segmentColor = ALLOCATION_SEGMENT_COLORS[index % ALLOCATION_SEGMENT_COLORS.length];
                const isEditing = editingIndex === index;
                const isOngoing = !alloc.end_date;
                
                return (
                  <div
                    key={index}
                    ref={(el) => { allocationRefs.current[index] = el; }}
                    className={cn(
                      "flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border rounded-xl transition-all",
                      isEditing ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: segmentColor }}
                    />
                    
                    {isEditing ? (
                      // Edit Mode
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">Assignment</Label>
                            <Select 
                              value={alloc.assignment_id}
                              onValueChange={(v) => updateAllocation(index, 'assignment_id', v)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {resourceAssignments.map(a => (
                                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">Allocation %</Label>
                            <Input
                              type="number"
                              min={5}
                              max={100}
                              step={5}
                              value={alloc.allocation_percent}
                              onChange={(e) => {
                                updateAllocation(index, 'allocation_percent', parseInt(e.target.value) || 0);
                                setHasUnsavedChanges(true);
                              }}
                              className="mt-1"
                            />
                            {/* Quick Percentage Buttons */}
                            <div className="flex gap-1 mt-1">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    updateAllocation(index, 'allocation_percent', pct);
                                    setHasUnsavedChanges(true);
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 text-xs rounded transition-colors",
                                    alloc.allocation_percent === pct 
                                      ? "bg-blue-600 text-white" 
                                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                  )}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <Button
                              size="sm"
                              onClick={() => setEditingIndex(null)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">Start Date</Label>
                            <Input
                              type="date"
                              value={alloc.start_date}
                              onChange={(e) => {
                                updateAllocation(index, 'start_date', e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">End Date</Label>
                            <Input
                              type="date"
                              value={alloc.end_date}
                              onChange={(e) => {
                                updateAllocation(index, 'end_date', e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="mt-1"
                              placeholder="Ongoing"
                            />
                          </div>
                        </div>
                        {/* Quick Duration Buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Quick:</span>
                          {[
                            { label: '2w', weeks: 2 },
                            { label: '1m', weeks: 4 },
                            { label: '2m', weeks: 9 },
                            { label: '3m', weeks: 13 },
                            { label: '6m', weeks: 26 },
                          ].map(({ label, weeks }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                const start = new Date(alloc.start_date);
                                const end = new Date(start);
                                end.setDate(end.getDate() + (weeks * 7) - 1);
                                updateAllocation(index, 'end_date', format(end, 'yyyy-MM-dd'));
                                setHasUnsavedChanges(true);
                              }}
                              className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 dark:text-white">{alloc.assignment_name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {alloc.allocation_percent}% • {format(parseISO(alloc.start_date), 'MMM d, yyyy')} — {isOngoing ? 'Ongoing (No end date)' : format(parseISO(alloc.end_date!), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingIndex(index)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmIndex(index)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete allocation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              
              {allocations.length === 0 && !newAllocation && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  No allocations yet. Click below to add one.
                </div>
              )}
            </div>
            
            {/* New Allocation Form */}
            {newAllocation && (
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 border-dashed rounded-xl">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Assignment</Label>
                    <Select 
                      value={newAllocation.assignment_id}
                      onValueChange={(v) => updateNewAllocation('assignment_id', v)}
                    >
                      <SelectTrigger className="mt-1 bg-white dark:bg-slate-800">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {resourceAssignments.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Allocation %</Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      step={5}
                      value={newAllocation.allocation_percent}
                      onChange={(e) => updateNewAllocation('allocation_percent', parseInt(e.target.value) || 0)}
                      className="mt-1 bg-white dark:bg-slate-800"
                    />
                    {/* Quick Percentage Buttons */}
                    <div className="flex gap-1 mt-1">
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateNewAllocation('allocation_percent', pct)}
                          className={cn(
                            "px-2 py-0.5 text-xs rounded transition-colors",
                            newAllocation.allocation_percent === pct 
                              ? "bg-blue-600 text-white" 
                              : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        confirmNewAllocation();
                        setHasUnsavedChanges(true);
                      }}
                      disabled={!newAllocation.assignment_id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelNewAllocation}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Start Date</Label>
                    <Input
                      type="date"
                      value={newAllocation.start_date}
                      onChange={(e) => updateNewAllocation('start_date', e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">End Date</Label>
                    <Input
                      type="date"
                      value={newAllocation.end_date}
                      onChange={(e) => updateNewAllocation('end_date', e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                {/* Quick Duration Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Quick:</span>
                  {[
                    { label: '2 weeks', weeks: 2 },
                    { label: '1 month', weeks: 4 },
                    { label: '2 months', weeks: 9 },
                    { label: '3 months', weeks: 13 },
                    { label: '6 months', weeks: 26 },
                  ].map(({ label, weeks }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const start = new Date(newAllocation.start_date);
                        const end = new Date(start);
                        end.setDate(end.getDate() + (weeks * 7) - 1);
                        updateNewAllocation('end_date', format(end, 'yyyy-MM-dd'));
                      }}
                      className="px-2 py-0.5 text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Add New Allocation Button */}
            {!newAllocation && (
              <button
                onClick={startAddingAllocation}
                className="w-full mt-3 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Allocation
              </button>
            )}
          </div>

          {/* Preview Section */}
          {newAllocation && newAllocation.assignment_name && (
            <div className="bg-slate-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Preview with New Allocation
                </h3>
                <span className="text-sm text-slate-400">
                  After adding {newAllocation.assignment_name} ({newAllocation.allocation_percent}%)
                </span>
              </div>
              
              {/* Preview Timeline */}
              <div className="relative">
                {/* Month Headers */}
                <div className="flex mb-2">
                  {months.map((month, i) => (
                    <div 
                      key={i} 
                      className="flex-1 text-xs text-slate-500"
                    >
                      {format(month, 'MMM')}
                    </div>
                  ))}
                </div>
                
                {/* Bars */}
                <div className="relative h-16 mb-2">
                  {getAllocationBars([...allocations, newAllocation]).map((bar, i) => {
                    if (!bar) return null;
                    const isNew = i === allocations.length;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "absolute h-5 rounded flex items-center px-2 text-xs font-medium text-white",
                          isNew && "border-2 border-dashed border-white/50"
                        )}
                        style={{
                          left: `${bar.left}%`,
                          width: `${bar.width}%`,
                          top: i * 22,
                          backgroundColor: bar.color,
                          opacity: isNew ? 0.8 : 1
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Preview Monthly Totals */}
                <div className="flex border-t border-slate-700 pt-2">
                  {months.map((month, i) => {
                    const monthStart = month;
                    const monthEnd = addMonths(month, 1);
                    let total = 0;
                    [...allocations, newAllocation].forEach(alloc => {
                      if (!alloc?.start_date) return;
                      const allocStart = parseISO(alloc.start_date);
                      const allocEnd = alloc.end_date ? parseISO(alloc.end_date) : addMonths(new Date(), 12);
                      if (allocStart < monthEnd && allocEnd > monthStart) {
                        total += alloc.allocation_percent;
                      }
                    });
                    return (
                      <div 
                        key={i} 
                        className="flex-1 text-center text-sm font-semibold"
                        style={{ 
                          color: total > 100 ? '#d97706' : total === 100 ? '#60a5fa' : '#2dd4bf'
                        }}
                      >
                        {total}%
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3">
                {allocations.map((alloc, idx) => {
                  const segmentColor = ALLOCATION_SEGMENT_COLORS[idx % ALLOCATION_SEGMENT_COLORS.length];
                  return (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: segmentColor }}
                      />
                      <span className="text-xs text-slate-400">{alloc.assignment_name}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-2.5 h-2.5 rounded-full border border-dashed border-white/50"
                    style={{ backgroundColor: getAssignmentTheme(newAllocation.assignment_name).accent }}
                  />
                  <span className="text-xs text-slate-400">New: {newAllocation.assignment_name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - V8 Modal Footer */}
        <div className="ct-modal-footer flex items-center justify-between px-6 py-4 border-t border-[var(--ct-border)] bg-[var(--ct-bg)]">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="ct-btn-secondary text-[var(--ct-text-secondary)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="ct-btn-primary bg-[var(--ct-primary)] hover:bg-[var(--ct-primary-hover)] text-white px-6"
          >
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={() => setDeleteConfirmIndex(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Allocation?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteConfirmIndex !== null && allocations[deleteConfirmIndex] && (
              <>
                Are you sure you want to remove the <strong>{allocations[deleteConfirmIndex].assignment_name}</strong> allocation 
                ({allocations[deleteConfirmIndex].allocation_percent}%)? This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => deleteConfirmIndex !== null && confirmDelete(deleteConfirmIndex)}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Unsaved Changes Warning */}
    <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close without saving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Editing</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              setShowUnsavedWarning(false);
              setHasUnsavedChanges(false);
              onClose();
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

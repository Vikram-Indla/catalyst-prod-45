/**
 * Allocation Booking Modal - V2.1 Monopoly-Grade Implementation
 * Matches the reference design exactly
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Pencil, Calendar } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import type { 
  CapacityResource, 
  ResourceAllocation, 
  AllocationBookingInput 
} from '@/modules/capacity-planner/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resource: CapacityResource | null;
  existingAllocations: ResourceAllocation[];
  resourceAssignments: { id: string; name: string }[];
  onSave: (resourceId: string, allocations: AllocationBookingInput[]) => Promise<void>;
  mode: 'add' | 'edit';
}

export function AllocationBookingModal({
  isOpen,
  onClose,
  resource,
  existingAllocations,
  resourceAssignments,
  onSave,
  mode
}: Props) {
  const [allocations, setAllocations] = useState<AllocationBookingInput[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newAllocation, setNewAllocation] = useState<AllocationBookingInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Timeline configuration - 6 months from current month
  const timelineStart = startOfMonth(new Date());
  const timelineEnd = addMonths(timelineStart, 6);
  const months = eachMonthOfInterval({ start: timelineStart, end: addMonths(timelineStart, 5) });

  // Initialize from existing allocations
  useEffect(() => {
    if (resource && existingAllocations.length > 0) {
      setAllocations(existingAllocations.map(a => ({
        id: a.id,
        assignment_id: a.assignment_id || '',
        assignment_name: a.assignment_name || '',
        allocation_percent: a.allocation_percent,
        start_date: a.start_date,
        end_date: a.end_date || '',
      })));
    } else {
      setAllocations([]);
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
      setAllocations([...allocations, newAllocation]);
      setNewAllocation(null);
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

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    return months.map(month => {
      const monthStart = month;
      const monthEnd = addMonths(month, 1);
      
      let total = 0;
      allocations.forEach(alloc => {
        if (!alloc.start_date) return;
        const allocStart = parseISO(alloc.start_date);
        const allocEnd = alloc.end_date ? parseISO(alloc.end_date) : addMonths(new Date(), 12);
        
        // Check if allocation overlaps with this month
        if (allocStart < monthEnd && allocEnd > monthStart) {
          total += alloc.allocation_percent;
        }
      });
      
      return { month, total };
    });
  }, [allocations, months]);

  const totalAllocation = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  }, [allocations]);

  const hasConflict = totalAllocation > 100;
  const status = totalAllocation > 100 ? 'over' : totalAllocation === 100 ? 'atCapacity' : 'available';
  const statusLabel = status === 'over' ? 'OVER-ALLOCATED' : status === 'atCapacity' ? 'AT CAPACITY' : 'AVAILABLE';
  const statusColor = status === 'over' ? '#d97706' : status === 'atCapacity' ? '#2563eb' : '#0d9488';

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

  async function handleSave() {
    if (!resource) return;
    
    setIsSaving(true);
    try {
      await onSave(resource.id, allocations.filter(a => a.assignment_id));
      onClose();
    } catch (error) {
      console.error('Failed to save allocations:', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (!resource) return null;

  const initials = resource.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: '#2563eb' }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Edit Allocations: {resource.name}
              </h2>
              <p className="text-sm text-slate-500">
                {resource.role} • {resource.department} Department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* Current Allocation Summary */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Current Allocation Summary
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Total:</span>
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
            <div className="h-4 bg-white rounded-full overflow-hidden flex">
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
                      <span className="text-xs text-slate-600">
                        {alloc.assignment_name} {alloc.allocation_percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-slate-500">
                {Math.max(0, 100 - totalAllocation)}% available for new bookings
              </span>
            </div>
          </div>

          {/* Allocation Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Allocation Timeline
              </h3>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              {/* Month Headers */}
              <div className="flex mb-2">
                {months.map((month, i) => (
                  <div 
                    key={i} 
                    className="flex-1 text-xs text-slate-500 font-medium"
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
                      className="flex-1 border-l border-slate-100 first:border-l-0"
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
                
                {/* Allocation Bars */}
                <div className="absolute inset-0 pt-2 space-y-2">
                  {allocationBars.map((bar, i) => {
                    if (!bar) return null;
                    return (
                      <div
                        key={i}
                        className="absolute h-7 rounded flex items-center px-2 text-xs font-medium text-white overflow-hidden"
                        style={{
                          left: `${bar.left}%`,
                          width: `${bar.width}%`,
                          top: i * 32,
                          backgroundColor: bar.color
                        }}
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
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
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
                    className={cn(
                      "flex items-center gap-4 p-4 bg-white border rounded-xl transition-all",
                      isEditing ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
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
                            <Label className="text-xs text-slate-500">Assignment</Label>
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
                            <Label className="text-xs text-slate-500">Allocation %</Label>
                            <Input
                              type="number"
                              min={5}
                              max={100}
                              step={5}
                              value={alloc.allocation_percent}
                              onChange={(e) => updateAllocation(index, 'allocation_percent', parseInt(e.target.value) || 0)}
                              className="mt-1"
                            />
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
                            <Label className="text-xs text-slate-500">Start Date</Label>
                            <Input
                              type="date"
                              value={alloc.start_date}
                              onChange={(e) => updateAllocation(index, 'start_date', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">End Date</Label>
                            <Input
                              type="date"
                              value={alloc.end_date}
                              onChange={(e) => updateAllocation(index, 'end_date', e.target.value)}
                              className="mt-1"
                              placeholder="Ongoing"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{alloc.assignment_name}</div>
                          <div className="text-sm text-slate-500">
                            {alloc.allocation_percent}% • {format(parseISO(alloc.start_date), 'MMM d, yyyy')} — {isOngoing ? 'Ongoing (No end date)' : format(parseISO(alloc.end_date!), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingIndex(index)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeAllocation(index)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="text-center py-8 text-slate-400">
                  No allocations yet. Click below to add one.
                </div>
              )}
            </div>
            
            {/* New Allocation Form */}
            {newAllocation && (
              <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-200 border-dashed rounded-xl">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <Label className="text-xs text-slate-600">Assignment</Label>
                    <Select 
                      value={newAllocation.assignment_id}
                      onValueChange={(v) => updateNewAllocation('assignment_id', v)}
                    >
                      <SelectTrigger className="mt-1 bg-white">
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
                    <Label className="text-xs text-slate-600">Allocation %</Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      step={5}
                      value={newAllocation.allocation_percent}
                      onChange={(e) => updateNewAllocation('allocation_percent', parseInt(e.target.value) || 0)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      onClick={confirmNewAllocation}
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
                    <Label className="text-xs text-slate-600">Start Date</Label>
                    <Input
                      type="date"
                      value={newAllocation.start_date}
                      onChange={(e) => updateNewAllocation('start_date', e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">End Date</Label>
                    <Input
                      type="date"
                      value={newAllocation.end_date}
                      onChange={(e) => updateNewAllocation('end_date', e.target.value)}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Add New Allocation Button */}
            {!newAllocation && (
              <button
                onClick={startAddingAllocation}
                className="w-full mt-3 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from existing allocations
  useEffect(() => {
    if (resource && existingAllocations.length > 0) {
      setAllocations(existingAllocations.map(a => ({
        id: a.id,
        assignment_id: a.assignment_id,
        assignment_name: a.assignment_name || '',
        allocation_percent: a.allocation_percent,
        start_date: a.start_date,
        end_date: a.end_date,
      })));
    } else {
      // Start with one empty allocation
      setAllocations([createEmptyAllocation()]);
    }
  }, [resource, existingAllocations, isOpen]);

  function createEmptyAllocation(): AllocationBookingInput {
    const today = new Date();
    const threeMonths = new Date(today);
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    
    return {
      assignment_id: '',
      assignment_name: '',
      allocation_percent: 50,
      start_date: today.toISOString().split('T')[0],
      end_date: threeMonths.toISOString().split('T')[0],
    };
  }

  function addAllocation() {
    setAllocations([...allocations, createEmptyAllocation()]);
  }

  function removeAllocation(index: number) {
    setAllocations(allocations.filter((_, i) => i !== index));
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

  function setQuickDuration(index: number, weeks: number) {
    const allocation = allocations[index];
    if (!allocation) return;
    
    const start = new Date(allocation.start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + (weeks * 7) - 1);
    
    updateAllocation(index, 'end_date', end.toISOString().split('T')[0]);
  }

  // Calculate total allocation (simplified - for current period)
  const totalAllocation = useMemo(() => {
    return allocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  }, [allocations]);

  const hasConflict = totalAllocation > 100;
  const status = getAllocationStatusTheme(totalAllocation);

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

  const initials = resource.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {mode === 'add' ? 'Book Resource Allocation' : 'Edit Resource Allocations'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Assign {resource.name} to projects for specific time periods (2 weeks to 3 months)
          </DialogDescription>
        </DialogHeader>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Resource Info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: getAssignmentTheme(allocations[0]?.assignment_name || 'Unassigned').accent }}
            >
              {initials}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{resource.name}</div>
              <div className="text-sm text-slate-500">{resource.role} • {resource.department}</div>
            </div>
          </div>

          {/* Allocation Summary Bar */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: status.bg }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">Current Allocation Summary</span>
              <span className="text-sm font-bold" style={{ color: status.text }}>
                {totalAllocation}% allocated
              </span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(totalAllocation, 100)}%`,
                  backgroundColor: status.bar
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{Math.max(0, 100 - totalAllocation)}% available for new bookings</span>
              <span>Target: 100%</span>
            </div>
          </div>

          {/* Over-allocation Warning - Catalyst V5 Orange */}
          {hasConflict && (
            <div 
              className="p-4 rounded-xl flex items-start gap-3 border"
              style={{ 
                backgroundColor: CATALYST_V5.overAllocated.bgSolid, 
                borderColor: `${CATALYST_V5.overAllocated.hex}40` 
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${CATALYST_V5.overAllocated.hex}20` }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: CATALYST_V5.overAllocated.hex }} />
              </div>
              <div>
                <h4 className="text-sm font-semibold" style={{ color: CATALYST_V5.overAllocated.hex }}>
                  Over-allocation Warning
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  Total allocation is {totalAllocation}%. Consider adjusting dates or percentages.
                </p>
              </div>
            </div>
          )}

          {/* Allocation Blocks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-slate-700">Project Allocations</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAllocation}
                className="text-xs"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Project
              </Button>
            </div>

            <div className="space-y-4">
              {allocations.map((allocation, index) => {
                const theme = getAssignmentTheme(allocation.assignment_name || 'Unassigned');
                
                return (
                  <div 
                    key={index}
                    className="p-4 border border-slate-200 rounded-xl bg-white"
                  >
                    <div className="flex items-start gap-4">
                      {/* Assignment Selector */}
                      <div className="flex-1">
                        <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
                          Assignment Type
                        </Label>
                        <Select 
                          value={allocation.assignment_id}
                          onValueChange={(v) => updateAllocation(index, 'assignment_id', v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select assignment..." />
                          </SelectTrigger>
                          <SelectContent>
                            {resourceAssignments.map(assignment => {
                              const aTheme = getAssignmentTheme(assignment.name);
                              return (
                                <SelectItem key={assignment.id} value={assignment.id}>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: aTheme.accent }}
                                    />
                                    {assignment.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Percentage */}
                      <div className="w-28">
                        <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
                          Allocation
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            step={5}
                            value={allocation.allocation_percent}
                            onChange={(e) => updateAllocation(index, 'allocation_percent', parseInt(e.target.value) || 0)}
                            className="text-center pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      {allocations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAllocation(index)}
                          className="mt-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
                          Start Date
                        </Label>
                        <Input
                          type="date"
                          value={allocation.start_date}
                          onChange={(e) => updateAllocation(index, 'start_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-slate-500 mb-1.5 block">
                          End Date
                        </Label>
                        <Input
                          type="date"
                          value={allocation.end_date}
                          onChange={(e) => updateAllocation(index, 'end_date', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Quick Duration Buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-500">Quick:</span>
                      {[
                        { label: '2 weeks', weeks: 2 },
                        { label: '1 month', weeks: 4 },
                        { label: '2 months', weeks: 9 },
                        { label: '3 months', weeks: 13 },
                      ].map(({ label, weeks }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setQuickDuration(index, weeks)}
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded transition-colors',
                            'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Visual Preview */}
                    {allocation.assignment_name && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-500">Preview</span>
                          <span className="text-xs text-slate-500">
                            {new Date(allocation.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(allocation.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div 
                          className="h-6 rounded flex items-center px-2 text-[10px] font-semibold transition-all"
                          style={{ 
                            width: `${allocation.allocation_percent}%`,
                            minWidth: '80px',
                            backgroundColor: theme.accent,
                            color: '#ffffff'
                          }}
                        >
                          {allocation.assignment_name} ({allocation.allocation_percent}%)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Timeline Preview */}
          <div className="p-4 bg-slate-900 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Combined Timeline Preview</span>
              <span 
                className="text-sm font-bold"
                style={{ color: hasConflict ? CATALYST_V5.overAllocated.hex : CATALYST_V5.available.hex }}
              >
                Total: {totalAllocation}%
              </span>
            </div>
            
            <div className="space-y-1.5">
              {allocations.filter(a => a.assignment_name).map((allocation, idx) => {
                const theme = getAssignmentTheme(allocation.assignment_name);
                return (
                  <div 
                    key={idx}
                    className="h-6 rounded flex items-center px-2 text-[10px] font-semibold text-white"
                    style={{ 
                      width: `${allocation.allocation_percent}%`,
                      minWidth: '60px',
                      backgroundColor: theme.accent,
                    }}
                  >
                    {allocation.assignment_name} {allocation.allocation_percent}%
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-400">Remaining availability:</span>
              <span 
                className="font-medium"
                style={{ color: hasConflict ? CATALYST_V5.overAllocated.hex : CATALYST_V5.available.hex }}
              >
                {hasConflict ? 'Over-allocated!' : `${100 - totalAllocation}% available`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSave}
                disabled={isSaving || allocations.every(a => !a.assignment_id)}
                className="bg-[#2563eb] hover:bg-[#1d4ed8]"
              >
                {isSaving ? 'Saving...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

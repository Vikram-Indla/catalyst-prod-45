import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAssignmentColor } from '@/lib/catalyst-colors';
import { useCapacityDepartments, useResourceAssignments } from '@/modules/capacity-planner';
import type { ResourceMetric } from './types';

export interface BookResourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableUsers: ResourceMetric[];
  resources: ResourceMetric[];
}

export function BookResourceModal({ open, onOpenChange, availableUsers, resources }: BookResourceModalProps) {
  const queryClient = useQueryClient();
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [isAddingResources, setIsAddingResources] = useState(false);
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');

  const [bookingAllocations, setBookingAllocations] = useState<{
    id: string;
    assignmentId: string;
    percent: number;
    startDate: string;
    endDate: string;
  }[]>([{
    id: `alloc-${Date.now()}`,
    assignmentId: '',
    percent: 50,
    startDate: new Date().toISOString().split('T')[0],
    endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()
  }]);

  // Auto-select default department when modal opens
  useEffect(() => {
    if (!open) return;

    if (!selectedDepartmentId && (departments?.length ?? 0) > 0) {
      const delivery = departments?.find((d) => d.name?.toLowerCase() === 'delivery');
      if (delivery) setSelectedDepartmentId(delivery.id);
    }
  }, [open, departments, selectedDepartmentId]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSelectedUserId(null);
      setSelectedDepartmentId('');
      setBookingAllocations([{
        id: `alloc-${Date.now()}`,
        assignmentId: '',
        percent: 50,
        startDate: new Date().toISOString().split('T')[0],
        endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()
      }]);
      setResourceSearchQuery('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedDepartmentId) {
      toast.error('Please select a department');
      return;
    }
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    setIsAddingResources(true);
    try {
      const userById = new Map<string, ResourceMetric>(resources.map((r) => [r.id, r] as [string, ResourceMetric]));
      const userId = selectedUserId;

      // Update department in profiles if provided
      if (selectedDepartmentId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ department_id: selectedDepartmentId })
          .eq('id', userId);
        if (profileError) {
          console.warn('Could not update profile department:', profileError);
        }
      }

      // Create resource_inventory entry and allocations
      const name = userById.get(userId)?.name;
      if (name) {
        // Check/create resource_inventory entry
        let { data: existing } = await supabase
          .from('resource_inventory')
          .select('id')
          .eq('profile_id', userId)
          .maybeSingle();

        if (!existing) {
          const { data: newResource } = await supabase.from('resource_inventory').insert({
            profile_id: userId,
            name,
            is_active: true,
          }).select('id').single();
          existing = newResource;
        }

        // Create resource_allocations for each booking allocation
        if (existing) {
          const validAllocations = bookingAllocations.filter(a => a.assignmentId);
          if (validAllocations.length > 0) {
            await supabase.from('resource_allocations').insert(
              validAllocations.map(a => ({
                resource_id: existing.id,
                profile_id: userId,
                assignment_id: a.assignmentId,
                allocation_percent: a.percent,
                start_date: a.startDate,
                end_date: a.endDate,
              }))
            );
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });

      const selectedUser = userById.get(userId);
      toast.success(
        `Added ${selectedUser?.name || 'resource'} with allocations configured.`
      );

      handleOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to add resource: ${error?.message ?? 'Unknown error'}`);
    } finally {
      setIsAddingResources(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b border-border -mx-6 px-6 pt-0">
          <DialogTitle>Book Resource Allocation</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select team members and configure their project allocations with date ranges
          </p>
        </DialogHeader>
        <div className="space-y-6 py-4 overflow-y-auto flex-1 -mx-6 px-6">
          {/* Step 1: Select User */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select User</Label>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or role..."
                value={resourceSearchQuery}
                onChange={(e) => setResourceSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[200px] border border-border rounded-lg">
              {(() => {
                const filteredUsers = availableUsers.filter(u =>
                  u.name?.toLowerCase().includes(resourceSearchQuery.toLowerCase()) ||
                  u.role?.toLowerCase().includes(resourceSearchQuery.toLowerCase())
                );
                if (filteredUsers.length === 0) {
                  return (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                      {availableUsers.length === 0 ? 'All users are already in Capacity Planner' : 'No users match your search'}
                    </div>
                  );
                }
                return (
                <div className="divide-y divide-border">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserId === user.id;
                    const initials = user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(isSelected ? null : user.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected ? 'bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]/10 border-l-2 border-l-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]' : 'hover:bg-muted/50'
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] text-white"
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.role || 'No role'}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{user.department || 'Unassigned'}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                );
              })()}
            </ScrollArea>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Department</Label>
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border shadow-lg z-50">
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Assignments</Label>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setBookingAllocations([...bookingAllocations, {
                    id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    assignmentId: '',
                    percent: 50,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; })()
                  }]);
                }}
                className="gap-1 h-8 text-xs bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))] text-white"
              >
                <Plus className="h-3 w-3" />
                Add Assignment
              </Button>
            </div>

            {/* Allocation Blocks */}
            <div className="space-y-4">
              {bookingAllocations.map((alloc, index) => {
                const assignmentName = resourceAssignments.find(a => a.id === alloc.assignmentId)?.name || '';
                const color = assignmentName ? getAssignmentColor(assignmentName) : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))';

                return (
                  <div key={alloc.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                    {/* Row 1: Assignment + Percentage + Delete */}
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Assignment</Label>
                        <Select
                          value={alloc.assignmentId}
                          onValueChange={(v) => {
                            const updated = [...bookingAllocations];
                            updated[index] = { ...updated[index], assignmentId: v };
                            setBookingAllocations(updated);
                          }}
                        >
                          <SelectTrigger className="bg-card mt-1">
                            <SelectValue placeholder="Select assignment..." />
                          </SelectTrigger>
                          <SelectContent className="bg-card border border-border shadow-lg z-50">
                            {resourceAssignments.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAssignmentColor(a.name || '') }} />
                                  {a.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-muted-foreground">Allocation %</Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            min={5}
                            max={100}
                            step={5}
                            value={alloc.percent}
                            onChange={(e) => {
                              const updated = [...bookingAllocations];
                              updated[index] = { ...updated[index], percent: parseInt(e.target.value) || 0 };
                              setBookingAllocations(updated);
                            }}
                            className="text-center pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      {bookingAllocations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setBookingAllocations(bookingAllocations.filter((_, i) => i !== index))}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Row 2: Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start Date</Label>
                        <Input
                          type="date"
                          value={alloc.startDate}
                          onChange={(e) => {
                            const updated = [...bookingAllocations];
                            updated[index] = { ...updated[index], startDate: e.target.value };
                            setBookingAllocations(updated);
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End Date</Label>
                        <Input
                          type="date"
                          value={alloc.endDate}
                          onChange={(e) => {
                            const updated = [...bookingAllocations];
                            updated[index] = { ...updated[index], endDate: e.target.value };
                            setBookingAllocations(updated);
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Row 3: Quick Duration Buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Quick:</span>
                      {[
                        { label: '2 weeks', weeks: 2 },
                        { label: '1 month', weeks: 4 },
                        { label: '2 months', weeks: 9 },
                        { label: '3 months', weeks: 13 },
                      ].map(({ label, weeks }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const start = new Date(alloc.startDate || new Date());
                            const end = new Date(start);
                            end.setDate(end.getDate() + (weeks * 7) - 1);
                            const updated = [...bookingAllocations];
                            updated[index] = { ...updated[index], endDate: end.toISOString().split('T')[0] };
                            setBookingAllocations(updated);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Row 4: Preview Bar */}
                    {assignmentName && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Preview</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alloc.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(alloc.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div
                          className="h-6 rounded flex items-center px-2 text-xs font-medium text-white"
                          style={{
                            backgroundColor: color,
                            width: `${Math.min(100, alloc.percent)}%`
                          }}
                        >
                          {assignmentName} ({alloc.percent}%)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Allocation Summary */}
            {(() => {
              const hasSelectedUser = !!selectedUserId;
              // Only count allocations where an assignment is selected
              const total = bookingAllocations.reduce((sum, a) => sum + (a.assignmentId ? (a.percent || 0) : 0), 0);
              const isOver = total > 100;
              const statusColor = isOver ? 'var(--ds-text-warning, var(--ds-text-warning, #d97706))' : total === 100 ? 'var(--ds-text-brand, var(--ds-text-brand, #2563eb))' : '#0d9488';
              const statusBg = isOver ? 'rgba(217,119,6,0.08)' : total === 100 ? 'rgba(37,99,235,0.08)' : 'rgba(13,148,136,0.08)';

              if (!hasSelectedUser) {
                return (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
                    <span className="text-sm text-muted-foreground">Select a user to configure allocation</span>
                  </div>
                );
              }

              return (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: statusBg }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Allocation Summary</span>
                    <span className="text-xs font-semibold" style={{ color: statusColor }}>{total}% allocated</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, total)}%`,
                        backgroundColor: statusColor
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">{Math.max(0, 100 - total)}% available</span>
                    <span className="text-xs text-muted-foreground">Target: 100%</span>
                  </div>
                  {isOver && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Over-allocated by {total - 100}%
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selectedUserId || isAddingResources || !selectedDepartmentId}
            onClick={handleSubmit}
            className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))]"
          >
            {isAddingResources ? 'Booking...' : 'Book Resource'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

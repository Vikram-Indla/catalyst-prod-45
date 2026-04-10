import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCapacityDepartments, useResourceManagement, useResourceAssignments } from '@/modules/capacity-planner';
import type { ResourceMetric } from './types';

export interface EditResourceFormProps {
  resource: ResourceMetric;
  onSave: () => void;
  onCancel: () => void;
}

export function EditResourceForm({
  resource,
  onSave,
  onCancel
}: EditResourceFormProps) {
  const queryClient = useQueryClient();
  const { departments } = useCapacityDepartments();
  const { assignments: assignmentTypes = [] } = useResourceAssignments();
  const { updateResource } = useResourceManagement();

  const [name, setName] = useState(resource.name);
  const [role, setRole] = useState(resource.role || 'Frontend Developer');
  const [departmentId, setDepartmentId] = useState(resource.department_id || '');
  const [assignmentId, setAssignmentId] = useState(resource.assignment_id || '');
  const [allocation, setAllocation] = useState(resource.allocation || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save function for profile fields
  const saveProfileField = async (field: string, value: string | null) => {
    setIsSaving(true);
    try {
      const updatePayload: any = { id: resource.id };

      if (field === 'role') updatePayload.role = value;
      if (field === 'department_id') updatePayload.department_id = value || null;
      if (field === 'assignment_id') updatePayload.assignment_id = value || null;
      if (field === 'full_name') updatePayload.full_name = value;

      await updateResource.mutateAsync(updatePayload);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save allocation to resource_inventory table
  const saveAllocation = async (newAllocation: number) => {
    setIsSaving(true);
    try {
      // Check if resource exists in resource_inventory by profile_id
      const { data: existingResource } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', resource.id)
        .maybeSingle();

      if (existingResource) {
        // Update existing resource_inventory entry
        const { error } = await supabase
          .from('resource_inventory')
          .update({
            default_capacity_percent: newAllocation,
            updated_at: new Date().toISOString()
          })
          .eq('profile_id', resource.id);

        if (error) throw error;
      } else {
        // Create resource_inventory entry with profile_id
        const { error } = await supabase
          .from('resource_inventory')
          .insert({
            profile_id: resource.id,
            name: resource.name || 'Unknown',
            role_name: resource.role,
            assignment_id: resource.assignment_id || null,
            default_capacity_percent: newAllocation,
            is_active: true,
          });

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save allocation:', error);
      toast.error('Failed to save allocation');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for role change
  const handleRoleChange = (value: string) => {
    setRole(value);
    saveProfileField('role', value);
  };

  // Handler for department change
  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    saveProfileField('department_id', value);
  };

  // Handler for assignment change
  const handleAssignmentChange = (value: string) => {
    setAssignmentId(value);
    saveProfileField('assignment_id', value);
  };

  // Handler for allocation change (save on blur)
  const handleAllocationBlur = () => {
    if (allocation !== resource.allocation) {
      saveAllocation(allocation);
    }
  };

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveProfileField('full_name', name)}
              placeholder="Enter name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={resource.email || ''}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="No email set"
            />
          </div>
        </div>
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              value={role}
              readOnly
              disabled
              className="bg-muted cursor-not-allowed"
              placeholder="Managed via Admin > Users"
            />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assignment</Label>
            <Select value={assignmentId} onValueChange={handleAssignmentChange}>
              <SelectTrigger><SelectValue placeholder="Select assignment..." /></SelectTrigger>
              <SelectContent>
                {assignmentTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Allocation %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={5}
              value={allocation}
              onChange={(e) => setAllocation(parseInt(e.target.value) || 0)}
              onBlur={handleAllocationBlur}
            />
          </div>
        </div>

        {/* Auto-save indicator */}
        {(isSaving || lastSaved) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <div className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-[#0d9488]" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-[#2563eb] hover:bg-[#1d4ed8]"
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

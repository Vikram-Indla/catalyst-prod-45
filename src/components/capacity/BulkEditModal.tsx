import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCapacityDepartments, useResourceAssignments } from '@/modules/capacity-planner';
import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/lib/supabase-utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkEditResource {
  id: string;
  name: string;
  department?: string;
  department_id?: string;
  assignment?: string;
  assignment_id?: string;
  allocation?: number;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: BulkEditResource[];
}

export function BulkEditModal({ isOpen, onClose, resources }: BulkEditModalProps) {
  const queryClient = useQueryClient();
  
  // Fields to edit - null means "keep existing"
  const [editDepartment, setEditDepartment] = useState(false);
  const [editAssignment, setEditAssignment] = useState(false);
  const [editAllocation, setEditAllocation] = useState(false);
  
  const [departmentId, setDepartmentId] = useState<string>('');
  const [assignmentId, setAssignmentId] = useState<string>('');
  const [allocationPercentage, setAllocationPercentage] = useState<number>(100);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { departments } = useCapacityDepartments();
  const { assignments: resourceAssignments = [] } = useResourceAssignments();
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditDepartment(false);
      setEditAssignment(false);
      setEditAllocation(false);
      setDepartmentId('');
      setAssignmentId('');
      setAllocationPercentage(100);
    }
  }, [isOpen]);
  
  const handleSubmit = async () => {
    if (!editDepartment && !editAssignment && !editAllocation) {
      toast.error('Please select at least one field to update');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const resourceIds = resources.map(r => r.id);
      
      // Update department if selected
      if (editDepartment && departmentId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            department_id: departmentId,
            updated_at: new Date().toISOString()
          })
          .in('id', resourceIds);
        
        if (profileError) throw profileError;
      }
      
      // Update assignment if selected
      if (editAssignment && assignmentId) {
        // Update resource_inventory for each resource
        for (const resource of resources) {
          const { data: existing } = await supabase
            .from('resource_inventory')
            .select('id')
            .eq('profile_id', resource.id)
            .maybeSingle();
          
          if (existing) {
            await supabase
              .from('resource_inventory')
              .update({ 
                assignment_id: assignmentId,
                updated_at: new Date().toISOString()
              })
              .eq('profile_id', resource.id);
          } else {
            await supabase.from('resource_inventory').insert({
              profile_id: resource.id,
              name: resource.name,
              assignment_id: assignmentId,
              is_active: true,
            });
          }
        }
      }
      
      // Update allocation if selected
      if (editAllocation) {
        const { error: allocationError } = await fromTable('assignments')
          .update({
            allocation_percentage: allocationPercentage,
            updated_at: new Date().toISOString()
          })
          .in('user_id', resourceIds);
        
        if (allocationError) throw allocationError;
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      
      const fields = [];
      if (editDepartment) fields.push('department');
      if (editAssignment) fields.push('assignment');
      if (editAllocation) fields.push('allocation');
      
      toast.success(`Updated ${fields.join(', ')} for ${resources.length} resource${resources.length > 1 ? 's' : ''}`);
      onClose();
    } catch (error: any) {
      console.error('Bulk edit error:', error);
      toast.error(error.message || 'Failed to update resources');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const hasChanges = editDepartment || editAssignment || editAllocation;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Bulk Edit {resources.length} Resource{resources.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Selected Resources Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Selected Resources</Label>
            <ScrollArea className="h-[100px] border border-border rounded-lg">
              <div className="p-3 flex flex-wrap gap-2">
                {resources.map(resource => (
                  <span 
                    key={resource.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground"
                  >
                    {resource.name}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Department Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="edit-department"
                checked={editDepartment}
                onCheckedChange={(checked) => setEditDepartment(!!checked)}
              />
              <Label htmlFor="edit-department" className="text-sm font-medium cursor-pointer">
                Update Department
              </Label>
            </div>
            {editDepartment && (
              <Select value={departmentId} onValueChange={setDepartmentId}>
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
            )}
          </div>
          
          {/* Assignment Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="edit-assignment"
                checked={editAssignment}
                onCheckedChange={(checked) => setEditAssignment(!!checked)}
              />
              <Label htmlFor="edit-assignment" className="text-sm font-medium cursor-pointer">
                Update Assignment
              </Label>
            </div>
            {editAssignment && (
              <Select value={assignmentId} onValueChange={setAssignmentId}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select assignment..." />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-lg z-50">
                  {resourceAssignments.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Allocation Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox 
                id="edit-allocation"
                checked={editAllocation}
                onCheckedChange={(checked) => setEditAllocation(!!checked)}
              />
              <Label htmlFor="edit-allocation" className="text-sm font-medium cursor-pointer">
                Update Allocation %
              </Label>
            </div>
            {editAllocation && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !hasChanges}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              `Update ${resources.length} Resource${resources.length > 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

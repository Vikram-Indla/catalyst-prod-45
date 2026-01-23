import { useState } from 'react';
import { useResourceAssignments, type ResourceAssignment } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Briefcase, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface LinkedRecord {
  resource_name: string;
  table_source: 'allocation' | 'inventory';
}

export default function ResourceAssignmentsPage() {
  const queryClient = useQueryClient();
  const { allAssignments, isLoadingAll, createAssignment, updateAssignment } = useResourceAssignments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ResourceAssignment | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ResourceAssignment | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const checkLinkedRecords = async (assignmentId: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    // Check resource_allocations
    const { data: allocations } = await supabase
      .from('resource_allocations')
      .select(`
        id,
        resource_inventory!inner(name)
      `)
      .eq('assignment_id', assignmentId);

    if (allocations && allocations.length > 0) {
      allocations.forEach((alloc: any) => {
        records.push({
          resource_name: alloc.resource_inventory?.name || 'Unknown Resource',
          table_source: 'allocation',
        });
      });
    }

    // Check resource_inventory
    const { data: inventory } = await supabase
      .from('resource_inventory')
      .select('id, name')
      .eq('assignment_id', assignmentId);

    if (inventory && inventory.length > 0) {
      inventory.forEach((inv: any) => {
        // Don't add duplicates
        if (!records.find(r => r.resource_name === inv.name && r.table_source === 'inventory')) {
          records.push({
            resource_name: inv.name || 'Unknown Resource',
            table_source: 'inventory',
          });
        }
      });
    }

    setLinkedRecords(records);
    setIsCheckingLinks(false);
    return records;
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createAssignment.mutateAsync(formData);
    setFormData({ name: '', description: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingAssignment || !formData.name.trim()) return;
    await updateAssignment.mutateAsync({
      id: editingAssignment.id,
      updates: formData,
    });
    setEditingAssignment(null);
    setFormData({ name: '', description: '' });
  };

  const handleDeleteClick = async (assignment: ResourceAssignment) => {
    setAssignmentToDelete(assignment);
    await checkLinkedRecords(assignment.id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    
    setIsDeleting(true);
    
    // Double-check there are no linked records
    const records = await checkLinkedRecords(assignmentToDelete.id);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

    // Actually delete (hard delete)
    const { error } = await supabase
      .from('resource_assignments')
      .delete()
      .eq('id', assignmentToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
    } else {
      toast.success('Assignment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      setDeleteModalOpen(false);
      setAssignmentToDelete(null);
      setLinkedRecords([]);
    }
  };

  const handleToggleActive = async (assignment: ResourceAssignment) => {
    await updateAssignment.mutateAsync({
      id: assignment.id,
      updates: { is_active: !assignment.is_active },
    });
  };

  const openEdit = (assignment: ResourceAssignment) => {
    setEditingAssignment(assignment);
    setFormData({ name: assignment.name, description: assignment.description || '' });
  };

  if (isLoadingAll) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Resource Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure assignment values for capacity planning resources.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Assignment
        </Button>
      </div>

      {/* Assignments List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Description</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allAssignments.map((assignment) => (
              <tr 
                key={assignment.id} 
                className={`border-t border-border hover:bg-muted/20 ${!assignment.is_active ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(37,99,235,0.1)] flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-[#2563eb]" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{assignment.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {assignment.description || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={assignment.is_active}
                    onCheckedChange={() => handleToggleActive(assignment)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(assignment)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(assignment)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-[#dc2626]/10 hover:text-[#dc2626] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {allAssignments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No assignments configured. Click "Add Assignment" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createAssignment.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingAssignment !== null} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Senaei BAU"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateAssignment.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalOpen(false);
          setAssignmentToDelete(null);
          setLinkedRecords([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkedRecords.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Assignment
                </>
              ) : (
                'Delete Assignment'
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isCheckingLinks ? (
            <div className="py-8 text-center text-muted-foreground">
              Checking for linked records...
            </div>
          ) : linkedRecords.length > 0 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                The assignment <strong>"{assignmentToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked resource{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{record.resource_name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        ({record.table_source === 'allocation' ? 'Allocation' : 'Assigned'})
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Please reassign or remove these resources from this assignment before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>"{assignmentToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setAssignmentToDelete(null);
              setLinkedRecords([]);
            }}>
              {linkedRecords.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {linkedRecords.length === 0 && (
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from 'react';
import { useResourceAssignments, type ResourceAssignment } from '@/modules/capacity-planner/hooks/useResourceAssignments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Briefcase } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function ResourceAssignmentsPage() {
  const { allAssignments, isLoadingAll, createAssignment, updateAssignment, deleteAssignment } = useResourceAssignments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ResourceAssignment | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this assignment?')) {
      await deleteAssignment.mutateAsync(id);
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
                      onClick={() => handleDelete(assignment.id)}
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
    </div>
  );
}

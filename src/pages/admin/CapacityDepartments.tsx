import { useState } from 'react';
import { useCapacityDepartments, type CapacityDepartment } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, GripVertical, AlertTriangle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ads';

interface LinkedResource {
  id: string;
  full_name: string;
}

export default function CapacityDepartmentsPage() {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useCapacityDepartments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<CapacityDepartment | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<CapacityDepartment | null>(null);
  const [linkedResources, setLinkedResources] = useState<LinkedResource[]>([]);
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createDepartment.mutateAsync({ name: formData.name });
    setFormData({ name: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingDepartment || !formData.name.trim()) return;
    await updateDepartment.mutateAsync({
      id: editingDepartment.id,
      updates: { name: formData.name },
    });
    setEditingDepartment(null);
    setFormData({ name: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${text} to clipboard`);
  };

  const checkLinkedRecords = async (departmentId: string) => {
    setCheckingLinks(true);
    try {
      // Check profiles linked to this department
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('department_id', departmentId);

      if (error) throw error;
      return profiles || [];
    } catch (error) {
      console.error('Error checking linked records:', error);
      toast.error('Failed to check linked records');
      return [];
    } finally {
      setCheckingLinks(false);
    }
  };

  const handleDeleteClick = async (dept: CapacityDepartment) => {
    setDepartmentToDelete(dept);
    const linked = await checkLinkedRecords(dept.id);
    setLinkedResources(linked);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!departmentToDelete || linkedResources.length > 0) return;
    
    await deleteDepartment.mutateAsync(departmentToDelete.id);
    setDeleteModalOpen(false);
    setDepartmentToDelete(null);
    setLinkedResources([]);
  };

  const openEdit = (dept: CapacityDepartment) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name });
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-semibold text-foreground">Resource Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure departments for resource management. Changes sync in real-time.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Departments List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase w-24">DID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-primary">{dept.department_id}</span>
                      <Tooltip content="Copy DID">
                        <button
                          onClick={() => copyToClipboard(dept.department_id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{dept.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No departments configured. Click "Add Department" to create one.
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
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createDepartment.isPending}
              className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))]"
            >
              {createDepartment.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingDepartment !== null} onOpenChange={(open) => !open && setEditingDepartment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDepartment(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateDepartment.isPending}
              className="bg-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:bg-[var(--ds-background-brand-bold-hovered,var(--ds-background-brand-bold-hovered, #1d4ed8))]"
            >
              {updateDepartment.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {linkedResources.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Department
                </>
              ) : (
                'Delete Department'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {checkingLinks ? (
                  <p>Checking for linked records...</p>
                ) : linkedResources.length > 0 ? (
                  <div className="space-y-3">
                    <p>
                      The department <strong>"{departmentToDelete?.name}"</strong> cannot be deleted because it has {linkedResources.length} linked resource(s):
                    </p>
                    <div className="max-h-40 overflow-y-auto border border-border rounded-md divide-y divide-border">
                      {linkedResources.map((resource) => (
                        <div key={resource.id} className="px-3 py-2 text-sm">
                          {resource.full_name || 'Unnamed Resource'}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please reassign or remove these resources before deleting this department.
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete <strong>"{departmentToDelete?.name}"</strong>? This action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {linkedResources.length === 0 && !checkingLinks && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

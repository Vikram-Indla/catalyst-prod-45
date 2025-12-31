import { useState } from 'react';
import { useCapacityDepartments, type CapacityDepartment } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CapacityDepartmentsPage() {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useCapacityDepartments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<CapacityDepartment | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#0d9488' });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createDepartment.mutateAsync(formData);
    setFormData({ name: '', description: '', color: '#0d9488' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingDepartment || !formData.name.trim()) return;
    await updateDepartment.mutateAsync({
      id: editingDepartment.id,
      updates: formData,
    });
    setEditingDepartment(null);
    setFormData({ name: '', description: '', color: '#0d9488' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this department?')) {
      await deleteDepartment.mutateAsync(id);
    }
  };

  const openEdit = (dept: CapacityDepartment) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name, description: dept.description || '', color: dept.color });
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
          <h1 className="text-2xl font-semibold text-foreground">Capacity Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure departments for capacity planning. Changes sync in real-time.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
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
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Description</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Color</th>
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
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{dept.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {dept.description || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span 
                    className="inline-block px-2 py-1 rounded text-xs font-mono"
                    style={{ backgroundColor: `${dept.color}20`, color: dept.color }}
                  >
                    {dept.color}
                  </span>
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
                      onClick={() => handleDelete(dept.id)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-[#dc2626]/10 hover:text-[#dc2626] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createDepartment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
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
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDepartment(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateDepartment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateDepartment.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

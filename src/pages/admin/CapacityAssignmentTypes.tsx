import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCapacityAssignmentTypes, useCapacityAssignmentTypesMutations } from '@/hooks/useCapacityAssignmentTypes';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CapacityAssignmentTypes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);

  const { data: assignmentTypes = [], isLoading } = useCapacityAssignmentTypes();
  const { create, update, delete: deleteMutation } = useCapacityAssignmentTypesMutations();

  const filteredTypes = assignmentTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    await create.mutateAsync({ 
      name: newTypeName.trim(), 
      description: newTypeDescription.trim() || undefined 
    });
    resetForm();
  };

  const handleUpdateType = async () => {
    if (!editingType || !newTypeName.trim()) return;
    await update.mutateAsync({
      id: editingType.id,
      name: newTypeName.trim(),
      description: newTypeDescription.trim() || undefined,
    });
    resetForm();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await update.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    await deleteMutation.mutateAsync(typeToDelete);
    setDeleteConfirmOpen(false);
    setTypeToDelete(null);
  };

  const resetForm = () => {
    setEditingType(null);
    setNewTypeName('');
    setNewTypeDescription('');
    setIsDialogOpen(false);
  };

  const openEditDialog = (type: { id: string; name: string; description: string | null }) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setNewTypeDescription(type.description || '');
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingType(null);
    setNewTypeName('');
    setNewTypeDescription('');
    setIsDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assignment Types</h1>
            <p className="text-muted-foreground mt-2">
              Manage capacity assignment types for resource planning
            </p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-primary-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment Type
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignmentTypes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignmentTypes.filter(t => t.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignmentTypes.filter(t => !t.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Type Configuration</CardTitle>
            <CardDescription>
              Configure assignment types that appear in the capacity planner's "Add Resource" modal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignment types..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Description</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        No assignment types found
                      </td>
                    </tr>
                  ) : (
                    filteredTypes.map((type) => (
                      <tr key={type.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </td>
                        <td className="p-3 text-sm font-medium">{type.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {type.description || '-'}
                        </td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={type.is_active}
                            onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(type)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setTypeToDelete(type.id);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Assignment Type' : 'Add Assignment Type'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Enter assignment type name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover"
                onClick={editingType ? handleUpdateType : handleAddType}
                disabled={!newTypeName.trim()}
              >
                {editingType ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assignment Type</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this assignment type? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}

import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Departments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<{ id: string; name: string } | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useDepartments();

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;

    const { error } = await supabase
      .from('departments')
      .insert({ name: newDepartmentName.trim() });

    if (error) {
      toast.error('Failed to add department');
      return;
    }

    toast.success('Department added');
    setNewDepartmentName('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !newDepartmentName.trim()) return;

    const { error } = await supabase
      .from('departments')
      .update({ name: newDepartmentName.trim() })
      .eq('id', editingDepartment.id);

    if (error) {
      toast.error('Failed to update department');
      return;
    }

    toast.success('Department updated');
    setEditingDepartment(null);
    setNewDepartmentName('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success(`Department ${!currentStatus ? 'enabled' : 'disabled'}`);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const openEditDialog = (dept: { id: string; name: string }) => {
    setEditingDepartment(dept);
    setNewDepartmentName(dept.name);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingDepartment(null);
    setNewDepartmentName('');
    setIsDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground mt-2">
              Manage department list for Business Requests
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments.filter(d => d.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments.filter(d => !d.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Configuration</CardTitle>
            <CardDescription>
              Configure departments for Business Requests. Each department maps to a Business Owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search departments..."
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
                    <th className="text-left p-3 text-sm font-medium">Department Name</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted-foreground">
                        No departments found
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </td>
                        <td className="p-3 text-sm font-medium">{dept.name}</td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={dept.is_active ?? true}
                            onCheckedChange={() => handleToggleActive(dept.id, dept.is_active ?? true)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(dept)}>
                            <Edit className="h-4 w-4" />
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
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="Enter department name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-gold hover:bg-brand-gold-hover"
                onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
              >
                {editingDepartment ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}

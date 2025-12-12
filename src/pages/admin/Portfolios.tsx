import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsivePageContainer, ResponsivePageHeader, ResponsiveGrid, ResponsiveTableWrapper } from '@/components/layout/ResponsivePageContainer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Portfolio {
  id: string;
  name: string;
  key: string;
  description?: string;
  status: 'active' | 'archived';
  owner_id: string;
}

function generateKey(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  return words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
}

/**
 * Programs Management Page - Configure program structure and settings
 * Source: Administration guide PDF, Basic Structure section
 */
export default function Portfolios() {
  const queryClient = useQueryClient();
  const [editingProgram, setEditingProgram] = useState<Portfolio | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', key: '' });

  const { data: programs, isLoading } = useQuery({
    queryKey: ['admin-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Portfolio[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, key }: { name: string; key: string }) => {
      const { error } = await supabase
        .from('portfolios')
        .insert({ name, key, status: 'active' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Program created successfully');
      setIsAddDialogOpen(false);
      setFormData({ name: '', key: '' });
    },
    onError: (error) => {
      toast.error('Failed to create program: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('portfolios')
        .update({ name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs-directory'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Program updated successfully');
      setEditingProgram(null);
    },
    onError: (error) => {
      toast.error('Failed to update program: ' + error.message);
    }
  });

  const handleEdit = (program: Portfolio) => {
    setEditingProgram(program);
    setFormData({ name: program.name, key: program.key });
  };

  const handleSave = () => {
    if (!editingProgram) return;
    updateMutation.mutate({
      id: editingProgram.id,
      name: formData.name
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Program name is required');
      return;
    }
    const finalKey = formData.key.trim() || generateKey(formData.name);
    createMutation.mutate({ name: formData.name, key: finalKey });
  };

  const openAddDialog = () => {
    setFormData({ name: '', key: '' });
    setIsAddDialogOpen(true);
  };

  return (
    <AdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Programs"
          description="Configure program structure and enterprise associations"
          actions={
            <Button className="bg-brand-gold hover:bg-brand-gold-hover" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
          }
        />

        <ResponsiveGrid cols={3}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs?.filter(p => p.status === 'active').length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        <Card>
          <CardHeader>
            <CardTitle>Program Configuration</CardTitle>
            <CardDescription>
              Manage programs, their projects, and strategic alignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-[var(--s4)] mb-[var(--s4)]">
              <div className="relative flex-1">
                <Search className="absolute left-[var(--s3)] top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs..."
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-[var(--s8)] text-muted-foreground">Loading programs...</div>
            ) : programs?.length === 0 ? (
              <div className="text-center py-[var(--s8)] text-muted-foreground">
                No programs found. Click "Add Program" to create one.
              </div>
            ) : (
              <ResponsiveTableWrapper minWidth={600}>
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Program Name</th>
                      <th className="text-left p-3 text-sm font-medium">Projects</th>
                      <th className="text-left p-3 text-sm font-medium">Themes</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-right p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programs?.map((program) => (
                      <tr key={program.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm">{program.name}</td>
                        <td className="p-3 text-sm">-</td>
                        <td className="p-3 text-sm">-</td>
                        <td className="p-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            program.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {program.status === 'active' ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(program)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTableWrapper>
            )}
          </CardContent>
        </Card>

        {/* Add Program Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Program Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter program name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Program Dialog */}
        <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Program</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Program Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProgram(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ResponsivePageContainer>
    </AdminGuard>
  );
}

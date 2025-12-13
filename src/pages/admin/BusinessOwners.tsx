import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings } from '@/hooks/useDepartmentsAndOwners';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BusinessOwners() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<{ id: string; name: string } | null>(null);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: owners = [], isLoading } = useBusinessOwners();
  const { data: departments = [] } = useDepartments();
  const { data: mappings = [] } = useDepartmentOwnerMappings();

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDepartmentForOwner = (ownerId: string) => {
    const mapping = mappings.find(m => m.owner_id === ownerId);
    if (!mapping) return null;
    return departments.find(d => d.id === mapping.department_id);
  };

  const handleAddOwner = async () => {
    if (!newOwnerName.trim()) return;

    const { data: newOwner, error: ownerError } = await supabase
      .from('business_owners')
      .insert({ name: newOwnerName.trim() })
      .select()
      .single();

    if (ownerError || !newOwner) {
      toast.error('Failed to add business owner');
      return;
    }

    // Create department mapping if department selected
    if (selectedDepartmentId) {
      // First remove any existing mapping for this department
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('department_id', selectedDepartmentId);

      const { error: mappingError } = await supabase
        .from('department_owner_mapping')
        .insert({ 
          department_id: selectedDepartmentId, 
          owner_id: newOwner.id 
        });

      if (mappingError) {
        toast.error('Failed to create department mapping');
      }
    }

    toast.success('Business Owner added');
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
    queryClient.invalidateQueries({ queryKey: ['department-owner-mapping'] });
  };

  const handleUpdateOwner = async () => {
    if (!editingOwner || !newOwnerName.trim()) return;

    const { error: ownerError } = await supabase
      .from('business_owners')
      .update({ name: newOwnerName.trim() })
      .eq('id', editingOwner.id);

    if (ownerError) {
      toast.error('Failed to update business owner');
      return;
    }

    // Update department mapping
    if (selectedDepartmentId) {
      // Remove old mapping for this owner
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('owner_id', editingOwner.id);

      // Remove any existing mapping for the new department
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('department_id', selectedDepartmentId);

      // Create new mapping
      const { error: mappingError } = await supabase
        .from('department_owner_mapping')
        .insert({ 
          department_id: selectedDepartmentId, 
          owner_id: editingOwner.id 
        });

      if (mappingError) {
        toast.error('Failed to update department mapping');
      }
    }

    toast.success('Business Owner updated');
    setEditingOwner(null);
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
    queryClient.invalidateQueries({ queryKey: ['department-owner-mapping'] });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('business_owners')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success(`Business Owner ${!currentStatus ? 'enabled' : 'disabled'}`);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
  };

  const openEditDialog = (owner: { id: string; name: string }) => {
    setEditingOwner(owner);
    setNewOwnerName(owner.name);
    const mapping = mappings.find(m => m.owner_id === owner.id);
    setSelectedDepartmentId(mapping?.department_id || '');
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingOwner(null);
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Owners</h1>
            <p className="text-muted-foreground mt-2">
              Manage business owners and their department mappings
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Business Owner
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Business Owners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{owners.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Owners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {owners.filter(o => o.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mapped to Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mappings.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Owner Configuration</CardTitle>
            <CardDescription>
              Configure business owners and their 1:1 department mappings. When a department is selected in a Business Request, the mapped owner is auto-assigned.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search business owners..."
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
                    <th className="text-left p-3 text-sm font-medium">Business Owner</th>
                    <th className="text-left p-3 text-sm font-medium">Mapped Department</th>
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
                  ) : filteredOwners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-muted-foreground">
                        No business owners found
                      </td>
                    </tr>
                  ) : (
                    filteredOwners.map((owner) => {
                      const dept = getDepartmentForOwner(owner.id);
                      return (
                        <tr key={owner.id} className="border-t hover:bg-muted/50">
                          <td className="p-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          </td>
                          <td className="p-3 text-sm font-medium">{owner.name}</td>
                          <td className="p-3 text-sm">
                            {dept ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-brand-gold/10 text-brand-gold">
                                {dept.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not mapped</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <Switch
                              checked={owner.is_active ?? true}
                              onCheckedChange={() => handleToggleActive(owner.id, owner.is_active ?? true)}
                            />
                          </td>
                          <td className="p-3 text-sm text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(owner)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
                {editingOwner ? 'Edit Business Owner' : 'Add Business Owner'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Owner Name</Label>
                <Input
                  id="name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Enter business owner name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Mapped Department (1:1)</Label>
                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {departments.filter(d => d.is_active).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Each department can only be mapped to one business owner.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-gold hover:bg-brand-gold-hover"
                onClick={editingOwner ? handleUpdateOwner : handleAddOwner}
              >
                {editingOwner ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}

import { useState, useMemo } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useResourceInventory,
  useResourceRoles,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  ResourceInventoryItem,
} from '@/hooks/useResourceInventory';

export default function ResourceInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceInventoryItem | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formRoleCode, setFormRoleCode] = useState('');
  const [formRoleName, setFormRoleName] = useState('');
  const [formCapacity, setFormCapacity] = useState<number>(100);
  const [formNotes, setFormNotes] = useState('');

  const { data: resources = [], isLoading } = useResourceInventory();
  const { data: roles = [] } = useResourceRoles();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.role_code?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.role_name?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole =
        roleFilter.length === 0 || (r.role_code && roleFilter.includes(r.role_code));
      return matchesSearch && matchesRole;
    });
  }, [resources, searchTerm, roleFilter]);

  const resetForm = () => {
    setFormName('');
    setFormRoleCode('');
    setFormRoleName('');
    setFormCapacity(100);
    setFormNotes('');
    setEditingResource(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (resource: ResourceInventoryItem) => {
    setEditingResource(resource);
    setFormName(resource.name);
    setFormRoleCode(resource.role_code || '');
    setFormRoleName(resource.role_name || '');
    setFormCapacity(resource.default_capacity_percent);
    setFormNotes(resource.notes || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const data = {
      name: formName.trim(),
      role_code: formRoleCode.trim() || null,
      role_name: formRoleName.trim() || null,
      default_capacity_percent: Math.max(0, Math.min(100, formCapacity)),
      notes: formNotes.trim() || null,
    };

    if (editingResource) {
      await updateResource.mutateAsync({ id: editingResource.id, ...data });
    } else {
      await createResource.mutateAsync(data);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await updateResource.mutateAsync({ id, is_active: !currentStatus });
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteResource.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const toggleRoleFilter = (code: string) => {
    setRoleFilter(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resource Inventory</h1>
            <p className="text-muted-foreground mt-2">
              Manage team resources and their default capacity allocations
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resources.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resources.filter(r => r.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resources.length > 0
                  ? Math.round(
                      resources.reduce((sum, r) => sum + r.default_capacity_percent, 0) /
                        resources.length
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
            <CardDescription>
              Configure team members, their roles, and default capacity percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Role Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {roles.map(role => (
                <Badge
                  key={role.code}
                  variant={roleFilter.includes(role.code) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    roleFilter.includes(role.code)
                      ? 'bg-brand-gold hover:bg-brand-gold-hover text-white'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleRoleFilter(role.code)}
                >
                  {role.code}
                </Badge>
              ))}
              {roleFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setRoleFilter([])}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Role Key</th>
                    <th className="text-left p-3 text-sm font-medium">Role Name</th>
                    <th className="text-left p-3 text-sm font-medium">Capacity</th>
                    <th className="text-left p-3 text-sm font-medium">Notes</th>
                    <th className="text-left p-3 text-sm font-medium">Active</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredResources.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-muted-foreground">
                        No resources found
                      </td>
                    </tr>
                  ) : (
                    filteredResources.map(resource => (
                      <tr key={resource.id} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">{resource.name}</td>
                        <td className="p-3 text-sm">
                          {resource.role_code ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {resource.role_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {resource.role_name || '—'}
                        </td>
                        <td className="p-3 text-sm">{resource.default_capacity_percent}%</td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">
                          {resource.notes || '—'}
                        </td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={resource.is_active}
                            onCheckedChange={() =>
                              handleToggleActive(resource.id, resource.is_active)
                            }
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(resource)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(resource.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Enter resource name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleCode">Role Key</Label>
                  <Input
                    id="roleCode"
                    value={formRoleCode}
                    onChange={e => setFormRoleCode(e.target.value.toUpperCase())}
                    placeholder="e.g., TPO, PO, BA"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={formRoleName}
                    onChange={e => setFormRoleName(e.target.value)}
                    placeholder="e.g., Product Owner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Default Capacity (%)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  max={100}
                  value={formCapacity}
                  onChange={e => setFormCapacity(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-gold hover:bg-brand-gold-hover"
                onClick={handleSave}
                disabled={!formName.trim() || createResource.isPending || updateResource.isPending}
              >
                {editingResource ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The resource will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
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

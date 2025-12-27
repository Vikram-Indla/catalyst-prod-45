import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, GripVertical, Trash2, Save } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
import {
  useThemeStatuses,
  useCreateThemeStatus,
  useUpdateThemeStatus,
  useToggleThemeStatus,
  useDeleteThemeStatus,
  ThemeStatus,
} from '@/hooks/useThemeStatuses';
import { BrandColorPicker, getBrandColorHex } from '@/components/admin/BrandColorPicker';

export default function ThemeStatuses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ThemeStatus | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });
  const [deleteStatus, setDeleteStatus] = useState<ThemeStatus | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: statuses = [], isLoading } = useThemeStatuses();
  const createMutation = useCreateThemeStatus();
  const updateMutation = useUpdateThemeStatus();
  const toggleMutation = useToggleThemeStatus();
  const deleteMutation = useDeleteThemeStatus();

  const filteredStatuses = statuses.filter(status =>
    status.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    status.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.label.trim()) return;

    if (editingStatus) {
      await updateMutation.mutateAsync({
        id: editingStatus.id,
        label: formData.label.trim(),
      });
    } else {
      await createMutation.mutateAsync({
        value: formData.value.trim() || formData.label.trim().toLowerCase().replace(/\s+/g, '_'),
        label: formData.label.trim(),
        sort_order: statuses.length + 1,
      });
    }

    setFormData({ value: '', label: '' });
    setEditingStatus(null);
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (status: ThemeStatus) => {
    await toggleMutation.mutateAsync({ id: status.id, is_active: status.is_active });
  };

  const handleDelete = async () => {
    if (!deleteStatus) return;
    await deleteMutation.mutateAsync(deleteStatus.id);
    setDeleteStatus(null);
    setIsDeleteDialogOpen(false);
  };

  const handleColorChange = (statusId: string, newColor: string) => {
    setPendingColors(prev => ({ ...prev, [statusId]: newColor }));
  };

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(pendingColors).some(statusId => {
      const status = statuses.find(s => s.id === statusId);
      return status && pendingColors[statusId] !== status.color;
    });
  }, [pendingColors, statuses]);

  const handleSaveSettings = async () => {
    const changedStatuses = Object.entries(pendingColors).filter(([statusId, color]) => {
      const status = statuses.find(s => s.id === statusId);
      return status && color !== status.color;
    });

    if (changedStatuses.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        changedStatuses.map(([statusId, color]) =>
          updateMutation.mutateAsync({ id: statusId, color })
        )
      );
      setPendingColors({});
      toast.success('Color settings saved and applied across the application');
    } catch (error) {
      toast.error('Failed to save color settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayColor = (status: ThemeStatus) => {
    return pendingColors[status.id] ?? status.color ?? 'neutral';
  };

  const openEditDialog = (status: ThemeStatus) => {
    setEditingStatus(status);
    setFormData({ value: status.value, label: status.label });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStatus(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (status: ThemeStatus) => {
    setDeleteStatus(status);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Status</h1>
            <p className="text-muted-foreground mt-2">
              Manage status options for Strategic Themes
            </p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-primary-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Theme Status
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statuses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statuses.filter(s => s.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statuses.filter(s => !s.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Theme Status Configuration</CardTitle>
            <CardDescription>
              Configure statuses that appear in Strategic Theme dropdowns and tables. Select colors and click "Save Settings" to apply changes across the entire application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search theme statuses..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover"
                onClick={handleSaveSettings}
                disabled={!hasUnsavedChanges || isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium">Color</th>
                    <th className="text-left p-3 text-sm font-medium">Label</th>
                    <th className="text-left p-3 text-sm font-medium">Value (Key)</th>
                    <th className="text-left p-3 text-sm font-medium">Order</th>
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
                  ) : filteredStatuses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-muted-foreground">
                        No theme statuses found
                      </td>
                    </tr>
                  ) : (
                    filteredStatuses.map((status) => (
                      <tr key={status.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <BrandColorPicker
                              value={getDisplayColor(status)}
                              onChange={(color) => handleColorChange(status.id, color)}
                            />
                            <span 
                              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded text-white"
                              style={{ backgroundColor: getBrandColorHex(getDisplayColor(status)) }}
                            >
                              {status.label}
                            </span>
                            {pendingColors[status.id] && pendingColors[status.id] !== status.color && (
                              <span className="text-xs text-amber-600 font-medium">• Unsaved</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">{status.label}</td>
                        <td className="p-3 text-sm text-muted-foreground font-mono">{status.value}</td>
                        <td className="p-3 text-sm text-muted-foreground">{status.sort_order}</td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={status.is_active}
                            onCheckedChange={() => handleToggleActive(status)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(status)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openDeleteDialog(status)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Edit/Add Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? 'Edit Theme Status' : 'Add Theme Status'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Display Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., In Review"
                />
              </div>
              {!editingStatus && (
                <div className="space-y-2">
                  <Label htmlFor="value">Value (Key)</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g., in_review (auto-generated if empty)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used internally as the database value. Auto-generated from label if left empty.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover"
                onClick={handleSave}
                disabled={!formData.label.trim()}
              >
                {editingStatus ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Theme Status</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteStatus?.label}"? This action cannot be undone.
                Themes using this status will need to be updated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
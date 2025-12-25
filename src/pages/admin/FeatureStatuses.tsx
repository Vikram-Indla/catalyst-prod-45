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
import { Label } from '@/components/ui/label';
import {
  useFeatureStatuses,
  useCreateFeatureStatus,
  useUpdateFeatureStatus,
  useToggleFeatureStatus,
  FeatureStatus,
} from '@/hooks/useFeatureStatuses';
import { DeleteFeatureStatusDialog } from '@/components/admin/DeleteFeatureStatusDialog';
import { BrandColorPicker, getBrandColorHex } from '@/components/admin/BrandColorPicker';

export default function FeatureStatuses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<FeatureStatus | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });
  const [deleteStatus, setDeleteStatus] = useState<FeatureStatus | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: statuses = [], isLoading } = useFeatureStatuses();
  const createMutation = useCreateFeatureStatus();
  const updateMutation = useUpdateFeatureStatus();
  const toggleMutation = useToggleFeatureStatus();

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

  const handleToggleActive = async (status: FeatureStatus) => {
    await toggleMutation.mutateAsync({ id: status.id, is_active: status.is_active });
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

  const getDisplayColor = (status: FeatureStatus) => {
    return pendingColors[status.id] ?? status.color;
  };

  const openEditDialog = (status: FeatureStatus) => {
    setEditingStatus(status);
    setFormData({ value: status.value, label: status.label });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStatus(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (status: FeatureStatus) => {
    setDeleteStatus(status);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feature Status</h1>
            <p className="text-muted-foreground mt-2">
              Manage status options for Features across Catalyst
            </p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-primary-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature Status
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
            <CardTitle>Feature Status Configuration</CardTitle>
            <CardDescription>
              Configure statuses that appear in Feature dropdowns and boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feature statuses..."
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
                        No feature statuses found
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
                {editingStatus ? 'Edit Feature Status' : 'Add Feature Status'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Display Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., In Progress"
                />
              </div>
              {!editingStatus && (
                <div className="space-y-2">
                  <Label htmlFor="value">Value (Key)</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g., in_progress (auto-generated if empty)"
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
        <DeleteFeatureStatusDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          status={deleteStatus}
          allStatuses={statuses}
        />
      </div>
    </AdminGuard>
  );
}

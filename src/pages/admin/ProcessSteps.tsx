import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, GripVertical, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
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
  useDemandProcessSteps,
  useCreateDemandProcessStep,
  useUpdateDemandProcessStep,
  useToggleDemandProcessStep,
  DemandProcessStep,
} from '@/hooks/useDemandProcessSteps';
import { DeleteProcessStepDialog } from '@/components/admin/DeleteProcessStepDialog';
import { BrandColorPicker, getBrandColorHex } from '@/components/admin/BrandColorPicker';

export default function ProcessSteps() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<DemandProcessStep | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });
  const [deleteStep, setDeleteStep] = useState<DemandProcessStep | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: steps = [], isLoading } = useDemandProcessSteps();
  const createMutation = useCreateDemandProcessStep();
  const updateMutation = useUpdateDemandProcessStep();
  const toggleMutation = useToggleDemandProcessStep();

  const filteredSteps = steps.filter(step =>
    step.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    step.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.label.trim()) return;

    if (editingStep) {
      await updateMutation.mutateAsync({
        id: editingStep.id,
        label: formData.label.trim(),
      });
    } else {
      await createMutation.mutateAsync({
        value: formData.value.trim() || formData.label.trim().toLowerCase().replace(/\s+/g, '_'),
        label: formData.label.trim(),
        sort_order: steps.length + 1,
      });
    }

    setFormData({ value: '', label: '' });
    setEditingStep(null);
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (step: DemandProcessStep) => {
    await toggleMutation.mutateAsync({ id: step.id, is_active: step.is_active });
  };

  const handleColorChange = (stepId: string, newColor: string) => {
    setPendingColors(prev => ({ ...prev, [stepId]: newColor }));
  };

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(pendingColors).some(stepId => {
      const step = steps.find(s => s.id === stepId);
      return step && pendingColors[stepId] !== step.color;
    });
  }, [pendingColors, steps]);

  const handleSaveSettings = async () => {
    const changedSteps = Object.entries(pendingColors).filter(([stepId, color]) => {
      const step = steps.find(s => s.id === stepId);
      return step && color !== step.color;
    });

    if (changedSteps.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(
        changedSteps.map(([stepId, color]) =>
          updateMutation.mutateAsync({ id: stepId, color })
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

  const getDisplayColor = (step: DemandProcessStep) => {
    return pendingColors[step.id] ?? step.color;
  };

  const openEditDialog = (step: DemandProcessStep) => {
    setEditingStep(step);
    setFormData({ value: step.value, label: step.label });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStep(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (step: DemandProcessStep) => {
    setDeleteStep(step);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BR Status</h1>
            <p className="text-muted-foreground mt-2">
              Manage status options for Business Requests
            </p>
          </div>
          <Button className="bg-brand-primary hover:bg-brand-primary-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add BR Status
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{steps.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {steps.filter(s => s.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {steps.filter(s => !s.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>BR Status Configuration</CardTitle>
            <CardDescription>
              Configure statuses that appear in Business Request dropdowns and Kanban boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BR statuses..."
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
                  ) : filteredSteps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-muted-foreground">
                        No BR statuses found
                      </td>
                    </tr>
                  ) : (
                    filteredSteps.map((step) => (
                      <tr key={step.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <BrandColorPicker
                              value={getDisplayColor(step)}
                              onChange={(color) => handleColorChange(step.id, color)}
                            />
                            <span 
                              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded text-white"
                              style={{ backgroundColor: getBrandColorHex(getDisplayColor(step)) }}
                            >
                              {step.label}
                            </span>
                            {pendingColors[step.id] && pendingColors[step.id] !== step.color && (
                              <span className="text-xs text-amber-600 font-medium">• Unsaved</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">{step.label}</td>
                        <td className="p-3 text-sm text-muted-foreground font-mono">{step.value}</td>
                        <td className="p-3 text-sm text-muted-foreground">{step.sort_order}</td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={step.is_active}
                            onCheckedChange={() => handleToggleActive(step)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(step)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openDeleteDialog(step)}
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
                {editingStep ? 'Edit BR Status' : 'Add BR Status'}
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
              {!editingStep && (
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
                {editingStep ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <DeleteProcessStepDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          step={deleteStep}
          allSteps={steps}
        />
      </div>
    </AdminGuard>
  );
}

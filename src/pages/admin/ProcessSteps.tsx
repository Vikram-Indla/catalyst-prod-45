import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';

import { useState, useMemo } from 'react';
import AddIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/admin/admin-dialog';
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>BR Status</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Manage status options for Business Requests
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={AddIcon}>
            Add BR Status
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Total Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{steps.length}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Active Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {steps.filter(s => s.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Inactive Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {steps.filter(s => !s.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>BR Status Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
              Configure statuses that appear in Business Request dropdowns and Kanban boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search BR statuses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
              <Button
                appearance="primary"
                onClick={handleSaveSettings}
                isDisabled={!hasUnsavedChanges || isSaving}
               iconBefore={CheckMarkIcon}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            <div style={{ border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Color</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Label</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Value (Key)</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Order</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Active</th>
                    <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredSteps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                        No BR statuses found
                      </td>
                    </tr>
                  ) : (
                    filteredSteps.map((step) => (
                      <tr
                        key={step.id}
                        style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)', background: hoveredRow === step.id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
                        onMouseEnter={() => setHoveredRow(step.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="p-3">
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}><DragHandlerIcon label="" size="small" /></span>
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
                        <td className="p-3 text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{step.label}</td>
                        <td className="p-3 text-sm font-mono" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>{step.value}</td>
                        <td className="p-3 text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>{step.sort_order}</td>
                        <td className="p-3 text-sm">
                          <Toggle
                            isChecked={step.is_active}
                            onChange={() => handleToggleActive(step)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button appearance="subtle" onClick={() => openEditDialog(step)}>
                              <EditIcon label="" size="small" />
                            </Button>
                            <Button
                              appearance="subtle"
                              onClick={() => openDeleteDialog(step)}
                            >
                              <span style={{ display: 'inline-flex', color: 'var(--ds-icon-danger, #CA3521)' }}><TrashIcon label="" size="small" /></span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
                <label htmlFor="label" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Display Label</label>
                <Textfield
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., In Review"
                />
              </div>
              {!editingStep && (
                <div className="space-y-2">
                  <label htmlFor="value" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Value (Key)</label>
                  <Textfield
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: (e.target as HTMLInputElement).value }))}
                    placeholder="e.g., in_review (auto-generated if empty)"
                  />
                  <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))' }}>
                    Used internally as the database value. Auto-generated from label if left empty.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button appearance="subtle" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleSave}
                isDisabled={!formData.label.trim()}
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

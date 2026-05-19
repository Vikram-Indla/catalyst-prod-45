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
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 653, color: "var(--ds-text, #292A2E)", margin: 0, lineHeight: "28px" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>BR Status</h1>
            <p style={{ marginTop: 8 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
              Manage status options for Business Requests
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={AddIcon}>
            Add BR Status
          </Button>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Total Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{steps.length}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Active Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {steps.filter(s => s.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Inactive Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {steps.filter(s => !s.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 653, color: "var(--ds-text, #292A2E)", margin: 0 }}>BR Status Configuration</h2>
            <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
              Configure statuses that appear in Business Request dropdowns and Kanban boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><SearchIcon label="" size="small" /></span>
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
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)", width: 40 }}></th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Color</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Label</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Value (Key)</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Order</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Active</th>
                    <th style={{ textAlign: "right", padding: 12, fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 12, textAlign: "center" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredSteps.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 12, textAlign: "center" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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
                        <td style={{ padding: 12 }}>
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><DragHandlerIcon label="" size="small" /></span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <BrandColorPicker
                              value={getDisplayColor(step)}
                              onChange={(color) => handleColorChange(step.id, color)}
                            />
                            <span
                              style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", fontSize: 12, fontWeight: 500, borderRadius: 3, color: "var(--ds-text-inverse, #FFFFFF)" }}
                              style={{ backgroundColor: getBrandColorHex(getDisplayColor(step)) }}
                            >
                              {step.label}
                            </span>
                            {pendingColors[step.id] && pendingColors[step.id] !== step.color && (
                              <span style={{ fontSize: 12, color: "var(--ds-text-warning, #946F00)", fontWeight: 500 }}>• Unsaved</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 12, fontSize: 14, fontWeight: 500 }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{step.label}</td>
                        <td style={{ padding: 12, fontSize: 14, fontFamily: "ui-monospace, monospace" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>{step.value}</td>
                        <td style={{ padding: 12, fontSize: 14 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>{step.sort_order}</td>
                        <td style={{ padding: 12, fontSize: 14 }}>
                          <Toggle
                            isChecked={step.is_active}
                            onChange={() => handleToggleActive(step)}
                          />
                        </td>
                        <td style={{ padding: 12, fontSize: 14, textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="label" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Display Label</label>
                <Textfield
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., In Review"
                />
              </div>
              {!editingStep && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="value" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Value (Key)</label>
                  <Textfield
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: (e.target as HTMLInputElement).value }))}
                    placeholder="e.g., in_review (auto-generated if empty)"
                  />
                  <p style={{ fontSize: 12, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
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

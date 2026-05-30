import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import AddIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { useState, useMemo } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/admin/admin-dialog';
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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
      catalystToast.info('No changes to save');
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
      catalystToast.success('Color settings saved and applied across the application');
    } catch (error) {
      catalystToast.error('Failed to save color settings');
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
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 653, color: "var(--ds-text, #292A2E)", margin: 0, lineHeight: "28px" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Feature Status</h1>
            <p style={{ marginTop: 8 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
              Manage status options for Features across Catalyst
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={AddIcon}>
            Add Feature Status
          </Button>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Total Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{statuses.length}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Active Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {statuses.filter(s => s.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Inactive Statuses</p>
            </div>
            <div style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>
              {statuses.filter(s => !s.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 653, color: "var(--ds-text, #292A2E)", margin: 0 }}>Feature Status Configuration</h2>
            <p style={{ fontSize: 14, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
              Configure statuses that appear in Feature dropdowns and boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search feature statuses..."
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
                  ) : filteredStatuses.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 12, textAlign: "center" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                        No feature statuses found
                      </td>
                    </tr>
                  ) : (
                    filteredStatuses.map((status) => (
                      <tr
                        key={status.id}
                        style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)', background: hoveredRow === status.id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
                        onMouseEnter={() => setHoveredRow(status.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={{ padding: 12 }}>
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}><DragHandlerIcon label="" size="small" /></span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <BrandColorPicker
                              value={getDisplayColor(status)}
                              onChange={(color) => handleColorChange(status.id, color)}
                            />
                            <span
                              style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", fontSize: 12, fontWeight: 500, borderRadius: 3, color: "var(--ds-text-inverse, #FFFFFF)" }}
                              style={{ backgroundColor: getBrandColorHex(getDisplayColor(status)) }}
                            >
                              {status.label}
                            </span>
                            {pendingColors[status.id] && pendingColors[status.id] !== status.color && (
                              <span style={{ fontSize: 12, color: "var(--ds-text-warning, #946F00)", fontWeight: 500 }}>• Unsaved</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 12, fontSize: 14, fontWeight: 500 }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>{status.label}</td>
                        <td style={{ padding: 12, fontSize: 14, fontFamily: "ui-monospace, monospace" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>{status.value}</td>
                        <td style={{ padding: 12, fontSize: 14 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>{status.sort_order}</td>
                        <td style={{ padding: 12, fontSize: 14 }}>
                          <Toggle
                            isChecked={status.is_active}
                            onChange={() => handleToggleActive(status)}
                          />
                        </td>
                        <td style={{ padding: 12, fontSize: 14, textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            <Button appearance="subtle" onClick={() => openEditDialog(status)}>
                              <EditIcon label="" size="small" />
                            </Button>
                            <Button
                              appearance="subtle"
                              onClick={() => openDeleteDialog(status)}
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
                {editingStatus ? 'Edit Feature Status' : 'Add Feature Status'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="label" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Display Label</label>
                <Textfield
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., In Progress"
                />
              </div>
              {!editingStatus && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label htmlFor="value" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Value (Key)</label>
                  <Textfield
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: (e.target as HTMLInputElement).value }))}
                    placeholder="e.g., in_progress (auto-generated if empty)"
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

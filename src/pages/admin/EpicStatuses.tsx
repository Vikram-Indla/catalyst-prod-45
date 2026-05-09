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
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/admin/admin-dialog';
import {
  useEpicStatuses,
  useCreateEpicStatus,
  useUpdateEpicStatus,
  useToggleEpicStatus,
  EpicStatus,
} from '@/hooks/useEpicStatuses';
import { DeleteEpicStatusDialog } from '@/components/admin/DeleteEpicStatusDialog';
import { BrandColorPicker, getBrandColorHex } from '@/components/admin/BrandColorPicker';

export default function EpicStatuses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<EpicStatus | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });
  const [deleteStatus, setDeleteStatus] = useState<EpicStatus | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const { data: statuses = [], isLoading } = useEpicStatuses();
  const createMutation = useCreateEpicStatus();
  const updateMutation = useUpdateEpicStatus();
  const toggleMutation = useToggleEpicStatus();

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

  const handleToggleActive = async (status: EpicStatus) => {
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

  const getDisplayColor = (status: EpicStatus) => {
    return pendingColors[status.id] ?? status.color;
  };

  const openEditDialog = (status: EpicStatus) => {
    setEditingStatus(status);
    setFormData({ value: status.value, label: status.label });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingStatus(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (status: EpicStatus) => {
    setDeleteStatus(status);
    setIsDeleteDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ds-text, #172B4D)' }}>Epic Status</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Manage status options for Epics across Catalyst
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={<AddIcon label="" size="small" />}>
            Add Epic Status
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Total Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>{statuses.length}</div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Active Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>
              {statuses.filter(s => s.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Inactive Statuses</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>
              {statuses.filter(s => !s.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Epic Status Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Configure statuses that appear in Epic dropdowns and boards. Select colors and click "Save Settings" to apply changes across the entire application.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, #44546F)' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search epic statuses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
              <Button
                appearance="primary"
                onClick={handleSaveSettings}
                isDisabled={!hasUnsavedChanges || isSaving}
               iconBefore={<CheckMarkIcon label="" size="small" />}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>

            <div style={{ border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Color</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Label</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Value (Key)</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Order</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Active</th>
                    <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredStatuses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                        No epic statuses found
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
                        <td className="p-3">
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, #44546F)' }}><DragHandlerIcon label="" size="small" /></span>
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
                        <td className="p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>{status.label}</td>
                        <td className="p-3 text-sm font-mono" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>{status.value}</td>
                        <td className="p-3 text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>{status.sort_order}</td>
                        <td className="p-3 text-sm">
                          <Toggle
                            isChecked={status.is_active}
                            onChange={() => handleToggleActive(status)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-1">
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
                {editingStatus ? 'Edit Epic Status' : 'Add Epic Status'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="label" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Display Label</label>
                <Textfield
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., In Progress"
                />
              </div>
              {!editingStatus && (
                <div className="space-y-2">
                  <label htmlFor="value" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Value (Key)</label>
                  <Textfield
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: (e.target as HTMLInputElement).value }))}
                    placeholder="e.g., in_progress (auto-generated if empty)"
                  />
                  <p className="text-xs" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
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
        <DeleteEpicStatusDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          status={deleteStatus}
          allStatuses={statuses}
        />
      </div>
    </AdminGuard>
  );
}

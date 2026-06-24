// @ts-nocheck
import { useState } from 'react';
import { useCapacityDepartments, type CapacityDepartment } from '@/modules/capacity-planner/hooks/useCapacityDepartments';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/admin/admin-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/admin/admin-alert-dialog';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import WarningIcon from '@atlaskit/icon/core/warning';
import CopyIcon from '@atlaskit/icon/core/copy';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { Tooltip } from '@/components/ads';
import { AdminGuard } from '@/components/admin/AdminGuard';

interface LinkedResource {
  id: string;
  full_name: string;
}

export default function CapacityDepartmentsPage() {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useCapacityDepartments();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<CapacityDepartment | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<CapacityDepartment | null>(null);
  const [linkedResources, setLinkedResources] = useState<LinkedResource[]>([]);
  const [checkingLinks, setCheckingLinks] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createDepartment.mutateAsync({ name: formData.name });
    setFormData({ name: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingDepartment || !formData.name.trim()) return;
    await updateDepartment.mutateAsync({
      id: editingDepartment.id,
      updates: { name: formData.name },
    });
    setEditingDepartment(null);
    setFormData({ name: '' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    catalystToast.success(`Copied ${text} to clipboard`);
  };

  const checkLinkedRecords = async (departmentId: string) => {
    setCheckingLinks(true);
    try {
      // Check profiles linked to this department
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('department_id', departmentId);

      if (error) throw error;
      return profiles || [];
    } catch (error) {
      console.error('Error checking linked records:', error);
      catalystToast.error('Failed to check linked records');
      return [];
    } finally {
      setCheckingLinks(false);
    }
  };

  const handleDeleteClick = async (dept: CapacityDepartment) => {
    setDepartmentToDelete(dept);
    const linked = await checkLinkedRecords(dept.id);
    setLinkedResources(linked);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!departmentToDelete || linkedResources.length > 0) return;
    
    await deleteDepartment.mutateAsync(departmentToDelete.id);
    setDeleteModalOpen(false);
    setDepartmentToDelete(null);
    setLinkedResources([]);
  };

  const openEdit = (dept: CapacityDepartment) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-pulse">
          <div style={{ height: 32, borderRadius: 3, width: 192, background: 'var(--ds-background-neutral, #F7F8F9)' }} />
          <div style={{ height: 128, borderRadius: 3, background: 'var(--ds-background-neutral, #F7F8F9)' }} />
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 653, color: "var(--ds-text, #292A2E)" }}>Resource Departments</h1>
          <p style={{ fontSize: 14, marginTop: 4, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
            Configure departments for resource management. Changes sync in real-time.
          </p>
        </div>
        <Button
          appearance="primary"
          onClick={() => setCreateModalOpen(true)}
          iconBefore={AddIcon}
        >
          Add Department
        </Button>
      </div>

      {/* Departments List */}
      <div style={{ borderRadius: 8, overflow: "hidden", background: 'var(--ds-surface, #ffffff)', border: '1px solid var(--ds-border, #DCDFE4)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
              <tr>
                <th style={{ width: 40, padding: "8px 16px" }}></th>
                <th style={{ textAlign: "left", padding: "8px 16px", fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)", width: 96, borderBottom: "1.67px solid var(--ds-text, rgba(11, 18, 14, 0.14))" }}>DID</th>
                <th style={{ textAlign: "left", padding: "8px 16px", fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)", borderBottom: "1.67px solid var(--ds-text, rgba(11, 18, 14, 0.14))" }}>Name</th>
                <th style={{ textAlign: "center", padding: "8px 16px", fontSize: 12, fontWeight: 653, color: "var(--ds-text-subtle, #505258)", borderBottom: "1.67px solid var(--ds-text, rgba(11, 18, 14, 0.14))" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: "12px 16px", color: 'var(--ds-text-subtle, #44546F)' }}>
                    <span style={{ display: 'inline-flex', cursor: 'grab' }}><DragHandlerIcon label="" size="small" /></span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontFamily: 'var(--ds-font-family-code)', fontWeight: 500, color: 'var(--ds-text-brand, #0C66E4)' }}>{dept.department_id}</span>
                      <Tooltip content="Copy DID">
                        <button
                          onClick={() => copyToClipboard(dept.department_id)}
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                          style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))'; }}
                        >
                          <CopyIcon label="" size="small" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ds-text, #292A2E)" }}>{dept.name}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <button
                        onClick={() => openEdit(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))'; }}
                      >
                        <EditIcon label="" size="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(202,53,33,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-icon-danger, #CA3521)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))'; }}
                      >
                        <TrashIcon label="" size="small" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "32px 16px", textAlign: "center", color: 'var(--ds-text-subtle, #44546F)' }}>
                    No departments configured. Click "Add Department" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Name *</label>
              <Textfield
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleCreate}
              isDisabled={createDepartment.isPending}
            >
              {createDepartment.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingDepartment !== null} onOpenChange={(open) => !open && setEditingDepartment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Name *</label>
              <Textfield
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: (e.target as HTMLInputElement).value }))}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button appearance="subtle" onClick={() => setEditingDepartment(null)}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleUpdate}
              isDisabled={updateDepartment.isPending}
            >
              {updateDepartment.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {linkedResources.length > 0 ? (
                <>
                  <span style={{ display: 'inline-flex', color: 'var(--ds-icon-warning, #F79009)' }}><WarningIcon label="" size="medium" /></span>
                  Cannot Delete Department
                </>
              ) : (
                'Delete Department'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {checkingLinks ? (
                  <p>Checking for linked records...</p>
                ) : linkedResources.length > 0 ? (
                  <div className="space-y-3">
                    <p>
                      The department <strong>"{departmentToDelete?.name}"</strong> cannot be deleted because it has {linkedResources.length} linked resource(s):
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-md divide-y" style={{ border: '1px solid var(--ds-border, #DCDFE4)', borderColor: 'var(--ds-border, #DCDFE4)' }}>
                      {linkedResources.map((resource) => (
                        <div key={resource.id} className="px-3 py-2 text-sm">
                          {resource.full_name || 'Unnamed Resource'}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
                      Please reassign or remove these resources before deleting this department.
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete <strong>"{departmentToDelete?.name}"</strong>? This action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {linkedResources.length === 0 && !checkingLinks && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                style={{ background: 'var(--ds-background-danger-bold, #CA3521)', color: 'var(--ds-surface, #FFFFFF)' }}
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminGuard>
  );
}

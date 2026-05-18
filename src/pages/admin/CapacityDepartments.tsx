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
import { toast } from 'sonner';
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
    toast.success(`Copied ${text} to clipboard`);
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
      toast.error('Failed to check linked records');
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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded w-48" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }} />
          <div className="h-32 rounded" style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }} />
        </div>
      </div>
    );
  }

  return (
    <AdminGuard>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Resource Departments</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
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
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)' }}>
          <table className="w-full">
            <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase w-24" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>DID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Name</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold uppercase" style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                    <span style={{ display: 'inline-flex', cursor: 'grab' }}><DragHandlerIcon label="" size="small" /></span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium" style={{ color: 'var(--ds-text-brand, #0C66E4)' }}>{dept.department_id}</span>
                      <Tooltip content="Copy DID">
                        <button
                          onClick={() => copyToClipboard(dept.department_id)}
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                          style={{ color: 'var(--ds-text-subtle, #44546F)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, #172B4D))'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #44546F)'; }}
                        >
                          <CopyIcon label="" size="small" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>{dept.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--ds-text-subtle, #44546F)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #F1F2F4)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text, var(--cp-text-primary, #172B4D))'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #44546F)'; }}
                      >
                        <EditIcon label="" size="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(dept)}
                        className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--ds-text-subtle, #44546F)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(202,53,33,0.1)'; (e.currentTarget as HTMLElement).style.color = 'var(--ds-icon-danger, #CA3521)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--ds-text-subtle, #44546F)'; }}
                      >
                        <TrashIcon label="" size="small" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Name *</label>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>Name *</label>
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
            <AlertDialogTitle className="flex items-center gap-2">
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
                    <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
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
                style={{ background: 'var(--ds-background-danger-bold, #CA3521)', color: '#FFFFFF' }}
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

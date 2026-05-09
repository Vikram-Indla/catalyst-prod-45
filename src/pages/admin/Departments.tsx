import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import AddIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import { useState } from 'react';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/admin/admin-dialog';

export default function Departments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<{ id: string; name: string } | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useDepartments();

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return;

    const { error } = await supabase
      .from('departments')
      .insert({ name: newDepartmentName.trim() });

    if (error) {
      toast.error('Failed to add department');
      return;
    }

    toast.success('Department added');
    setNewDepartmentName('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !newDepartmentName.trim()) return;

    const { error } = await supabase
      .from('departments')
      .update({ name: newDepartmentName.trim() })
      .eq('id', editingDepartment.id);

    if (error) {
      toast.error('Failed to update department');
      return;
    }

    toast.success('Department updated');
    setEditingDepartment(null);
    setNewDepartmentName('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }

    toast.success(`Department ${!currentStatus ? 'enabled' : 'disabled'}`);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const openEditDialog = (dept: { id: string; name: string }) => {
    setEditingDepartment(dept);
    setNewDepartmentName(dept.name);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingDepartment(null);
    setNewDepartmentName('');
    setIsDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ds-text, #172B4D)' }}>Departments</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Manage department list for Business Requests
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={<AddIcon label="" size="small" />}>
            Add Department
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Total Departments</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>{departments.length}</div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Active Departments</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>
              {departments.filter(d => d.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Inactive Departments</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>
              {departments.filter(d => !d.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Department Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Configure departments for Business Requests. Each department maps to a Business Owner.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, #44546F)' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div style={{ border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--ds-background-neutral, #F7F8F9)' }}>
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium w-[80px]" style={{ color: 'var(--ds-text, #172B4D)' }}>D-ID</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Department Name</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Status</th>
                    <th className="text-right p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                        No departments found
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr
                        key={dept.id}
                        style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)', background: hoveredRow === dept.id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
                        onMouseEnter={() => setHoveredRow(dept.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="p-3">
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, #44546F)' }}><DragHandlerIcon label="" size="small" /></span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-mono font-medium" style={{ color: 'var(--ds-text-brand, #0C66E4)' }}>{dept.department_code || '—'}</span>
                        </td>
                        <td className="p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>{dept.name}</td>
                        <td className="p-3 text-sm">
                          <Toggle
                            isChecked={dept.is_active ?? true}
                            onChange={() => handleToggleActive(dept.id, dept.is_active ?? true)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button appearance="subtle" onClick={() => openEditDialog(dept)}>
                            <EditIcon label="" size="small" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Department Name</label>
                <Textfield
                  id="name"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName((e.target as HTMLInputElement).value)}
                  placeholder="Enter department name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button appearance="subtle" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={editingDepartment ? handleUpdateDepartment : handleAddDepartment}
              >
                {editingDepartment ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}

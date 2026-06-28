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
import { catalystToast } from '@/lib/catalystToast';
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
      catalystToast.error('Failed to add department');
      return;
    }

    catalystToast.success('Department added');
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
      catalystToast.error('Failed to update department');
      return;
    }

    catalystToast.success('Department updated');
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
      catalystToast.error('Failed to update status');
      return;
    }

    catalystToast.success(`Department ${!currentStatus ? 'enabled' : 'disabled'}`);
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
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', margin: 0, lineHeight: "28px" }}>Departments</h1>
            <p style={{ marginTop: 8, color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
              Manage department list for Business Requests
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={AddIcon}>
            Add Department
          </Button>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Total Departments</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{departments.length}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Active Departments</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>
              {departments.filter(d => d.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Inactive Departments</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>
              {departments.filter(d => !d.is_active).length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Department Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
              Configure departments for Business Requests. Each department maps to a Business Owner.
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div style={{ border: '1px solid var(--ds-border)', borderRadius: '3px' }}>
              <table className="w-full">
                <thead style={{ background: 'var(--ds-background-neutral)' }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: "var(--ds-text-subtle)", width: 40 }}></th>
                    <th className="text-left p-3 text-sm font-medium w-[80px]" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>D-ID</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Department Name</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Status</th>
                    <th style={{ textAlign: "right", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, textAlign: "center", color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, textAlign: "center", color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
                        No departments found
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr
                        key={dept.id}
                        style={{ borderTop: '1px solid var(--ds-border)', background: hoveredRow === dept.id ? 'var(--ds-background-neutral-hovered)' : 'transparent' }}
                        onMouseEnter={() => setHoveredRow(dept.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={{ padding: 12 }}>
                          <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}><DragHandlerIcon label="" size="small" /></span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span className="text-sm font-mono font-medium" style={{ color: 'var(--ds-text-brand)' }}>{dept.department_code || '—'}</span>
                        </td>
                        <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{dept.name}</td>
                        <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)' }}>
                          <Toggle
                            isChecked={dept.is_active ?? true}
                            onChange={() => handleToggleActive(dept.id, dept.is_active ?? true)}
                          />
                        </td>
                        <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)', textAlign: "right" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="name" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Department Name</label>
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

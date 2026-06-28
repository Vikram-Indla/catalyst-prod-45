/**
 * ⚠️ DEPRECATED (Phase -1 Cleanup, 2026-06-20)
 * This page is soft-deprecated via router redirect to /admin/access.
 * Hard removal scheduled after 1-release grace period (2026-08-20).
 * Reexport: BusinessOwnersContent from @/components/admin/BusinessOwnersContent
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import AdsSelect from '@atlaskit/select';
import AddIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import { useState } from 'react';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings } from '@/hooks/useDepartmentsAndOwners';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/admin/admin-dialog';

export default function BusinessOwners() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<{ id: string; name: string } | null>(null);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: owners = [], isLoading } = useBusinessOwners();
  const { data: departments = [] } = useDepartments();
  const { data: mappings = [] } = useDepartmentOwnerMappings();

  const filteredOwners = owners.filter(owner =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDepartmentForOwner = (ownerId: string) => {
    const mapping = mappings.find(m => m.owner_id === ownerId);
    if (!mapping) return null;
    return departments.find(d => d.id === mapping.department_id);
  };

  const handleAddOwner = async () => {
    if (!newOwnerName.trim()) return;

    const { data: newOwner, error: ownerError } = await typedQuery('business_owners')
      .insert({ name: newOwnerName.trim() })
      .select()
      .single();
    const newOwnerTyped = newOwner as { id: string } | null;

    if (ownerError || !newOwnerTyped) {
      catalystToast.error('Failed to add business owner');
      return;
    }

    // Create department mapping if department selected
    if (selectedDepartmentId) {
      // First remove any existing mapping for this department
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('department_id', selectedDepartmentId);

      const { error: mappingError } = await supabase
        .from('department_owner_mapping')
        .insert({
          department_id: selectedDepartmentId,
          owner_id: newOwnerTyped.id
        });

      if (mappingError) {
        catalystToast.error('Failed to create department mapping');
      }
    }

    catalystToast.success('Business Owner added');
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
    queryClient.invalidateQueries({ queryKey: ['department-owner-mapping'] });
  };

  const handleUpdateOwner = async () => {
    if (!editingOwner || !newOwnerName.trim()) return;

    const { error: ownerError } = await typedQuery('business_owners')
      .update({ name: newOwnerName.trim() })
      .eq('id', editingOwner.id);

    if (ownerError) {
      catalystToast.error('Failed to update business owner');
      return;
    }

    // Update department mapping
    if (selectedDepartmentId) {
      // Remove old mapping for this owner
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('owner_id', editingOwner.id);

      // Remove any existing mapping for the new department
      await supabase
        .from('department_owner_mapping')
        .delete()
        .eq('department_id', selectedDepartmentId);

      // Create new mapping
      const { error: mappingError } = await supabase
        .from('department_owner_mapping')
        .insert({
          department_id: selectedDepartmentId,
          owner_id: editingOwner.id
        });

      if (mappingError) {
        catalystToast.error('Failed to update department mapping');
      }
    }

    catalystToast.success('Business Owner updated');
    setEditingOwner(null);
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
    queryClient.invalidateQueries({ queryKey: ['department-owner-mapping'] });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await typedQuery('business_owners')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      catalystToast.error('Failed to update status');
      return;
    }

    catalystToast.success(`Business Owner ${!currentStatus ? 'enabled' : 'disabled'}`);
    queryClient.invalidateQueries({ queryKey: ['business-owners'] });
  };

  const openEditDialog = (owner: { id: string; name: string }) => {
    setEditingOwner(owner);
    setNewOwnerName(owner.name);
    const mapping = mappings.find(m => m.owner_id === owner.id);
    setSelectedDepartmentId(mapping?.department_id || '');
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingOwner(null);
    setNewOwnerName('');
    setSelectedDepartmentId('');
    setIsDialogOpen(true);
  };

  const departmentOptions = departments
    .filter(d => d.is_active)
    .map(dept => ({ label: dept.name, value: dept.id }));

  return (
    <AdminGuard>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: "var(--ds-text)", margin: 0, lineHeight: "28px" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Business Owners</h1>
            <p style={{ marginTop: 8 }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
              Manage business owners and their department mappings
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog} iconBefore={AddIcon}>
            Add Business Owner
          </Button>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Total Business Owners</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{owners.length}</div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Active Owners</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>
              {owners.filter(o => o.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 }}>
              <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Mapped to Departments</p>
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 653, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{mappings.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: '1px solid var(--ds-border)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: "var(--ds-text)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Business Owner Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
              Configure business owners and their 1:1 department mappings. When a department is selected in a Business Request, the mapped owner is auto-assigned.
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: 'absolute', left: 12, top: '48%', transform: 'translateY(-50%)', display: 'flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}><SearchIcon label="" size="small" /></span>
                <Textfield
                  placeholder="Search business owners..."
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
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: "var(--ds-text-subtle)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Business Owner</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: "var(--ds-text-subtle)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Mapped Department</th>
                    <th style={{ textAlign: "left", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: "var(--ds-text-subtle)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Status</th>
                    <th style={{ textAlign: "right", padding: 12, fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: "var(--ds-text-subtle)" }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, textAlign: "center" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredOwners.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 12, textAlign: "center" }} style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
                        No business owners found
                      </td>
                    </tr>
                  ) : (
                    filteredOwners.map((owner) => {
                      const dept = getDepartmentForOwner(owner.id);
                      return (
                        <tr
                          key={owner.id}
                          style={{ borderTop: '1px solid var(--ds-border)', background: hoveredRow === owner.id ? 'var(--ds-background-neutral-hovered)' : 'transparent' }}
                          onMouseEnter={() => setHoveredRow(owner.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td style={{ padding: 12 }}>
                            <span style={{ cursor: 'grab', display: 'inline-flex', color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}><DragHandlerIcon label="" size="small" /></span>
                          </td>
                          <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)', fontWeight: 500 }} style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>{owner.name}</td>
                          <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)' }}>
                            {dept ? (
                              <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 16, fontSize: 'var(--ds-font-size-200)' }} style={{ background: 'var(--ds-background-brand-subtler)', color: 'var(--ds-text-brand)' }}>
                                {dept.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>Not mapped</span>
                            )}
                          </td>
                          <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)' }}>
                            <Toggle
                              isChecked={owner.is_active ?? true}
                              onChange={() => handleToggleActive(owner.id, owner.is_active ?? true)}
                            />
                          </td>
                          <td style={{ padding: 12, fontSize: 'var(--ds-font-size-400)', textAlign: "right" }}>
                            <Button appearance="subtle" onClick={() => openEditDialog(owner)}>
                              <EditIcon label="" size="small" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
                {editingOwner ? 'Edit Business Owner' : 'Add Business Owner'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16, paddingBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="name" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Business Owner Name</label>
                <Textfield
                  id="name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName((e.target as HTMLInputElement).value)}
                  placeholder="Enter business owner name"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="department" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Mapped Department (1:1)</label>
                <AdsSelect
                  inputId="department"
                  options={departmentOptions}
                  value={departmentOptions.find(o => o.value === selectedDepartmentId) || null}
                  onChange={(opt) => opt && setSelectedDepartmentId(opt.value)}
                  placeholder="Select a department"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 400 }) }}
                />
                <p className="text-xs" style={{ color: 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary)))' }}>
                  Each department can only be mapped to one business owner.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button appearance="subtle" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={editingOwner ? handleUpdateOwner : handleAddOwner}
              >
                {editingOwner ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}

import { AdminGuard } from '@/components/admin/AdminGuard';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import AdsSelect from '@atlaskit/select';
import { Plus, Search, Edit, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useDepartments, useBusinessOwners, useDepartmentOwnerMappings } from '@/hooks/useDepartmentsAndOwners';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
      toast.error('Failed to add business owner');
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
        toast.error('Failed to create department mapping');
      }
    }

    toast.success('Business Owner added');
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
      toast.error('Failed to update business owner');
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
        toast.error('Failed to update department mapping');
      }
    }

    toast.success('Business Owner updated');
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
      toast.error('Failed to update status');
      return;
    }

    toast.success(`Business Owner ${!currentStatus ? 'enabled' : 'disabled'}`);
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ds-text, #172B4D)' }}>Business Owners</h1>
            <p className="mt-2" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Manage business owners and their department mappings
            </p>
          </div>
          <Button appearance="primary" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Business Owner
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Total Business Owners</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>{owners.length}</div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Active Owners</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>
              {owners.filter(o => o.is_active).length}
            </div>
          </div>
          <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Mapped to Departments</p>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--ds-text, #172B4D)' }}>{mappings.length}</div>
          </div>
        </div>

        <div style={{ background: 'var(--ds-surface, #FFFFFF)', border: '1px solid var(--ds-border, #DCDFE4)', borderRadius: '3px', padding: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 className="text-base font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Business Owner Configuration</h2>
            <p className="text-sm" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
              Configure business owners and their 1:1 department mappings. When a department is selected in a Business Request, the mapped owner is auto-assigned.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                <Textfield
                  placeholder="Search business owners..."
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
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Business Owner</th>
                    <th className="text-left p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>Mapped Department</th>
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
                  ) : filteredOwners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
                        No business owners found
                      </td>
                    </tr>
                  ) : (
                    filteredOwners.map((owner) => {
                      const dept = getDepartmentForOwner(owner.id);
                      return (
                        <tr
                          key={owner.id}
                          style={{ borderTop: '1px solid var(--ds-border, #DCDFE4)', background: hoveredRow === owner.id ? 'var(--ds-background-neutral-hovered, #F1F2F4)' : 'transparent' }}
                          onMouseEnter={() => setHoveredRow(owner.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="p-3">
                            <GripVertical className="h-4 w-4 cursor-grab" style={{ color: 'var(--ds-text-subtle, #44546F)' }} />
                          </td>
                          <td className="p-3 text-sm font-medium" style={{ color: 'var(--ds-text, #172B4D)' }}>{owner.name}</td>
                          <td className="p-3 text-sm">
                            {dept ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs" style={{ background: 'var(--ds-background-brand-subtler, #E9F2FF)', color: 'var(--ds-text-brand, #0C66E4)' }}>
                                {dept.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>Not mapped</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">
                            <Toggle
                              isChecked={owner.is_active ?? true}
                              onChange={() => handleToggleActive(owner.id, owner.is_active ?? true)}
                            />
                          </td>
                          <td className="p-3 text-sm text-right">
                            <Button appearance="subtle" onClick={() => openEditDialog(owner)}>
                              <Edit className="h-4 w-4" />
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Business Owner Name</label>
                <Textfield
                  id="name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName((e.target as HTMLInputElement).value)}
                  placeholder="Enter business owner name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="department" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Mapped Department (1:1)</label>
                <AdsSelect
                  inputId="department"
                  options={departmentOptions}
                  value={departmentOptions.find(o => o.value === selectedDepartmentId) || null}
                  onChange={(opt) => opt && setSelectedDepartmentId(opt.value)}
                  placeholder="Select a department"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 400 }) }}
                />
                <p className="text-xs" style={{ color: 'var(--ds-text-subtle, #44546F)' }}>
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

/**
 * UserDrawer - Ring-fenced drawer for Add/Edit User
 * Per LOVABLE-USERS-INVASIVE-REPLACEMENT spec
 */

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserProfile } from '@/hooks/useUsers';
import { X, Save, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserDrawerProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserDrawer({ isOpen, user, onClose, onSuccess }: UserDrawerProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!user;

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    job_role: '',
    resource_type: 'Variable',
    department_id: '',
    assignment_id: '',
    contract_start_date: '',
    contract_end_date: '',
    vendor_id: '',
    country_id: '',
    location_id: '',
    ctc: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch reference data
  const { data: departments = [] } = useQuery({
    queryKey: ['capacity-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .select('id, name, department_id')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name, assignment_id')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['resource-vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_vendors')
        .select('id, name, vendor_code')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['resource-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_countries')
        .select('id, name, code')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['resource-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_locations')
        .select('id, name')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch user's inventory record
  const { data: userInventory } = useQuery({
    queryKey: ['user-inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('resource_inventory')
        .select('*')
        .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      const dept = departments.find(d => d.name === user.department_name);
      const assign = assignments.find(a => a.name === user.assignment_name);
      const vendor = vendors.find(v => v.name === user.vendor);
      const country = countries.find(c => c.name === user.country);
      const location = locations.find(l => l.name === user.location);

      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        job_role: user.job_role || '',
        resource_type: user.resource_type || 'Variable',
        department_id: dept?.id || userInventory?.department_id || '',
        assignment_id: assign?.id || userInventory?.assignment_id || '',
        contract_start_date: user.contract_start_date ? format(new Date(user.contract_start_date), 'yyyy-MM-dd') : '',
        contract_end_date: user.contract_end_date ? format(new Date(user.contract_end_date), 'yyyy-MM-dd') : '',
        vendor_id: vendor?.id || userInventory?.vendor_id || '',
        country_id: country?.id || userInventory?.country_id || '',
        location_id: location?.id || userInventory?.location_id || '',
        ctc: user.ctc !== null && user.ctc !== undefined ? String(user.ctc) : '',
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        job_role: '',
        resource_type: 'Variable',
        department_id: '',
        assignment_id: '',
        contract_start_date: '',
        contract_end_date: '',
        vendor_id: '',
        country_id: '',
        location_id: '',
        ctc: '',
      });
    }
  }, [user, userInventory, departments, assignments, vendors, countries, locations]);

  // Resolve names from IDs
  const selectedDepartment = useMemo(() => 
    departments.find(d => d.id === formData.department_id), [departments, formData.department_id]);
  const selectedAssignment = useMemo(() => 
    assignments.find(a => a.id === formData.assignment_id), [assignments, formData.assignment_id]);
  const selectedVendor = useMemo(() => 
    vendors.find(v => v.id === formData.vendor_id), [vendors, formData.vendor_id]);
  const selectedCountry = useMemo(() => 
    countries.find(c => c.id === formData.country_id), [countries, formData.country_id]);
  const selectedLocation = useMemo(() => 
    locations.find(l => l.id === formData.location_id), [locations, formData.location_id]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save mutation
  const handleSave = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && user) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileRow?.id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name || null,
              email: formData.email.toLowerCase().trim() || null,
              vendor: selectedVendor?.name || null,
              location: selectedLocation?.name || null,
              country: selectedCountry?.name || null,
              country_code: selectedCountry?.code || null,
              contract_start_date: formData.contract_start_date || null,
              contract_end_date: formData.contract_end_date || null,
              resource_type: formData.resource_type || null,
              department_id: formData.department_id || null,
              ctc: formData.ctc ? parseFloat(formData.ctc) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (profileError) throw profileError;
        }

        const { data: inventoryRecord } = await supabase
          .from('resource_inventory')
          .select('id')
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();

        const inventoryPayload = {
          name: formData.full_name || null,
          vendor_id: formData.vendor_id || null,
          vendor_name: selectedVendor?.name || null,
          location_id: formData.location_id || null,
          country_id: formData.country_id || null,
          department_id: formData.department_id || null,
          department_name: selectedDepartment?.name || null,
          role_name: formData.job_role || null,
          assignment_id: formData.assignment_id || null,
          contract_start_date: formData.contract_start_date || null,
          contract_end_date: formData.contract_end_date || null,
          resource_type: formData.resource_type || null,
          ctc: formData.ctc ? parseFloat(formData.ctc) : null,
          updated_at: new Date().toISOString(),
        };

        if (inventoryRecord?.id) {
          const { error: invError } = await supabase
            .from('resource_inventory')
            .update(inventoryPayload)
            .eq('id', inventoryRecord.id);
          if (invError) throw invError;
        } else if (profileRow?.id) {
          const { error: insertError } = await supabase
            .from('resource_inventory')
            .insert({ ...inventoryPayload, profile_id: user.id, is_active: true });
          if (insertError) throw insertError;
        }

        toast.success('User updated successfully');
      } else {
        const { data: allInventory } = await supabase
          .from('resource_inventory')
          .select('rid')
          .order('rid', { ascending: false })
          .limit(1);
        
        const maxRid = allInventory?.[0]?.rid ? parseInt(allInventory[0].rid) : 0;
        const newRid = String(maxRid + 1).padStart(3, '0');

        const { error: insertError } = await supabase
          .from('resource_inventory')
          .insert({
            rid: newRid,
            name: formData.full_name || null,
            vendor_id: formData.vendor_id || null,
            vendor_name: selectedVendor?.name || null,
            location_id: formData.location_id || null,
            country_id: formData.country_id || null,
            department_id: formData.department_id || null,
            department_name: selectedDepartment?.name || null,
            role_name: formData.job_role || null,
            assignment_id: formData.assignment_id || null,
            contract_start_date: formData.contract_start_date || null,
            contract_end_date: formData.contract_end_date || null,
            resource_type: formData.resource_type || null,
            is_active: true,
          });

        if (insertError) throw insertError;
        toast.success('User created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      onSuccess();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete mutation
  const handleDelete = async () => {
    if (!user || !confirm('Are you sure you want to delete this user?')) return;

    setIsDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('resource_inventory').delete().or(`profile_id.eq.${user.id},id.eq.${user.id}`);

      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      onSuccess();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`um-drawer-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`um-drawer ${isOpen ? 'visible' : ''}`}>
        <div className="um-drawer-header">
          <div>
            <h2>{isEditMode ? 'Edit User' : 'Add New User'}</h2>
            <p>{isEditMode ? `Update profile for ${user?.full_name}` : 'Create a new resource'}</p>
          </div>
          <button className="um-drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="um-drawer-body">
          {/* Basic Information */}
          <div className="um-form-section">
            <div className="um-form-section-title">Basic Information</div>
            <div className="um-form-row full">
              <div className="um-form-group">
                <label>Full Name *</label>
                <input
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
            </div>
            <div className="um-form-row full">
              <div className="um-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Job Role</label>
                <input
                  value={formData.job_role}
                  onChange={(e) => handleChange('job_role', e.target.value)}
                  placeholder="e.g. Senior Developer"
                />
              </div>
              <div className="um-form-group">
                <label>Resource Type</label>
                <select
                  value={formData.resource_type}
                  onChange={(e) => handleChange('resource_type', e.target.value)}
                >
                  <option value="Variable">Variable</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="um-form-section">
            <div className="um-form-section-title">Organization</div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleChange('department_id', e.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="um-form-group">
                <label>DID</label>
                <input 
                  value={selectedDepartment?.department_id || '—'} 
                  disabled 
                />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Assignment</label>
                <select
                  value={formData.assignment_id}
                  onChange={(e) => handleChange('assignment_id', e.target.value)}
                >
                  <option value="">Select assignment</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="um-form-group">
                <label>AID</label>
                <input 
                  value={selectedAssignment?.assignment_id || '—'} 
                  disabled 
                />
              </div>
            </div>
          </div>

          {/* Contract */}
          <div className="um-form-section">
            <div className="um-form-section-title">Contract</div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => handleChange('contract_start_date', e.target.value)}
                />
              </div>
              <div className="um-form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => handleChange('contract_end_date', e.target.value)}
                />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Vendor</label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => handleChange('vendor_id', e.target.value)}
                >
                  <option value="">Select vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="um-form-group">
                <label>VID</label>
                <input 
                  value={selectedVendor?.vendor_code || '—'} 
                  disabled 
                />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group" style={{ flex: 1 }}>
                <label>CTC (Cost to Company)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--ct-text-muted)',
                    fontSize: '13px'
                  }}>ریال</span>
                  <input
                    type="number"
                    placeholder="Enter CTC amount"
                    value={formData.ctc}
                    onChange={(e) => handleChange('ctc', e.target.value)}
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="um-form-section">
            <div className="um-form-section-title">Location</div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label>Country</label>
                <select
                  value={formData.country_id}
                  onChange={(e) => handleChange('country_id', e.target.value)}
                >
                  <option value="">Select country</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="um-form-group">
                <label>Location Type</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => handleChange('location_id', e.target.value)}
                >
                  <option value="">Select location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="um-drawer-footer">
          {isEditMode && (
            <button 
              className="um-btn um-btn-danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="um-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="um-btn um-btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEditMode ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>

      <style>{drawerCSS}</style>
    </>
  );
}

// Drawer-specific CSS (ring-fenced)
const drawerCSS = `
/* Drawer Overlay */
.um-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}
.um-drawer-overlay.visible {
  opacity: 1;
  visibility: visible;
}

/* Drawer Panel */
.um-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 520px;
  max-width: 90vw;
  background: #ffffff;
  z-index: 101;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  box-shadow: -12px 0 40px rgba(0,0,0,0.15);
}
.um-drawer.visible {
  transform: translateX(0);
}

/* Drawer Header */
.um-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}
.um-drawer-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}
.um-drawer-header p {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}
.um-drawer-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f8fafc;
  cursor: pointer;
  border-radius: 8px;
  color: #94a3b8;
  transition: all 0.15s;
}
.um-drawer-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Drawer Body */
.um-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Drawer Footer */
.um-drawer-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* Form Sections */
.um-form-section {
  margin-bottom: 28px;
}
.um-form-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #2563eb;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}
.um-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.um-form-row.full {
  grid-template-columns: 1fr;
}
.um-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.um-form-group label {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}
.um-form-group input,
.um-form-group select {
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.15s;
  background: #ffffff;
  color: #0f172a;
}
.um-form-group input:focus,
.um-form-group select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}
.um-form-group input:disabled {
  background: rgba(37, 99, 235, 0.08);
  color: #94a3b8;
  border-color: transparent;
  cursor: not-allowed;
}

/* Button overrides for drawer */
.um-drawer .um-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 36px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s;
}
.um-drawer .um-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}
.um-drawer .um-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.um-drawer .um-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}
.um-drawer .um-btn-primary:hover {
  background: #1d4ed8;
}
.um-drawer .um-btn-danger {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}
.um-drawer .um-btn-danger:hover {
  background: #dc2626;
}
`;

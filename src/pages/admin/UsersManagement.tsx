/**
 * UsersManagement - V8 Implementation
 * Route: /admin/users
 * Based on: CATALYST V8 Unified Design System
 * Version: 2.0.0
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { UserDrawer } from './components/UserDrawer';
import { BulkEditModal } from './components/BulkEditModal';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Search, X, Download, Plus, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';

// V8 Components
import {
  UserAvatar,
  TypeBadge,
  LocationBadge,
  IdBadge,
  DateCell,
  StatCard,
  Dropdown,
  InlineEditCell,
  DepartmentRunRates,
  LicensesRunRateWidget
} from '@/components/users';

// V8 Styles
import '@/styles/users-module.css';

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useUsers();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const pageSize = 50;

  // Fetch reference data for bulk edit
  const { data: departments = [] } = useQuery({
    queryKey: ['capacity-departments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('capacity_departments')
        .select('id, name, department_id')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_assignments')
        .select('id, name, assignment_id')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      return data || [];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['resource-vendors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_vendors')
        .select('id, name, vendor_code')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      return data || [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['resource-countries'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_countries')
        .select('id, name, code')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['resource-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_locations')
        .select('id, name')
        .or('is_active.is.null,is_active.eq.true')
        .order('sort_order');
      return data || [];
    },
  });

  // Unique filter options from data
  const uniqueDepartments = useMemo(() => 
    [...new Set(users.map(u => u.department_name).filter(Boolean))].sort() as string[],
  [users]);
  
  const uniqueVendors = useMemo(() => 
    [...new Set(users.map(u => u.vendor).filter(Boolean))].sort() as string[],
  [users]);

  const uniqueAssignments = useMemo(() => 
    [...new Set(users.map(u => u.assignment_name).filter(Boolean))].sort() as string[],
  [users]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    variable: users.filter((u) => u.resource_type?.toLowerCase() === 'variable' || u.resource_type?.toLowerCase() === 'core').length,
    permanent: users.filter((u) => u.resource_type?.toLowerCase() === 'permanent').length,
    fixed: users.filter((u) => u.resource_type?.toLowerCase() === 'fixed').length,
    freelance: users.filter((u) => u.resource_type?.toLowerCase() === 'freelance').length
  }), [users]);

  // Filtered data
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (typeFilter !== 'all') {
        const userType = u.resource_type?.toLowerCase();
        // 'insourced' filter = Variable + Freelance (for department widgets)
        if (typeFilter === 'insourced') {
          if (userType !== 'variable' && userType !== 'freelance') return false;
        } else if (typeFilter === 'variable') {
          if (userType !== 'variable' && userType !== 'core') return false;
        } else if (userType !== typeFilter.toLowerCase()) return false;
      }
      if (searchQuery && !u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (deptFilter && u.department_name !== deptFilter) return false;
      if (assignmentFilter && u.assignment_name !== assignmentFilter) return false;
      if (vendorFilter && u.vendor !== vendorFilter) return false;
      return true;
    });
  }, [users, typeFilter, searchQuery, deptFilter, assignmentFilter, vendorFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  // Reset page when filters change
  const handleFilterChange = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  // Handlers
  const openDrawer = (user?: UserProfile) => {
    setEditingUser(user || null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingUser(null);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.size > 0 
      ? users.filter(u => selectedIds.has(u.id))
      : filteredUsers;
    
    const exportData = dataToExport.map((u) => ({
      RID: u.rid || '',
      Name: u.full_name || '',
      Email: u.email || '',
      'Job Role': u.job_role || '',
      DID: u.did || '',
      Department: u.department_name || '',
      AID: u.aid || '',
      Assignment: u.assignment_name || '',
      'Contract Start': u.contract_start_date || '',
      'Contract End': u.contract_end_date || '',
      VID: u.vid || '',
      Vendor: u.vendor || '',
      Type: u.resource_type || '',
      Country: u.country || '',
      Location: u.location || '',
      CTC: u.ctc || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    const filename = selectedIds.size > 0 
      ? `users-selected-${new Date().toISOString().split('T')[0]}.xlsx`
      : 'users-export.xlsx';
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${dataToExport.length} users`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('');
    setAssignmentFilter('');
    setVendorFilter('');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  // Select handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (userId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

  // Inline edit mutation
  const inlineUpdateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success('Updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update');
    }
  });

  const handleInlineSave = (userId: string, field: string, value: string) => {
    inlineUpdateMutation.mutate({ id: userId, field, value });
  };

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, string> }) => {
      // Fields that belong to resource_inventory vs profiles
      const inventoryFields = [
        'department_id', 'assignment_id', 'vendor_id', 
        'resource_type', 'country_id', 'location_id'
      ];
      const profileFields = ['full_name'];

      // Separate updates by table
      const inventoryUpdates: Record<string, string> = {};
      const profileUpdates: Record<string, string> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (inventoryFields.includes(key)) {
          inventoryUpdates[key] = value;
        } else if (profileFields.includes(key)) {
          profileUpdates[key] = value;
        }
      });

      // Update resource_inventory if needed
      if (Object.keys(inventoryUpdates).length > 0) {
        const { error: invError } = await (supabase as any)
          .from('resource_inventory')
          .update({ ...inventoryUpdates, updated_at: new Date().toISOString() })
          .in('profile_id', ids);
        if (invError) throw invError;
      }

      // Update profiles if needed
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profError } = await supabase
          .from('profiles')
          .update({ ...profileUpdates, updated_at: new Date().toISOString() })
          .in('id', ids);
        if (profError) throw profError;
      }
    },
    onSuccess: () => {
      // Force full refetch of users list to show updated assignment data
      queryClient.invalidateQueries({ queryKey: ['users-list'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      toast.success(`Updated ${selectedIds.size} users`);
      setSelectedIds(new Set());
      setBulkModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update');
    }
  });

  const handleBulkApply = (updates: Record<string, string>) => {
    if (selectedIds.size === 0) return;
    bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), updates });
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      toast.success(`Deleted ${selectedIds.size} users`);
      setSelectedIds(new Set());
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete');
    }
  });

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} users? This cannot be undone.`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  // Render pagination buttons
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="ct-pagination">
        <button 
          className="ct-page-btn" 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            className={`ct-page-btn ${currentPage === p ? 'active' : ''}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}
        <button 
          className="ct-page-btn" 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <SuperAdminGuard>
        <div className="users-module">
          <div className="ct-loading">
            <div className="ct-spinner" />
            <span>Loading users...</span>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="users-module">
        {/* Header */}
        <div className="ct-header">
          <div>
            <h1>Users</h1>
            <p>Manage resource profiles, assignments, and contracts</p>
          </div>
          <div className="ct-header-actions">
            <button className="ct-btn" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
            <button className="ct-btn ct-btn-primary" onClick={() => openDrawer()}>
              <Plus size={16} />
              Add User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="ct-stats-grid">
          <StatCard 
            label="Total Users" 
            value={stats.total} 
            type="all"
            isActive={typeFilter === 'all'}
            onClick={() => handleFilterChange(setTypeFilter, 'all')}
          />
          <StatCard 
            label="Variable" 
            value={stats.variable} 
            type="variable"
            isActive={typeFilter === 'variable'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'variable' ? 'all' : 'variable')}
          />
          <StatCard 
            label="Permanent" 
            value={stats.permanent} 
            type="permanent"
            isActive={typeFilter === 'permanent'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'permanent' ? 'all' : 'permanent')}
          />
          <StatCard 
            label="Fixed" 
            value={stats.fixed} 
            type="fixed"
            isActive={typeFilter === 'fixed'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'fixed' ? 'all' : 'fixed')}
          />
          <StatCard 
            label="Freelance" 
            value={stats.freelance} 
            type="freelance"
            isActive={typeFilter === 'freelance'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'freelance' ? 'all' : 'freelance')}
          />
        </div>

        {/* Run Rate Widgets */}
        <DepartmentRunRates 
          users={users} 
          activeDepartment={typeFilter === 'insourced' ? deptFilter : undefined}
          onDepartmentClick={(dept) => {
            // Toggle: if already selected, clear both filters
            if (deptFilter === dept && typeFilter === 'insourced') {
              handleFilterChange(setDeptFilter, '');
              handleFilterChange(setTypeFilter, 'all');
            } else {
              // Set department + Insourced type filter (Variable + Freelance)
              handleFilterChange(setDeptFilter, dept);
              handleFilterChange(setTypeFilter, 'insourced');
            }
          }}
          licenseWidget={<LicensesRunRateWidget />}
        />

        {/* Table Container */}
        <div className="ct-table-container">
          {/* Bulk Action Bar */}
          <div className={`ct-bulk-bar ${selectedIds.size > 0 ? 'visible' : ''}`}>
            <strong>{selectedIds.size} selected</strong>
            <button className="ct-bulk-btn" onClick={() => setSelectedIds(new Set())}>
              <X size={14} /> Clear
            </button>
            <div className="ct-bulk-bar-actions">
              <button className="ct-bulk-btn" onClick={() => setBulkModalOpen(true)}>
                <Edit3 size={14} /> Bulk Edit
              </button>
              <button className="ct-bulk-btn" onClick={handleExport}>
                <Download size={14} /> Export Selected
              </button>
              <button className="ct-bulk-btn danger" onClick={handleBulkDelete}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="ct-toolbar">
            <div className="ct-toolbar-left">
              <div className="ct-search-box">
                <Search size={16} className="search-icon" />
                <input 
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                />
              </div>
              <div className="ct-divider" />
              <Dropdown
                value={deptFilter}
                options={uniqueDepartments}
                onChange={(v) => handleFilterChange(setDeptFilter, v)}
                allLabel="All Departments"
              />
              <Dropdown
                value={assignmentFilter}
                options={uniqueAssignments}
                onChange={(v) => handleFilterChange(setAssignmentFilter, v)}
                allLabel="All Assignments"
              />
              <Dropdown
                value={vendorFilter}
                options={uniqueVendors}
                onChange={(v) => handleFilterChange(setVendorFilter, v)}
                allLabel="All Vendors"
              />
              <Dropdown
                value={typeFilter === 'all' ? '' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                options={['Variable', 'Permanent', 'Fixed', 'Freelance']}
                onChange={(v) => handleFilterChange(setTypeFilter, v ? v.toLowerCase() : 'all')}
                allLabel="Resource Type"
              />
            </div>
            <button className="ct-btn" onClick={clearFilters}>
              <X size={14} />
              Clear
            </button>
          </div>

          {/* Table */}
          <div className="ct-table-wrap">
            <table className="ct-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ width: 70 }}>RID</th>
                  <th style={{ minWidth: 240 }}>NAME</th>
                  <th style={{ width: 150 }}>JOB ROLE</th>
                  <th style={{ width: 60 }}>DID</th>
                  <th style={{ width: 120 }}>DEPARTMENT</th>
                  <th style={{ width: 60 }}>AID</th>
                  <th style={{ width: 160 }}>ASSIGNMENT</th>
                  <th style={{ width: 100 }}>START</th>
                  <th style={{ width: 100 }}>END</th>
                  <th style={{ width: 60 }}>VID</th>
                  <th style={{ width: 100 }}>VENDOR</th>
                  <th style={{ width: 110 }}>TYPE</th>
                  <th style={{ width: 120, textAlign: 'right' }}>CTC</th>
                  <th style={{ width: 110 }}>COUNTRY</th>
                  <th style={{ width: 90 }}>LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={selectedIds.has(user.id) ? 'selected' : ''}
                  >
                    <td className="col-check">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(user.id)}
                        onChange={(e) => handleSelectRow(user.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <span className="ct-cell-rid">
                        {user.rid ? String(user.rid).padStart(3, '0') : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="ct-name-cell" onClick={() => openDrawer(user)}>
                        <UserAvatar 
                          name={user.full_name} 
                          country={user.country}
                        />
                        <div className="ct-user-info">
                          <div className="ct-user-name">{user.full_name || '—'}</div>
                          {user.email && <div className="ct-user-email">{user.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <InlineEditCell
                        value={user.job_role || ''}
                        field="job_role"
                        userId={user.id}
                        type="text"
                        onSave={handleInlineSave}
                      />
                    </td>
                    <td><IdBadge value={user.did} /></td>
                    <td>{user.department_name || '—'}</td>
                    <td><IdBadge value={user.aid} /></td>
                    <td>{user.assignment_name || '—'}</td>
                    <td><DateCell date={user.contract_start_date} /></td>
                    <td><DateCell date={user.contract_end_date} /></td>
                    <td><IdBadge value={user.vid} /></td>
                    <td>{user.vendor || '—'}</td>
                    <td><TypeBadge type={user.resource_type} /></td>
                    <td style={{ textAlign: 'right' }}>
                      {user.ctc ? `ریال ${user.ctc.toLocaleString()}` : '—'}
                    </td>
                    <td>{user.country || '—'}</td>
                    <td><LocationBadge location={user.location} /></td>
                  </tr>
                ))}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={16} className="ct-empty-state">
                      No users found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="ct-table-footer">
            <div className="ct-footer-info">
              Showing <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}</strong>–
              <strong>{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of{' '}
              <strong>{filteredUsers.length}</strong> users
            </div>
            {renderPagination()}
          </div>
        </div>

        {/* Drawer */}
        <UserDrawer
          isOpen={drawerOpen}
          user={editingUser}
          onClose={closeDrawer}
          onSuccess={() => {
            closeDrawer();
          }}
        />

        {/* Bulk Edit Modal */}
        <BulkEditModal
          isOpen={bulkModalOpen}
          selectedCount={selectedIds.size}
          onClose={() => setBulkModalOpen(false)}
          onApply={handleBulkApply}
          departments={departments}
          assignments={assignments}
          vendors={vendors}
          countries={countries}
          locations={locations}
        />
      </div>
    </SuperAdminGuard>
  );
}

/**
 * UsersManagement - Ring-fenced /admin/users page
 * Complete UI replacement with custom CSS per LOVABLE-USERS-INVASIVE-REPLACEMENT.md
 * 
 * CRITICAL: This component uses ring-fenced CSS (um-* classes) that does NOT inherit
 * from Catalyst V5 design tokens. Changes here should NOT affect any other page.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { UserDrawer } from './components/UserDrawer';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Search, X, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// Constants
const AVATAR_COLORS = ['#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#6366f1','#14b8a6','#ef4444'];
const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦', 'Pakistan': '🇵🇰', 'Egypt': '🇪🇬',
  'India': '🇮🇳', 'Jordan': '🇯🇴', 'Sudan': '🇸🇩', 'Kosovo': '🇽🇰',
  'United Arab Emirates': '🇦🇪', 'Philippines': '🇵🇭', 'Bangladesh': '🇧🇩',
};

// Helper functions
const getInitials = (name: string | null) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string | null) => {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
};

const formatDateDisplay = (dateStr: string | null) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return format(date, 'dd\nMMM\nyyyy');
  } catch {
    return dateStr;
  }
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  dotClass: string;
  active: boolean;
  onClick: () => void;
}

const StatCard = ({ label, value, dotClass, active, onClick }: StatCardProps) => (
  <div 
    className={`um-stat-card ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <div className="um-stat-header">
      <div className={`um-stat-dot ${dotClass}`} />
      <span className="um-stat-label">{label}</span>
    </div>
    <div className="um-stat-value">{value}</div>
  </div>
);

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useUsers();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const pageSize = 50;

  // Unique filter options from data
  const uniqueDepartments = useMemo(() => 
    [...new Set(users.map(u => u.department_name).filter(Boolean))].sort(),
  [users]);
  
  const uniqueVendors = useMemo(() => 
    [...new Set(users.map(u => u.vendor).filter(Boolean))].sort(),
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
      // Type filter
      if (typeFilter !== 'all') {
        const userType = u.resource_type?.toLowerCase();
        if (typeFilter === 'variable') {
          if (userType !== 'variable' && userType !== 'core') return false;
        } else if (userType !== typeFilter.toLowerCase()) return false;
      }
      // Search
      if (searchQuery && !u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Department filter
      if (deptFilter && u.department_name !== deptFilter) return false;
      // Vendor filter
      if (vendorFilter && u.vendor !== vendorFilter) return false;
      return true;
    });
  }, [users, typeFilter, searchQuery, deptFilter, vendorFilter]);

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
    const exportData = filteredUsers.map((u) => ({
      RID: u.rid || '',
      Name: u.full_name || '',
      Email: u.email || '',
      'Job Role': u.job_role || '',
      Department: u.department_name || '',
      Assignment: u.assignment_name || '',
      'Contract Start': u.contract_start_date ? format(new Date(u.contract_start_date), 'dd MMM yyyy') : '',
      'Contract End': u.contract_end_date ? format(new Date(u.contract_end_date), 'dd MMM yyyy') : '',
      Vendor: u.vendor || '',
      Type: u.resource_type || '',
      Country: u.country || '',
      Location: u.location || '',
      CTC: u.ctc || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users-export.xlsx');
    toast.success('Exported to Excel');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('');
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

  // Get type badge class
  const getTypeBadgeClass = (type: string | null) => {
    if (!type) return '';
    const t = type.toLowerCase();
    if (t === 'variable' || t === 'core') return 'variable';
    if (t === 'permanent') return 'permanent';
    if (t === 'fixed') return 'fixed';
    if (t === 'freelance') return 'freelance';
    return '';
  };

  // Get location badge class
  const getLocationBadgeClass = (location: string | null) => {
    if (!location) return 'offshore';
    return location.toLowerCase() === 'onsite' ? 'onsite' : 'offshore';
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
      <div className="um-pagination">
        <button 
          className="um-page-btn" 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            className={`um-page-btn ${currentPage === p ? 'active' : ''}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}
        <button 
          className="um-page-btn" 
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
          <style>{ringFencedCSS}</style>
          <div className="um-loading">
            <div className="um-spinner" />
            <span>Loading users...</span>
          </div>
        </div>
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className="users-module">
        <style>{ringFencedCSS}</style>
        
        {/* Header */}
        <div className="um-header">
          <div>
            <h1>Users</h1>
            <p>Manage resource profiles, assignments, and contracts</p>
          </div>
          <div className="um-header-actions">
            <button className="um-btn" onClick={handleExport}>
              <Download size={14} />
              Export
            </button>
            <button className="um-btn um-btn-primary" onClick={() => openDrawer()}>
              <Plus size={14} />
              Add User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="um-stats-row">
          <StatCard 
            label="Total Users" 
            value={stats.total} 
            dotClass="all" 
            active={typeFilter === 'all'}
            onClick={() => handleFilterChange(setTypeFilter, 'all')}
          />
          <StatCard 
            label="Variable" 
            value={stats.variable} 
            dotClass="variable"
            active={typeFilter === 'variable'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'variable' ? 'all' : 'variable')}
          />
          <StatCard 
            label="Permanent" 
            value={stats.permanent} 
            dotClass="permanent"
            active={typeFilter === 'permanent'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'permanent' ? 'all' : 'permanent')}
          />
          <StatCard 
            label="Fixed" 
            value={stats.fixed} 
            dotClass="fixed"
            active={typeFilter === 'fixed'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'fixed' ? 'all' : 'fixed')}
          />
          <StatCard 
            label="Freelance" 
            value={stats.freelance} 
            dotClass="freelance"
            active={typeFilter === 'freelance'}
            onClick={() => handleFilterChange(setTypeFilter, typeFilter === 'freelance' ? 'all' : 'freelance')}
          />
        </div>

        {/* Table Container */}
        <div className="um-table-container">
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="um-bulk-bar visible">
              <span>{selectedIds.size} selected</span>
              <button className="um-bulk-btn" onClick={handleExport}>
                <Download size={12} /> Export Selected
              </button>
              <button className="um-bulk-btn" onClick={() => setSelectedIds(new Set())}>
                <X size={12} /> Clear
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="um-toolbar">
            <div className="um-toolbar-left">
              <div className="um-search-box">
                <Search size={14} />
                <input 
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                />
              </div>
              <div className="um-divider" />
              <select 
                className="um-filter-select"
                value={deptFilter}
                onChange={(e) => handleFilterChange(setDeptFilter, e.target.value)}
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select 
                className="um-filter-select"
                value={vendorFilter}
                onChange={(e) => handleFilterChange(setVendorFilter, e.target.value)}
              >
                <option value="">All Vendors</option>
                {uniqueVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <button className="um-btn" onClick={clearFilters}>
              <X size={12} />
              Clear
            </button>
          </div>

          {/* Table */}
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>RID</th>
                  <th style={{ minWidth: 220 }}>NAME</th>
                  <th>JOB ROLE</th>
                  <th>DEPARTMENT</th>
                  <th>ASSIGNMENT</th>
                  <th>START</th>
                  <th>END</th>
                  <th>VENDOR</th>
                  <th>TYPE</th>
                  <th>COUNTRY</th>
                  <th>LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={selectedIds.has(user.id) ? 'selected' : ''}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(user.id)}
                        onChange={(e) => handleSelectRow(user.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <span className="um-cell-rid">
                        {user.rid ? String(user.rid).padStart(3, '0') : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="um-name-cell" onClick={() => openDrawer(user)}>
                        <div className="um-avatar-wrapper">
                          <div 
                            className="um-avatar" 
                            style={{ backgroundColor: getAvatarColor(user.full_name) }}
                          >
                            {getInitials(user.full_name)}
                          </div>
                          <div className="um-avatar-flag">
                            {COUNTRY_FLAGS[user.country || ''] || '🏳️'}
                          </div>
                        </div>
                        <div>
                          <div className="um-user-name">{user.full_name || '—'}</div>
                          {user.email && <div className="um-user-email">{user.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{user.job_role || '—'}</td>
                    <td>{user.department_name || '—'}</td>
                    <td>{user.assignment_name || '—'}</td>
                    <td>
                      <span className="um-date-cell">
                        {formatDateDisplay(user.contract_start_date)}
                      </span>
                    </td>
                    <td>
                      <span className="um-date-cell">
                        {formatDateDisplay(user.contract_end_date)}
                      </span>
                    </td>
                    <td>{user.vendor || '—'}</td>
                    <td>
                      {user.resource_type ? (
                        <span className={`um-type-badge ${getTypeBadgeClass(user.resource_type)}`}>
                          <span className="dot" />
                          {user.resource_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{user.country || '—'}</td>
                    <td>
                      <span className={`um-loc-badge ${getLocationBadgeClass(user.location)}`}>
                        {user.location || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan={12} className="um-empty-state">
                      No users found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="um-table-footer">
            <div className="um-footer-info">
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
            // Query invalidation happens inside the drawer
          }}
        />
      </div>
    </SuperAdminGuard>
  );
}

// ================================================
// RING-FENCED CSS - ONLY applies to .users-module
// ================================================
const ringFencedCSS = `
.users-module {
  --um-primary: #2563eb;
  --um-primary-hover: #1d4ed8;
  --um-primary-light: rgba(37, 99, 235, 0.08);
  --um-teal: #0d9488;
  --um-teal-light: rgba(13, 148, 136, 0.1);
  --um-warning: #d97706;
  --um-warning-light: rgba(217, 119, 6, 0.1);
  --um-purple: #8b5cf6;
  --um-purple-light: rgba(139, 92, 246, 0.1);
  --um-danger: #ef4444;
  --um-success: #10b981;
  --um-slate: #475569;
  --um-bg: #f8fafc;
  --um-surface: #ffffff;
  --um-surface-hover: #f8fafc;
  --um-surface-active: #f1f5f9;
  --um-text: #0f172a;
  --um-text-secondary: #475569;
  --um-text-muted: #94a3b8;
  --um-border: #e2e8f0;
  --um-border-light: #f1f5f9;
  
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--um-bg);
  min-height: 100vh;
  padding: 20px 24px;
}

/* Loading state */
.users-module .um-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 300px;
  color: var(--um-text-secondary);
}
.users-module .um-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--um-border);
  border-top-color: var(--um-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header */
.users-module .um-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.users-module .um-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--um-text);
  margin: 0;
}
.users-module .um-header p {
  font-size: 12px;
  color: var(--um-text-muted);
  margin: 2px 0 0 0;
}
.users-module .um-header-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.users-module .um-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 34px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--um-border);
  background: var(--um-surface);
  color: var(--um-text);
  cursor: pointer;
  transition: all 0.15s;
}
.users-module .um-btn:hover {
  border-color: var(--um-primary);
  color: var(--um-primary);
}
.users-module .um-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.users-module .um-btn-primary {
  background: var(--um-primary);
  border-color: var(--um-primary);
  color: white;
}
.users-module .um-btn-primary:hover {
  background: var(--um-primary-hover);
}
.users-module .um-btn-danger {
  background: var(--um-danger);
  border-color: var(--um-danger);
  color: white;
}

/* Stats Cards Row */
.users-module .um-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 1024px) {
  .users-module .um-stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 640px) {
  .users-module .um-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
.users-module .um-stat-card {
  background: var(--um-surface);
  border: 1px solid var(--um-border);
  border-radius: 12px;
  padding: 16px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.users-module .um-stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: transparent;
  transition: background 0.2s;
}
.users-module .um-stat-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}
.users-module .um-stat-card.active {
  border-color: var(--um-primary);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.03), rgba(37, 99, 235, 0.06));
}
.users-module .um-stat-card.active::before {
  background: var(--um-primary);
}
.users-module .um-stat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.users-module .um-stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.users-module .um-stat-dot.all { background: var(--um-slate); }
.users-module .um-stat-dot.variable { background: var(--um-primary); }
.users-module .um-stat-dot.permanent { background: var(--um-teal); }
.users-module .um-stat-dot.fixed { background: var(--um-warning); }
.users-module .um-stat-dot.freelance { background: var(--um-purple); }
.users-module .um-stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--um-text-secondary);
}
.users-module .um-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--um-text);
  line-height: 1;
}

/* Table Container */
.users-module .um-table-container {
  background: var(--um-surface);
  border: 1px solid var(--um-border);
  border-radius: 12px;
  overflow: hidden;
}

/* Bulk Action Bar */
.users-module .um-bulk-bar {
  display: none;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--um-primary);
  color: white;
  font-size: 13px;
}
.users-module .um-bulk-bar.visible {
  display: flex;
}
.users-module .um-bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 6px;
  color: white;
  cursor: pointer;
}
.users-module .um-bulk-btn:hover {
  background: rgba(255,255,255,0.25);
}

/* Toolbar */
.users-module .um-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--um-border);
  gap: 12px;
}
.users-module .um-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  flex-wrap: wrap;
}
.users-module .um-search-box {
  position: relative;
  width: 240px;
  min-width: 180px;
}
.users-module .um-search-box input {
  width: 100%;
  height: 34px;
  padding: 0 12px 0 36px;
  font-size: 13px;
  border: 1px solid var(--um-border);
  border-radius: 8px;
  background: var(--um-surface);
  transition: all 0.15s;
}
.users-module .um-search-box input:focus {
  outline: none;
  border-color: var(--um-primary);
  box-shadow: 0 0 0 3px var(--um-primary-light);
}
.users-module .um-search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--um-text-muted);
}
.users-module .um-filter-select {
  height: 34px;
  padding: 0 28px 0 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--um-border);
  border-radius: 8px;
  background: var(--um-surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center;
  color: var(--um-text-secondary);
  cursor: pointer;
  appearance: none;
}
.users-module .um-divider {
  width: 1px;
  height: 24px;
  background: var(--um-border);
}

/* Table */
.users-module .um-table-wrap {
  overflow-x: auto;
  max-height: 62vh;
}
.users-module .um-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.users-module .um-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--um-surface-hover);
}
.users-module .um-table th {
  padding: 12px 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--um-text-muted);
  text-align: left;
  border-bottom: 1px solid var(--um-border);
  white-space: nowrap;
}
.users-module .um-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--um-border-light);
  vertical-align: middle;
}
.users-module .um-table tbody tr {
  transition: background 0.1s;
}
.users-module .um-table tbody tr:hover {
  background: rgba(37, 99, 235, 0.04);
}
.users-module .um-table tbody tr.selected {
  background: var(--um-primary-light);
}
.users-module .um-table input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--um-primary);
}

/* RID Cell */
.users-module .um-cell-rid {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  color: var(--um-text-muted);
  font-weight: 600;
}

/* Avatar + Flag Component */
.users-module .um-avatar-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.users-module .um-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: white;
}
.users-module .um-avatar-flag {
  position: absolute;
  bottom: -2px;
  right: -2px;
  font-size: 14px;
  background: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  line-height: 1;
}

/* Name Cell */
.users-module .um-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.users-module .um-name-cell:hover .um-user-name {
  color: var(--um-primary);
}
.users-module .um-user-name {
  font-weight: 600;
  color: var(--um-text);
  transition: color 0.15s;
}
.users-module .um-user-email {
  font-size: 11px;
  color: var(--um-text-muted);
  margin-top: 1px;
}

/* Type Badges */
.users-module .um-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.users-module .um-type-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.users-module .um-type-badge.variable {
  background: var(--um-primary-light);
  color: var(--um-primary);
}
.users-module .um-type-badge.variable .dot { background: var(--um-primary); }
.users-module .um-type-badge.permanent {
  background: var(--um-teal-light);
  color: var(--um-teal);
}
.users-module .um-type-badge.permanent .dot { background: var(--um-teal); }
.users-module .um-type-badge.fixed {
  background: var(--um-warning-light);
  color: var(--um-warning);
}
.users-module .um-type-badge.fixed .dot { background: var(--um-warning); }
.users-module .um-type-badge.freelance {
  background: var(--um-purple-light);
  color: var(--um-purple);
}
.users-module .um-type-badge.freelance .dot { background: var(--um-purple); }

/* Location Badge */
.users-module .um-loc-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.users-module .um-loc-badge.onsite {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}
.users-module .um-loc-badge.offshore {
  background: var(--um-surface-active);
  color: var(--um-text-secondary);
}

/* Date Cell */
.users-module .um-date-cell {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  color: var(--um-text-secondary);
  line-height: 1.3;
  white-space: pre-line;
}

/* Footer */
.users-module .um-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--um-border);
  background: var(--um-surface-hover);
  font-size: 13px;
}
.users-module .um-footer-info {
  color: var(--um-text-muted);
}
.users-module .um-footer-info strong {
  color: var(--um-text);
  font-weight: 600;
}
.users-module .um-pagination {
  display: flex;
  gap: 4px;
}
.users-module .um-page-btn {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--um-border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: var(--um-surface);
  cursor: pointer;
  transition: all 0.15s;
}
.users-module .um-page-btn:hover:not(:disabled) {
  border-color: var(--um-primary);
  color: var(--um-primary);
}
.users-module .um-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.users-module .um-page-btn.active {
  background: var(--um-primary);
  border-color: var(--um-primary);
  color: white;
}

/* Empty state */
.users-module .um-empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--um-text-muted);
  font-size: 14px;
}
`;

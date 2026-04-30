import { useState, useMemo } from 'react';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UsersResourceTypeCard, RESOURCE_DOT_COLORS } from '@/components/admin/users/UsersResourceTypeCard';
import { ResourceModal } from '@/components/shared/ResourceModal';
import { CapacityImportWizard } from '@/modules/capacity-planner/components/import';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { exportUsersMultiTab } from '@/components/admin/users/exportUsersMultiTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Users Management Page - Redesigned per LOVABLE-USERS-MODULE-REDESIGN.md
 * Route: /admin/users
 */
export default function Users() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { data: users = [], isLoading } = useUsers();

  // Fetch reference data for export
  const { data: departments = [] } = useQuery({
    queryKey: ['capacity-departments', 'with-code'],
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
    queryKey: ['resource-assignments', 'with-code'],
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
    queryKey: ['resource-vendors', 'with-code'],
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

  // Calculate resource type counts
  const resourceCounts = useMemo(() => {
    const counts = {
      total: users.length,
      variable: 0,
      permanent: 0,
      fixed: 0,
      freelance: 0,
    };
    
    users.forEach(user => {
      const type = user.resource_type?.toLowerCase();
      if (type === 'variable' || type === 'core') counts.variable++;
      else if (type === 'permanent') counts.permanent++;
      else if (type === 'fixed') counts.fixed++;
      else if (type === 'freelance') counts.freelance++;
    });
    
    return counts;
  }, [users]);

  // Filter users by resource type
  const filteredUsers = useMemo(() => {
    if (!resourceTypeFilter) return users;
    
    return users.filter(user => {
      const type = user.resource_type?.toLowerCase();
      if (resourceTypeFilter === 'variable') {
        return type === 'variable' || type === 'core';
      }
      return type === resourceTypeFilter;
    });
  }, [users, resourceTypeFilter]);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportUsers = filteredUsers.map(u => ({
        id: u.id,
        rid: u.rid,
        full_name: u.full_name,
        job_role: u.job_role,
        department_id: u.department_id,
        department_name: u.department_name,
        assignment_id: u.assignment_id,
        assignment_name: u.assignment_name,
        contract_start_date: u.contract_start_date,
        contract_end_date: u.contract_end_date,
        vendor_id: u.vendor_id,
        vendor: u.vendor,
        resource_type: u.resource_type,
        country: u.country,
        location: u.location,
        ctc: u.ctc,
      }));
      await exportUsersMultiTab(
        exportUsers,
        departments.map(d => ({ id: d.id, department_id: d.department_id ?? null })),
        assignments.map(a => ({ id: a.id, assignment_id: a.assignment_id ?? null })),
        vendors.map(v => ({ id: v.id, vendor_code: v.vendor_code ?? null }))
      );
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SuperAdminGuard>
      <div className="min-h-screen bg-[hsl(var(--users-bg))]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header - Per spec */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-[hsl(var(--users-text))]">
                Users
              </h1>
              <p className="text-xs text-[hsl(var(--users-text-muted))] mt-0.5">
                Manage resource profiles, assignments, and contracts
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || filteredUsers.length === 0}
                className="h-[34px] gap-2 border-[hsl(var(--users-border))]"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddUserModalOpen(true)}
                className="h-[34px] gap-2 bg-[hsl(var(--users-primary))] hover:bg-[hsl(var(--users-primary-hover))]"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          {/* Stats Cards Row - 5 cards per spec */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <UsersResourceTypeCard
              label="Total Users"
              count={resourceCounts.total}
              isActive={resourceTypeFilter === null}
              onClick={() => setResourceTypeFilter(null)}
              dotColor={RESOURCE_DOT_COLORS.total}
              variant="total"
            />
            <UsersResourceTypeCard
              label="Variable"
              count={resourceCounts.variable}
              isActive={resourceTypeFilter === 'variable'}
              onClick={() => setResourceTypeFilter(resourceTypeFilter === 'variable' ? null : 'variable')}
              dotColor={RESOURCE_DOT_COLORS.variable}
              variant="variable"
            />
            <UsersResourceTypeCard
              label="Permanent"
              count={resourceCounts.permanent}
              isActive={resourceTypeFilter === 'permanent'}
              onClick={() => setResourceTypeFilter(resourceTypeFilter === 'permanent' ? null : 'permanent')}
              dotColor={RESOURCE_DOT_COLORS.permanent}
              variant="permanent"
            />
            <UsersResourceTypeCard
              label="Fixed"
              count={resourceCounts.fixed}
              isActive={resourceTypeFilter === 'fixed'}
              onClick={() => setResourceTypeFilter(resourceTypeFilter === 'fixed' ? null : 'fixed')}
              dotColor={RESOURCE_DOT_COLORS.fixed}
              variant="fixed"
            />
            <UsersResourceTypeCard
              label="Freelance"
              count={resourceCounts.freelance}
              isActive={resourceTypeFilter === 'freelance'}
              onClick={() => setResourceTypeFilter(resourceTypeFilter === 'freelance' ? null : 'freelance')}
              dotColor={RESOURCE_DOT_COLORS.freelance}
              variant="freelance"
            />
          </div>

          {/* Users Table */}
          <UsersTable 
            users={filteredUsers} 
            isLoading={isLoading}
          />

          {/* Add User Modal */}
          <ResourceModal 
            isOpen={isAddUserModalOpen} 
            onClose={() => setIsAddUserModalOpen(false)}
            mode="create"
            context="admin"
          />

          {/* Import Wizard */}
          <CapacityImportWizard
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          />
        </div>
      </div>
    </SuperAdminGuard>
  );
}

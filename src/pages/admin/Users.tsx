import { useState } from 'react';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Upload } from 'lucide-react';
import { ResponsivePageContainer, ResponsivePageHeader } from '@/components/layout/ResponsivePageContainer';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UsersStatsCards } from '@/components/admin/users/UsersStatsCards';
import { ResourceModal } from '@/components/shared/ResourceModal';
import { UsersImportDialog } from '@/components/admin/users/UsersImportDialog';
import { useUsers } from '@/hooks/useUsers';

/**
 * Users Management Page - Manage user profiles and system access
 * Source: Administration guide PDF, Page 20
 */
export default function Users() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { data: users, isLoading, refetch, isFetching } = useUsers();

  return (
    <SuperAdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Users"
          description="Manage user profiles, roles, and system access"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportDialogOpen(true)}
                className="h-9"
              >
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>
              <Button
                size="sm"
                className="bg-brand-primary hover:bg-brand-primary-hover h-9"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add User</span>
              </Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="mb-6">
          <UsersStatsCards users={users || []} />
        </div>

        {/* Users Table */}
        <UsersTable 
          users={users || []} 
          isLoading={isLoading}
        />

        {/* Add User Modal */}
        <ResourceModal 
          isOpen={isAddUserModalOpen} 
          onClose={() => setIsAddUserModalOpen(false)}
          mode="create"
          context="admin"
        />

        {/* Import Dialog */}
        <UsersImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />
      </ResponsivePageContainer>
    </SuperAdminGuard>
  );
}

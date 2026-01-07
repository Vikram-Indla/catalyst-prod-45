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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover"
                onClick={() => setIsAddUserModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
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

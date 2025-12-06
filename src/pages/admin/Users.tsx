import { useState } from 'react';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ResponsivePageContainer, ResponsivePageHeader } from '@/components/layout/ResponsivePageContainer';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UsersStatsCards } from '@/components/admin/users/UsersStatsCards';
import { AddUserModal } from '@/components/admin/users/AddUserModal';
import { UserOverridesModal } from '@/components/admin/roles-permissions/UserOverridesModal';
import { useUsers } from '@/hooks/useUsers';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Users Management Page - Manage user profiles and system access
 * Source: Administration guide PDF, Page 20
 */
export default function Users() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isOverridesModalOpen, setIsOverridesModalOpen] = useState(false);

  const { data: users, isLoading } = useUsers();
  const { isAdmin } = useUserRole();

  const handleEditPermissions = (userId: string) => {
    setSelectedUserId(userId);
    setIsOverridesModalOpen(true);
  };

  const handleCloseOverridesModal = () => {
    setIsOverridesModalOpen(false);
    setSelectedUserId(null);
  };

  // Get the user's primary role for the overrides modal
  const selectedUser = users?.find(u => u.id === selectedUserId);
  const selectedUserRoleId = selectedUser?.roles[0]?.role_id || null;

  return (
    <SuperAdminGuard>
      <ResponsivePageContainer>
        <ResponsivePageHeader
          title="Users"
          description="Manage user profiles, roles, and system access"
          actions={
            <Button 
              className="bg-brand-gold hover:bg-brand-gold-hover"
              onClick={() => setIsAddUserModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
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
          onEditPermissions={handleEditPermissions}
        />

        {/* Add User Modal */}
        <AddUserModal 
          isOpen={isAddUserModalOpen} 
          onClose={() => setIsAddUserModalOpen(false)} 
        />

        {/* User Overrides Modal */}
        <UserOverridesModal
          isOpen={isOverridesModalOpen}
          onClose={handleCloseOverridesModal}
          userId={selectedUserId}
          roleId={selectedUserRoleId}
          isAdmin={isAdmin}
        />
      </ResponsivePageContainer>
    </SuperAdminGuard>
  );
}

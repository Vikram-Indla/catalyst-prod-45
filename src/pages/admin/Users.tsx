import { useState } from 'react';
import { SuperAdminGuard } from '@/components/admin/SuperAdminGuard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ResponsivePageContainer, ResponsivePageHeader } from '@/components/layout/ResponsivePageContainer';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UsersStatsCards } from '@/components/admin/users/UsersStatsCards';
import { AddUserModal } from '@/components/admin/users/AddUserModal';
import { EditUserRolesModal } from '@/components/admin/users/EditUserRolesModal';
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
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isOverridesModalOpen, setIsOverridesModalOpen] = useState(false);

  const { data: users, isLoading } = useUsers();
  const { isAdmin } = useUserRole();

  const handleEditRoles = (userId: string) => {
    setSelectedUserId(userId);
    setIsRolesModalOpen(true);
  };

  const handleEditPermissions = (userId: string) => {
    setSelectedUserId(userId);
    setIsOverridesModalOpen(true);
  };

  const handleCloseRolesModal = () => {
    setIsRolesModalOpen(false);
    setSelectedUserId(null);
  };

  const handleCloseOverridesModal = () => {
    setIsOverridesModalOpen(false);
    setSelectedUserId(null);
  };

  // Get the selected user's info for modals
  const selectedUser = users?.find(u => u.id === selectedUserId);
  const selectedUserRoleIds = selectedUser?.roles.map(r => r.role_id) || [];
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
          onEditRoles={handleEditRoles}
          onEditPermissions={handleEditPermissions}
        />

        {/* Add User Modal */}
        <AddUserModal 
          isOpen={isAddUserModalOpen} 
          onClose={() => setIsAddUserModalOpen(false)} 
        />

        {/* Edit User Roles Modal */}
        <EditUserRolesModal
          isOpen={isRolesModalOpen}
          onClose={handleCloseRolesModal}
          userId={selectedUserId}
          userName={selectedUser?.full_name || null}
          currentRoleIds={selectedUserRoleIds}
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

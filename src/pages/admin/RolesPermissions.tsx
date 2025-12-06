import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RolesList } from '@/components/admin/roles-permissions/RolesList';
import { RoleDetails } from '@/components/admin/roles-permissions/RoleDetails';
import { PermissionsMatrix } from '@/components/admin/roles-permissions/PermissionsMatrix';
import { UserOverridesModal } from '@/components/admin/roles-permissions/UserOverridesModal';
import { AddEditRoleModal } from '@/components/admin/roles-permissions/AddEditRoleModal';
import { RoleDetailPermissionsModal } from '@/components/admin/roles-permissions/RoleDetailPermissionsModal';
import { useProductRoles, ProductRole } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';

export default function RolesPermissions() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isOverridesModalOpen, setIsOverridesModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ProductRole | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  
  const { roles, isLoading, refetch } = useProductRoles();
  const { isAdmin } = useUserRole();
  
  const selectedRole = roles?.find(r => r.id === selectedRoleId) || roles?.[0];

  const handleEditOverrides = (userId: string) => {
    setSelectedUserId(userId);
    setIsOverridesModalOpen(true);
  };

  const handleCloseOverridesModal = () => {
    setIsOverridesModalOpen(false);
    setSelectedUserId(null);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditRole = (role: ProductRole) => {
    setEditingRole(role);
    setIsAddEditModalOpen(true);
  };

  const handleCloseAddEditModal = () => {
    setIsAddEditModalOpen(false);
    setEditingRole(null);
  };

  const handleRoleCreatedOrUpdated = (role: ProductRole) => {
    setSelectedRoleId(role.id);
    refetch();
  };

  const handleViewDetailedPermissions = () => {
    setIsPermissionsModalOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage roles, permissions, and access for the Product module.
            </p>
          </div>
          {isAdmin && (
            <Button 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={handleAddRole}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="flex gap-8">
          {/* Left Column: Roles List */}
          <div className="w-[38%] flex-shrink-0">
            <RolesList
              roles={roles || []}
              selectedRoleId={selectedRole?.id || null}
              onSelectRole={setSelectedRoleId}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Role Details */}
          <div className="flex-1">
            {selectedRole && (
              <RoleDetails
                role={selectedRole}
                onEditOverrides={handleEditOverrides}
                onEditRole={handleEditRole}
                onViewDetailedPermissions={handleViewDetailedPermissions}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>

        {/* Permissions Matrix */}
        <PermissionsMatrix roles={roles || []} />

        {/* User Overrides Modal */}
        <UserOverridesModal
          isOpen={isOverridesModalOpen}
          onClose={handleCloseOverridesModal}
          userId={selectedUserId}
          roleId={selectedRole?.id || null}
          isAdmin={isAdmin}
        />

        {/* Add/Edit Role Modal */}
        <AddEditRoleModal
          isOpen={isAddEditModalOpen}
          onClose={handleCloseAddEditModal}
          role={editingRole}
          onSuccess={handleRoleCreatedOrUpdated}
        />

        {/* Role Detail Permissions Modal */}
        <RoleDetailPermissionsModal
          isOpen={isPermissionsModalOpen}
          onClose={() => setIsPermissionsModalOpen(false)}
          role={selectedRole || null}
        />
      </div>
    </AdminGuard>
  );
}

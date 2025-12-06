import { useState } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RolesList } from '@/components/admin/roles-permissions/RolesList';
import { RoleDetails } from '@/components/admin/roles-permissions/RoleDetails';
import { PermissionsMatrix } from '@/components/admin/roles-permissions/PermissionsMatrix';
import { UserOverridesModal } from '@/components/admin/roles-permissions/UserOverridesModal';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useUserRole } from '@/hooks/useUserRole';

export default function RolesPermissions() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isOverridesModalOpen, setIsOverridesModalOpen] = useState(false);
  
  const { roles, isLoading } = useProductRoles();
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
          <Button 
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            disabled={!isAdmin}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
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
      </div>
    </AdminGuard>
  );
}

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useProductRoles } from '@/hooks/useProductRoles';
import { useUpdateUserRoles } from '@/hooks/useUsers';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditUserRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userName: string | null;
  currentRoleIds: string[];
}

export function EditUserRolesModal({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  currentRoleIds 
}: EditUserRolesModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { roles, isLoading: rolesLoading } = useProductRoles();
  const updateRoles = useUpdateUserRoles();

  // Initialize selected roles when modal opens or currentRoleIds change
  useEffect(() => {
    if (isOpen && currentRoleIds) {
      setSelectedRoles(currentRoleIds);
      setError(null);
    }
  }, [isOpen, currentRoleIds]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!userId) return;

    if (selectedRoles.length === 0) {
      setError('At least one role must be selected.');
      return;
    }

    try {
      await updateRoles.mutateAsync({
        userId,
        roleIds: selectedRoles,
      });
      handleClose();
    } catch (err) {
      setError("We couldn't update the roles. Please try again or contact an administrator.");
    }
  };

  const hasChanges = JSON.stringify([...selectedRoles].sort()) !== JSON.stringify([...currentRoleIds].sort());

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Roles</DialogTitle>
          <DialogDescription>
            Manage roles for {userName || 'this user'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Product Roles</p>
            <p className="text-xs text-muted-foreground mb-2">
              Select the roles this user should have. Changes will be saved when you click Save.
            </p>
            <div className="border rounded-md p-3 space-y-3 max-h-[300px] overflow-y-auto">
              {rolesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                roles?.map((role) => (
                  <div key={role.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`edit-role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`edit-role-${role.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.name}
                      </label>
                      {role.description && (
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            className="bg-brand-gold hover:bg-brand-gold-hover"
            onClick={handleSave}
            disabled={updateRoles.isPending || !hasChanges}
          >
            {updateRoles.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Roles'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

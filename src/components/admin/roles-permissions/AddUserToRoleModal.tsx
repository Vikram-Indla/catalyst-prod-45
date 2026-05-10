import { useState, useMemo } from 'react';
import Spinner from '@atlaskit/spinner';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import SearchIcon from '@atlaskit/icon/core/search';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddUserToRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string;
  roleName: string;
  existingUserIds: string[];
}

export function AddUserToRoleModal({
  isOpen,
  onClose,
  roleId,
  roleName,
  existingUserIds,
}: AddUserToRoleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch all approved users
  const { data: users, isLoading } = useQuery({
    queryKey: ['available-users-for-role', roleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Filter out users already in this role
  const availableUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => !existingUserIds.includes(u.id));
  }, [users, existingUserIds]);

  // Filter by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const q = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [availableUsers, searchQuery]);

  // Mutation to add users to role
  const addUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const inserts = userIds.map((userId) => ({
        user_id: userId,
        role_id: roleId,
        business_lines: [],
      }));

      const { error } = await supabase
        .from('user_product_roles')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-role', roleId] });
      queryClient.invalidateQueries({ queryKey: ['product-roles'] });
      toast.success(`${selectedUserIds.length} user(s) added to ${roleName}`);
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to add users:', error);
      toast.error('Failed to add users to role');
    },
  });

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUserIds([]);
    onClose();
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    if (selectedUserIds.length === 0) return;
    addUsersMutation.mutate(selectedUserIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PersonAddIcon label="" size="small" />
            Add Users to Role
          </DialogTitle>
          <DialogDescription>
            Select users to assign to the <strong>{roleName}</strong> role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <Textfield
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            elemBeforeInput={
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                <SearchIcon label="" size="small" />
              </span>
            }
          />

          {/* Users List */}
          <div className="border rounded-md max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="small" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {availableUsers.length === 0
                  ? 'All users are already assigned to this role.'
                  : 'No users match your search.'}
              </p>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggleUser(user.id)}
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedUserIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.length} user(s) selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button appearance="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            isDisabled={selectedUserIds.length === 0 || addUsersMutation.isPending}
            iconBefore={PersonAddIcon}
          >
            {addUsersMutation.isPending ? 'Adding...' : 'Add Users'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

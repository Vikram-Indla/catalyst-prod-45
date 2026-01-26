import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, UserPlus } from 'lucide-react';
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
            <UserPlus className="h-5 w-5" />
            Add Users to Role
          </DialogTitle>
          <DialogDescription>
            Select users to assign to the <strong>{roleName}</strong> role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users List */}
          <div className="border rounded-md max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedUserIds.length === 0 || addUsersMutation.isPending}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            {addUsersMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Users
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

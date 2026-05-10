import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import PersonAddIcon from '@atlaskit/icon/core/person-add';
import PersonRemoveIcon from '@atlaskit/icon/core/person-remove';
interface TeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

export function TeamMembersDialog({ open, onOpenChange, teamId, teamName }: TeamMembersDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch current team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId);
      if (error) throw error;
      return data.map(m => m.user_id);
    },
    enabled: !!teamId,
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from('team_members')
        .insert(userIds.map(userId => ({ team_id: teamId, user_id: userId })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      toast.success('Members added successfully');
      setSelectedUsers([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add members: ${error.message}`);
    },
  });

  // Remove members mutation
  const removeMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .in('user_id', userIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      toast.success('Members removed successfully');
      setSelectedUsers([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove members: ${error.message}`);
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = () => {
    const usersToAdd = selectedUsers.filter(id => !teamMembers?.includes(id));
    if (usersToAdd.length > 0) {
      addMembersMutation.mutate(usersToAdd);
    }
  };

  const handleRemoveMembers = () => {
    const usersToRemove = selectedUsers.filter(id => teamMembers?.includes(id));
    if (usersToRemove.length > 0) {
      removeMembersMutation.mutate(usersToRemove);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PeopleGroupIcon label="" size="small" />
            Manage Team Members - {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedUsers.length} users selected
            </p>
            <div className="flex gap-2">
              <Button
                appearance="default"
                onClick={handleAddMembers}
                isDisabled={selectedUsers.length === 0 || addMembersMutation.isPending}
                iconBefore={PersonAddIcon}
              >
                Add to Team
              </Button>
              <Button
                appearance="default"
                onClick={handleRemoveMembers}
                isDisabled={selectedUsers.length === 0 || removeMembersMutation.isPending}
                iconBefore={PersonRemoveIcon}
              >
                Remove from Team
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-md p-4">
            <div className="space-y-2">
              {profiles?.map((profile) => {
                const isMember = teamMembers?.includes(profile.id);
                const isSelected = selectedUsers.includes(profile.id);
                
                return (
                  <div
                    key={profile.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleUser(profile.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleUser(profile.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {profile.full_name || profile.email}
                      </p>
                      {isMember && (
                        <p className="text-xs text-muted-foreground">Current member</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

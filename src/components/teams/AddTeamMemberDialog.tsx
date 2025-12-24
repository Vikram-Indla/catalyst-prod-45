import { useState } from 'react';
import { useAddTeamMember, useTeamMembers } from '@/hooks/useTeamMembers';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AddTeamMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTeamMemberDialog({ teamId, open, onOpenChange }: AddTeamMemberDialogProps) {
  const [userId, setUserId] = useState('');

  const addMember = useAddTeamMember();
  const { data: existingMembers = [] } = useTeamMembers(teamId);
  const { data: users = [] } = useActiveUsers();

  // Filter out users who are already team members
  const existingMemberIds = existingMembers.map((m) => m.user_id);
  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addMember.mutateAsync({
        teamId,
        userId,
        role: 'Member',
        allocation: 100,
      });

      setUserId('');
      onOpenChange(false);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('This user is already a member of this team');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="user">User *</Label>
            <Select value={userId} onValueChange={setUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    All users are already team members
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!userId || addMember.isPending || availableUsers.length === 0}>
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

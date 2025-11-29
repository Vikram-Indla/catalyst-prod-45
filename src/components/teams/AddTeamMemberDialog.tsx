import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddTeamMember } from '@/hooks/useTeamMembers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface AddTeamMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTeamMemberDialog({ teamId, open, onOpenChange }: AddTeamMemberDialogProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('Developer');
  const [allocation, setAllocation] = useState(100);

  const addMember = useAddTeamMember();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addMember.mutateAsync({
      teamId,
      userId,
      role,
      allocation,
    });

    // Reset form
    setUserId('');
    setRole('Developer');
    setAllocation(100);
    onOpenChange(false);
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
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Product Owner">Product Owner</SelectItem>
                <SelectItem value="Scrum Master">Scrum Master</SelectItem>
                <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="allocation">Allocation % *</Label>
            <Input
              id="allocation"
              type="number"
              min="1"
              max="100"
              value={allocation}
              onChange={(e) => setAllocation(Number(e.target.value))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of time allocated to this team (1-100%)
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

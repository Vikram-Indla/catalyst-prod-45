import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface BulkRoleAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_LABELS = {
  admin: 'Admin',
  program_manager: 'Program Manager',
  team_lead: 'Team Lead',
  user: 'User',
};

export function BulkRoleAssignment({ open, onOpenChange }: BulkRoleAssignmentProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'assign' | 'remove'>('assign');
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-bulk'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (action === 'assign') {
        const { error } = await supabase.rpc('bulk_assign_roles', {
          _user_ids: selectedUserIds,
          _role: selectedRole as 'admin' | 'program_manager' | 'team_lead' | 'user',
          _notes: notes || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('bulk_remove_roles', {
          _user_ids: selectedUserIds,
          _role: selectedRole as 'admin' | 'program_manager' | 'team_lead' | 'user',
          _notes: notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-role-history'] });
      toast.success(`Roles ${action === 'assign' ? 'assigned' : 'removed'} successfully`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    setSelectedUserIds([]);
    setSelectedRole('');
    setNotes('');
    setAction('assign');
    onOpenChange(false);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUserIds.length === profiles?.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(profiles?.map((p) => p.id) || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Role Assignment
          </DialogTitle>
          <DialogDescription>
            Assign or remove roles for multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={action} onValueChange={(v: 'assign' | 'remove') => setAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign">Assign Role</SelectItem>
                  <SelectItem value="remove">Remove Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this role change..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Users ({selectedUserIds.length} selected)</Label>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedUserIds.length === profiles?.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {profiles?.map((profile) => (
                  <div key={profile.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedUserIds.includes(profile.id)}
                      onCheckedChange={() => toggleUser(profile.id)}
                    />
                    <span className="text-sm">
                      {profile.full_name || profile.email}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkMutation.mutate()}
              disabled={selectedUserIds.length === 0 || !selectedRole || bulkMutation.isPending}
            >
              {bulkMutation.isPending
                ? 'Processing...'
                : `${action === 'assign' ? 'Assign' : 'Remove'} for ${selectedUserIds.length} user(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

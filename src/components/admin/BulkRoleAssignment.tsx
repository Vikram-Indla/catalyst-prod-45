import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/admin/admin-dialog';
import Button from '@atlaskit/button/new';
import AdsSelect from '@atlaskit/select';
import TextArea from '@atlaskit/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { catalystToast } from '@/lib/catalystToast';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
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
      catalystToast.success(`Roles ${action === 'assign' ? 'assigned' : 'removed'} successfully`);
      handleClose();
    },
    onError: (error: Error) => {
      catalystToast.error(error.message);
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
            <PeopleGroupIcon label="" size="small" />
            Bulk Role Assignment
          </DialogTitle>
          <DialogDescription>
            Assign or remove roles for multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Action</label>
              <AdsSelect
                value={{ label: action === 'assign' ? 'Assign Role' : 'Remove Role', value: action }}
                options={[
                  { label: 'Assign Role', value: 'assign' },
                  { label: 'Remove Role', value: 'remove' },
                ]}
                onChange={(opt) => opt && setAction(opt.value as 'assign' | 'remove')}
              />
            </div>

            <div className="space-y-2">
              <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Role</label>
              <AdsSelect
                value={selectedRole ? { label: ROLE_LABELS[selectedRole as keyof typeof ROLE_LABELS] || selectedRole, value: selectedRole } : null}
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
                placeholder="Select role"
                onChange={(opt) => opt && setSelectedRole(opt.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Notes (optional)</label>
            <TextArea
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              placeholder="Add notes about this role change..."
              minimumRows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))' }}>Select Users ({selectedUserIds.length} selected)</span>
              <Button appearance="default" onClick={toggleAll}>
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
            <Button appearance="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={() => bulkMutation.mutate()}
              isDisabled={selectedUserIds.length === 0 || !selectedRole || bulkMutation.isPending}
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

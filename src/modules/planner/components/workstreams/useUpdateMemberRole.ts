// ============================================================
// UPDATE MEMBER ROLE HOOK
// Allows updating a workstream member's role (e.g., member -> lead)
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateRoleParams {
  memberId: string;
  workstreamId: string;
  newRole: 'lead' | 'member';
}

/**
 * Hook to update a workstream member's role.
 * When setting a member as lead, demotes existing lead to member.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, workstreamId, newRole }: UpdateRoleParams) => {
      // If promoting to lead, first demote any existing lead
      if (newRole === 'lead') {
        const { error: demoteError } = await supabase
          .from('workstream_members')
          .update({ role: 'member' })
          .eq('workstream_id', workstreamId)
          .eq('role', 'lead');

        if (demoteError) {
          console.error('Error demoting existing lead:', demoteError);
          throw demoteError;
        }
      }

      // Update the target member's role
      const { data, error } = await supabase
        .from('workstream_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workstream-members', variables.workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstream-lead-access'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
      
      const roleLabel = variables.newRole === 'lead' ? 'Lead' : 'Member';
      toast.success(`Role updated to ${roleLabel}`);
    },
    onError: (err: any) => {
      console.error('Failed to update member role:', err);
      toast.error('Failed to update role');
    },
  });
}

// ============================================================
// CREATE WORKSTREAM MUTATION HOOK
// Creates workstream with optional members in single transaction
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateWorkstreamInput {
  name: string;
  slug: string;
  color: string;
  description: string | null;
  members: {
    resourceId: string; // This is actually the user_id (profile id)
    role: 'lead' | 'member';
  }[];
}

export function useCreateWorkstream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkstreamInput) => {
      // 1. Create the workstream
      const { data: workstream, error: wsError } = await supabase
        .from('planner_workstreams')
        .insert({
          name: input.name,
          slug: input.slug,
          color: input.color,
          description: input.description,
          is_active: true,
        })
        .select()
        .single();

      if (wsError) {
        if (wsError.message?.includes('duplicate')) {
          throw new Error('A workstream with this slug already exists');
        }
        throw wsError;
      }

      // 2. Add members if any
      if (input.members.length > 0) {
        const membersToInsert = input.members.map(m => ({
          workstream_id: workstream.id,
          user_id: m.resourceId, // Using user_id column for profile ids
          role: m.role,
        }));

        const { error: membersError } = await supabase
          .from('workstream_members')
          .insert(membersToInsert);

        if (membersError) {
          // Rollback: delete the workstream
          await supabase.from('planner_workstreams').delete().eq('id', workstream.id);
          throw membersError;
        }

        // 3. If there's a lead, update workstream.lead_id
        const lead = input.members.find(m => m.role === 'lead');
        if (lead) {
          await supabase
            .from('planner_workstreams')
            .update({ lead_id: lead.resourceId })
            .eq('id', workstream.id);
        }
      }

      return workstream;
    },
    onSuccess: (data) => {
      // Invalidate all workstream-related queries
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream-details'] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstream-members'] });
      toast.success(`Workstream "${data.name}" created!`);
    },
    onError: (error: Error) => {
      console.error('Failed to create workstream:', error);
      toast.error(error.message || 'Failed to create workstream');
    },
  });
}

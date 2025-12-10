import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WorkItemType = 'epic' | 'feature' | 'story';

export interface KRWorkContribution {
  id: string;
  key_result_id: string;
  work_item_id: string;
  work_item_type: WorkItemType;
  contribution_percent: number;
  calculated_progress: number;
  notes?: string;
  created_at: string;
  work_item_name?: string;
  work_item_status?: string;
}

export interface CreateWorkContributionInput {
  key_result_id: string;
  work_item_id: string;
  work_item_type: WorkItemType;
  work_item_name?: string; // Optional display name
  contribution_percent: number;
  notes?: string;
}

async function fetchWorkItemDetails(workItemId: string, workItemType: WorkItemType) {
  let name = 'Unknown', status = 'unknown', progress = 0;
  if (workItemType === 'epic') {
    const { data } = await supabase.from('epics').select('name, state').eq('id', workItemId).single();
    if (data) { name = data.name; status = data.state || 'backlog'; }
  } else if (workItemType === 'feature') {
    const { data } = await supabase.from('features').select('name, status').eq('id', workItemId).single();
    if (data) {
      name = data.name; status = data.status || 'backlog';
      progress = ['done', 'completed', 'closed'].includes(status.toLowerCase()) ? 100 : 0;
    }
  } else if (workItemType === 'story') {
    const { data } = await supabase.from('stories').select('name, status').eq('id', workItemId).single();
    if (data) {
      name = data.name; status = data.status || 'backlog';
      progress = ['done', 'completed', 'closed'].includes(status.toLowerCase()) ? 100 : 0;
    }
  }
  return { name, status, progress };
}

export function useKRWorkContributions(keyResultId?: string) {
  return useQuery({
    queryKey: ['kr-work-contributions', keyResultId],
    queryFn: async () => {
      if (!keyResultId) return [];
      const { data, error } = await supabase
        .from('kr_work_contributions')
        .select('*')
        .eq('key_result_id', keyResultId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (c) => {
          const details = await fetchWorkItemDetails(c.work_item_id, c.work_item_type as WorkItemType);
          return { ...c, work_item_name: details.name, work_item_status: details.status } as KRWorkContribution;
        })
      );
      return enriched;
    },
    enabled: !!keyResultId,
  });
}

export function useCreateWorkContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWorkContributionInput) => {
      const { data: user } = await supabase.auth.getUser();
      const details = await fetchWorkItemDetails(input.work_item_id, input.work_item_type);
      const { data, error } = await supabase
        .from('kr_work_contributions')
        .insert({
          key_result_id: input.key_result_id,
          work_item_id: input.work_item_id,
          work_item_type: input.work_item_type,
          contribution_percent: input.contribution_percent,
          calculated_progress: details.progress,
          notes: input.notes,
          created_by: user?.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kr-work-contributions', variables.key_result_id] });
      queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
      toast.success('Work item linked');
    },
    onError: (error: any) => {
      toast.error(error.code === '23505' ? 'Already linked' : 'Failed to link');
    },
  });
}

export function useDeleteWorkContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, keyResultId }: { id: string; keyResultId: string }) => {
      const { error } = await supabase.from('kr_work_contributions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kr-work-contributions', variables.keyResultId] });
      queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
      toast.success('Work item unlinked');
    },
    onError: () => toast.error('Failed to unlink'),
  });
}

// Alias exports for component compatibility
export const useAddWorkContribution = useCreateWorkContribution;
export const useRemoveWorkContribution = useDeleteWorkContribution;

export function useUpdateContributionPercent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, keyResultId, percent }: { id: string; keyResultId: string; percent: number }) => {
      const { data, error } = await supabase
        .from('kr_work_contributions')
        .update({ contribution_percent: percent, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kr-work-contributions', variables.keyResultId] });
      queryClient.invalidateQueries({ queryKey: ['key-results-v2'] });
    },
    onError: () => toast.error('Failed to update contribution'),
  });
}

export function useSearchWorkItems(search: string, workItemType?: WorkItemType) {
  return useQuery({
    queryKey: ['search-work-items', search, workItemType],
    queryFn: async () => {
      const results: Array<{ id: string; name: string; type: WorkItemType; status: string }> = [];
      if (!workItemType || workItemType === 'epic') {
        const { data } = await supabase.from('epics').select('id, name, state').ilike('name', `%${search}%`).limit(10);
        data?.forEach(e => results.push({ id: e.id, name: e.name, type: 'epic', status: e.state || 'backlog' }));
      }
      if (!workItemType || workItemType === 'feature') {
        const { data } = await supabase.from('features').select('id, name, status').ilike('name', `%${search}%`).limit(10);
        data?.forEach(f => results.push({ id: f.id, name: f.name, type: 'feature', status: f.status || 'backlog' }));
      }
      if (!workItemType || workItemType === 'story') {
        const { data } = await supabase.from('stories').select('id, name, status').ilike('name', `%${search}%`).limit(10);
        data?.forEach(s => results.push({ id: s.id, name: s.name, type: 'story', status: s.status || 'backlog' }));
      }
      return results;
    },
    enabled: search.length >= 2,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useAuth } from '@/hooks/useAuth';

export interface WorkLogRow {
  id: string;
  work_item_id: string;
  author_id: string;
  time_spent_minutes: number;
  work_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

export function useWorkLogs(workItemId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ['wh-work-logs', workItemId];

  const { data: entries = [], isLoading } = useQuery<WorkLogRow[]>({
    queryKey,
    enabled: !!workItemId,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!workItemId) return [];
      const { data, error } = await supabase
        .from('ph_worklogs' as never)
        .select('*')
        .eq('work_item_id', workItemId)
        .is('deleted_at', null)
        .order('work_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[useWorkLogs] select failed', error);
        return [];
      }
      const rows = (data ?? []) as WorkLogRow[];
      if (rows.length === 0) return [];
      const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', authorIds);
      const map = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({
        ...r,
        author: map.get(r.author_id) ?? null,
      }));
    },
  });

  const createEntry = useMutation({
    mutationFn: async (input: {
      time_spent_minutes: number;
      work_date: string;
      description: string | null;
    }) => {
      if (!workItemId || !user?.id) throw new Error('Not ready');
      const { error } = await supabase.from('ph_worklogs' as never).insert({
        work_item_id: workItemId,
        author_id: user.id,
        time_spent_minutes: input.time_spent_minutes,
        work_date: input.work_date,
        description: input.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Work logged');
    },
    onError: (err: unknown) => {
      console.warn('[useWorkLogs] create failed', err);
      catalystToast.error('Failed to log work');
    },
  });

  const updateEntry = useMutation({
    mutationFn: async (input: {
      id: string;
      time_spent_minutes: number;
      work_date: string;
      description: string | null;
    }) => {
      const { error } = await supabase
        .from('ph_worklogs' as never)
        .update({
          time_spent_minutes: input.time_spent_minutes,
          work_date: input.work_date,
          description: input.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Work log updated');
    },
    onError: () => catalystToast.error('Failed to update work log'),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete — preserves audit trail and keeps FK joins safe.
      const { error } = await supabase
        .from('ph_worklogs' as never)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      catalystToast.success('Work log deleted');
    },
    onError: () => catalystToast.error('Failed to delete work log'),
  });

  return { entries, isLoading, createEntry, updateEntry, deleteEntry };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentProjectItem {
  id: string;
  issue_id: string;
  issue_key: string;
  issue_type: string;
  summary: string;
  visited_at: string;
}

export function useRecentProjectItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['recent-project-items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, issue_id, issue_key, issue_type, summary, visited_at')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('visited_at', { ascending: false })
        .limit(8);

      if (error) {
        console.warn('useRecentProjectItems error:', error.message);
        return [];
      }
      return (data ?? []) as RecentProjectItem[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useTrackRecentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      issueId: string;
      issueKey: string;
      issueType: string;
      summary: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_recent_items')
        .upsert(
          {
            user_id: user.id,
            project_id: params.projectId,
            issue_id: params.issueId,
            issue_key: params.issueKey,
            issue_type: params.issueType,
            summary: params.summary,
            visited_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,project_id,issue_id' }
        );

      if (error) console.warn('trackRecentItem error:', error.message);
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['recent-project-items', params.projectId] });
    },
  });
}

export function useRemoveRecentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('user_recent_items')
        .delete()
        .eq('id', itemId);
      if (error) console.warn('removeRecentItem error:', error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-project-items'] });
    },
  });
}

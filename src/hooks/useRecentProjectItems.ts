import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentProjectItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_key: string | null;
  display_summary: string;
  project_id: string | null;
  project_name: string | null;
  nav_path: string;
  visited_at: string;
  visit_count: number;
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
        .select('id, entity_type, entity_id, entity_key, display_summary, nav_path, visited_at, visit_count')
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

export function useGlobalRecentItems(limit = 10) {
  return useQuery({
    queryKey: ['global-recent-items', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, entity_type, entity_id, entity_key, display_summary, project_id, project_name, nav_path, visited_at, visit_count')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('useGlobalRecentItems error:', error.message);
        return [];
      }
      return (data ?? []) as RecentProjectItem[];
    },
    staleTime: 30_000,
  });
}

export function useTrackRecentItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: string;
      entityId: string;
      entityKey?: string;
      displaySummary: string;
      projectId?: string;
      projectName?: string;
      navPath: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_recent_items')
        .upsert(
          {
            user_id: user.id,
            entity_type: params.entityType,
            entity_id: params.entityId,
            entity_key: params.entityKey ?? null,
            display_summary: params.displaySummary,
            project_id: params.projectId ?? null,
            project_name: params.projectName ?? null,
            nav_path: params.navPath,
            visited_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,entity_type,entity_id' }
        );

      if (error) console.warn('trackRecentItem error:', error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-project-items'] });
      qc.invalidateQueries({ queryKey: ['global-recent-items'] });
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
      qc.invalidateQueries({ queryKey: ['global-recent-items'] });
    },
  });
}

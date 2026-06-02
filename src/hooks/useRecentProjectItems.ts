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

      // Fetch more than needed so deduplication by nav_path still yields 8 unique entries.
      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, entity_type, entity_id, entity_key, display_summary, nav_path, visited_at, visit_count')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('visited_at', { ascending: false })
        .limit(40);

      if (error) {
        console.warn('useRecentProjectItems error:', error.message);
        return [];
      }

      // Filter out done/canceled issues
      const entityKeys = (data ?? []).map((d: any) => d.entity_key).filter(Boolean);
      let doneKeys = new Set<string>();
      if (entityKeys.length > 0) {
        const { data: doneRows } = await supabase
          .from('ph_issues')
          .select('issue_key')
          .in('issue_key', entityKeys)
          .in('status_category', ['Done', 'done', 'Canceled', 'canceled']);
        if (doneRows) doneKeys = new Set(doneRows.map((r: any) => r.issue_key));
      }

      // Deduplicate by nav_path — rows are ordered newest-first so the first
      // occurrence of each path is the most recent visit.
      const seen = new Set<string>();
      const deduped: RecentProjectItem[] = [];
      for (const item of (data ?? []) as RecentProjectItem[]) {
        if (item.entity_key && doneKeys.has(item.entity_key)) continue;
        if (!seen.has(item.nav_path)) {
          seen.add(item.nav_path);
          deduped.push(item);
          if (deduped.length === 8) break;
        }
      }
      return deduped;
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

      // Fetch a larger batch so deduplication by nav_path still yields `limit` unique entries.
      const { data, error } = await supabase
        .from('user_recent_items')
        .select('id, entity_type, entity_id, entity_key, display_summary, project_id, project_name, nav_path, visited_at, visit_count')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(limit * 5);

      if (error) {
        console.warn('useGlobalRecentItems error:', error.message);
        return [];
      }

      // Deduplicate by nav_path — newest-first so first occurrence = most recent visit.
      const seen = new Set<string>();
      const deduped: RecentProjectItem[] = [];
      for (const item of (data ?? []) as RecentProjectItem[]) {
        if (!seen.has(item.nav_path)) {
          seen.add(item.nav_path);
          deduped.push(item);
          if (deduped.length === limit) break;
        }
      }
      return deduped;
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
      qc.invalidateQueries({ queryKey: ['global-recent-projects'] });
      qc.invalidateQueries({ queryKey: ['product-hub-recent-products'] });
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
      qc.invalidateQueries({ queryKey: ['global-recent-projects'] });
      qc.invalidateQueries({ queryKey: ['product-hub-recent-products'] });
    },
  });
}

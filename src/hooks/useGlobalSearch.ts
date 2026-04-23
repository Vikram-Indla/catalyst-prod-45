import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SearchResult, RecentSearchEntry, ActiveFilters } from '@/types/global-search';

const SEARCH_SELECT = 'id, issue_key, summary, project_name, project_key, issue_type, jira_updated_at, jira_created_at, assignee_display_name, reporter_display_name';

function mapIssueToSearchResult(row: any): SearchResult {
  return {
    id: row.id,
    item_key: row.issue_key || 'UNKNOWN',
    title: row.summary || '(no title)',
    hub: 'ProjectHub',
    project_name: row.project_name || null,
    project_key: row.project_key || null,
    item_type: (row.issue_type || 'task').toLowerCase().replace(/\s+/g, '_') as any,
    assignee_name: row.assignee_display_name || null,
    reporter_name: row.reporter_display_name || null,
    viewed_at: row.jira_updated_at || row.jira_created_at || new Date().toISOString(),
  };
}

export function useRecentItems() {
  return useQuery({
    queryKey: ['global-search-recents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select(SEARCH_SELECT)
        .order('jira_updated_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map(mapIssueToSearchResult);
    },
  });
}

export function useRecentSearches() {
  return useQuery({
    queryKey: ['global-search-history'],
    queryFn: async () => [] as RecentSearchEntry[],
  });
}

export function useSearchResults(query: string, filters: ActiveFilters) {
  return useQuery({
    queryKey: ['global-search-results', query, filters],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      let q = supabase
        .from('ph_issues')
        .select(SEARCH_SELECT)
        .or(`issue_key.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('jira_updated_at', { ascending: false })
        .limit(50);
      if (filters.project) q = q.eq('project_key', filters.project);
      if (filters.assignee) q = q.ilike('assignee_display_name', `%${filters.assignee}%`);
      if (filters.type) q = q.ilike('issue_type', filters.type.replace('_', ' '));
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapIssueToSearchResult);
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

export function useTrackView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_item: SearchResult) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ['global-search-recents'] }),
  });
}

export function useSaveSearch() {
  return useMutation({
    mutationFn: async (_query: string) => {},
  });
}

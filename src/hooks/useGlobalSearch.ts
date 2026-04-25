import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SearchResult, RecentSearchEntry, ActiveFilters } from '@/types/global-search';

const SEARCH_SELECT = 'id, issue_key, summary, project_name, project_key, issue_type, jira_updated_at, jira_created_at, assignee_display_name, reporter_display_name';
const CAT_SELECT = 'id, issue_key, title, issue_type, assignee_id, created_at, updated_at, project_id, projects(name, key)';

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

function mapCatalystToSearchResult(row: any): SearchResult {
  return {
    id: row.id,
    item_key: row.issue_key || 'UNKNOWN',
    title: row.title || '(no title)',
    hub: 'ProjectHub',
    project_name: row.projects?.name || null,
    project_key: row.projects?.key || null,
    item_type: (row.issue_type || 'task').toLowerCase().replace(/\s+/g, '_') as any,
    assignee_name: row.assignee_id || null,
    reporter_name: null,
    viewed_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function mergeJiraWins(jira: SearchResult[], cat: SearchResult[], limit: number): SearchResult[] {
  const seen = new Set(jira.map((r) => r.item_key));
  const filteredCat = cat.filter((r) => !seen.has(r.item_key));
  return [...jira, ...filteredCat]
    .sort((a, b) => (b.viewed_at ?? '').localeCompare(a.viewed_at ?? ''))
    .slice(0, limit);
}

export function useRecentItems() {
  return useQuery({
    queryKey: ['global-search-recents'],
    queryFn: async () => {
      const [phRes, catRes] = await Promise.all([
        supabase
          .from('ph_issues')
          .select(SEARCH_SELECT)
          .order('jira_updated_at', { ascending: false })
          .limit(100),
        (supabase as any)
          .from('catalyst_issues')
          .select(CAT_SELECT)
          .order('updated_at', { ascending: false })
          .limit(100),
      ]);
      if (phRes.error) throw phRes.error;
      const jira = (phRes.data ?? []).map(mapIssueToSearchResult);
      const cat = (catRes.data ?? []).map(mapCatalystToSearchResult);
      return mergeJiraWins(jira, cat, 100);
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
      let phQ = supabase
        .from('ph_issues')
        .select(SEARCH_SELECT)
        .or(`issue_key.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('jira_updated_at', { ascending: false })
        .limit(50);
      if (filters.project) phQ = phQ.eq('project_key', filters.project);
      if (filters.assignee) phQ = phQ.ilike('assignee_display_name', `%${filters.assignee}%`);
      if (filters.type) phQ = phQ.ilike('issue_type', filters.type.replace('_', ' '));

      let catQ: any = (supabase as any)
        .from('catalyst_issues')
        .select(CAT_SELECT)
        .or(`issue_key.ilike.%${query}%,title.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (filters.project) catQ = catQ.eq('projects.key', filters.project);
      if (filters.type) catQ = catQ.ilike('issue_type', filters.type.replace('_', ' '));

      const [phRes, catRes] = await Promise.all([phQ, catQ]);
      if (phRes.error) throw phRes.error;
      const jira = (phRes.data ?? []).map(mapIssueToSearchResult);
      const cat = (catRes.data ?? []).map(mapCatalystToSearchResult);
      return mergeJiraWins(jira, cat, 50);
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

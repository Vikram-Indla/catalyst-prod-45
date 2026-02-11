/**
 * WorkHub Work Items — TanStack Query Hooks
 * Reads from wh_issues (real Jira-synced data) with server-side pagination
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Shape matching wh_issues table columns */
export interface JiraIssue {
  issue_key: string;
  project_key: string;
  issue_type: string;
  summary: string;
  status: string;
  status_category: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  parent_key: string | null;
  hierarchy_level: number;
  fix_versions: any[];
  due_date: string | null;
  effective_due_date: string | null;
  effective_due_source: string | null;
  labels: string[];
  components: string[];
  priority: string;
  story_points: number | null;
  sprint_name: string | null;
  resolution: string | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  synced_at: string | null;
}

export interface WorkItemFilterConfig {
  types?: string[];
  statuses?: string[];
  project_keys?: string[];
  search_query?: string;
  priorities?: string[];
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

const QUERY_OPTIONS = { staleTime: 30_000, refetchInterval: 60_000 };

/** Build a filtered query (reusable for both data + count) */
function buildFilteredQuery(
  baseQuery: any,
  filters?: Partial<WorkItemFilterConfig>,
) {
  let q = baseQuery;
  if (filters?.types?.length) q = q.in('issue_type', filters.types);
  if (filters?.statuses?.length) q = q.in('status', filters.statuses);
  if (filters?.project_keys?.length) q = q.in('project_key', filters.project_keys);
  if (filters?.priorities?.length) q = q.in('priority', filters.priorities);
  if (filters?.search_query) {
    const s = filters.search_query;
    q = q.or(`summary.ilike.%${s}%,issue_key.ilike.%${s}%`);
  }
  return q;
}

/**
 * Paginated work items from wh_issues with server-side count.
 */
export function useWorkItems(
  filters?: Partial<WorkItemFilterConfig>,
  pagination?: PaginationConfig,
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;

  return useQuery({
    queryKey: ['workhub', 'work-items', filters, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('wh_issues')
        .select('*', { count: 'exact' })
        .order('project_key')
        .order('issue_key')
        .range(from, to);

      q = buildFilteredQuery(q, filters);

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as JiraIssue[],
        totalCount: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
    placeholderData: keepPreviousData,
    ...QUERY_OPTIONS,
  });
}

/** Distinct project keys from wh_issues for filter dropdown */
export function useIssueProjectKeys() {
  return useQuery({
    queryKey: ['workhub', 'issue-project-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_issues')
        .select('project_key')
        .order('project_key');

      if (error) throw new Error(error.message);

      // Deduplicate
      const keys = [...new Set((data ?? []).map(d => d.project_key))];
      return keys;
    },
    staleTime: 60_000,
  });
}

/** Distinct issue types from wh_issues for filter pills */
export function useIssueTypes() {
  return useQuery({
    queryKey: ['workhub', 'issue-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_issues')
        .select('issue_type')
        .order('issue_type');

      if (error) throw new Error(error.message);

      const types = [...new Set((data ?? []).map(d => d.issue_type))];
      return types;
    },
    staleTime: 60_000,
  });
}

/** Distinct statuses from wh_issues */
export function useIssueStatuses() {
  return useQuery({
    queryKey: ['workhub', 'issue-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_issues')
        .select('status')
        .order('status');

      if (error) throw new Error(error.message);

      const statuses = [...new Set((data ?? []).map(d => d.status))];
      return statuses;
    },
    staleTime: 60_000,
  });
}

export function useUpdateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueKey, field, value }: { issueKey: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('wh_issues')
        .update({ [field]: value })
        .eq('issue_key', issueKey);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });
}

export function useBulkUpdateWorkItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueKeys, field, value }: { issueKeys: string[]; field: string; value: string }) => {
      const { error } = await supabase
        .from('wh_issues')
        .update({ [field]: value })
        .in('issue_key', issueKeys);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['workhub'] });
      toast.success(`Updated ${vars.issueKeys.length} items`);
    },
    onError: (err: Error) => {
      toast.error(`Bulk update failed: ${err.message}`);
    },
  });
}

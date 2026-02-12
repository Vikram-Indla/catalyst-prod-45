/**
 * WorkHub Work Items — TanStack Query Hooks
 * Reads from wh_issues (real Jira-synced data) with server-side pagination
 * Supports hierarchy tree view (Epic → Story → Sub-task)
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
  parent_summary: string | null;
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
  type_icon_url: string | null;
  description_adf: any | null;
  description_text: string | null;
  comments: JiraComment[];
  changelog: any[];
}

export interface JiraComment {
  id: string;
  author: string;
  authorAvatar: string | null;
  body: string;
  created: string;
  updated: string;
}

export interface WorkItemFilterConfig {
  types?: string[];
  statuses?: string[];
  project_keys?: string[];
  search_query?: string;
  priorities?: string[];
  fix_version_names?: string[];
  theme_ids?: string[];
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
}

/** A tree node wrapping a JiraIssue */
export interface WorkItemTreeNode {
  item: JiraIssue;
  children: WorkItemTreeNode[];
  depth: number;
  isExpanded?: boolean;
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
  if (filters?.theme_ids?.length) q = q.in('theme_id', filters.theme_ids);
  if (filters?.search_query) {
    const s = filters.search_query;
    q = q.or(`summary.ilike.%${s}%,issue_key.ilike.%${s}%`);
  }
  // fix_version_names filter: use containedBy on jsonb array elements
  // We filter client-side after fetch since JSONB array element filtering is complex in PostgREST
  return q;
}

/**
 * Build a hierarchy tree from flat items.
 * Items are sorted by jira_updated_at DESC.
 */
export function buildTree(items: JiraIssue[]): WorkItemTreeNode[] {
  const map = new Map<string, WorkItemTreeNode>();
  const roots: WorkItemTreeNode[] = [];

  // Create nodes
  items.forEach(item => {
    map.set(item.issue_key, { item, children: [], depth: 0 });
  });

  // Link children to parents
  items.forEach(item => {
    const node = map.get(item.issue_key)!;
    if (item.parent_key && map.has(item.parent_key)) {
      const parent = map.get(item.parent_key)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by updated date desc
  const sortChildren = (nodes: WorkItemTreeNode[]) => {
    nodes.sort((a, b) => {
      const aDate = a.item.jira_updated_at || '';
      const bDate = b.item.jira_updated_at || '';
      return bDate.localeCompare(aDate);
    });
    nodes.forEach(n => sortChildren(n.children));
  };

  sortChildren(roots);
  return roots;
}

/** Flatten tree into display order */
export function flattenTree(nodes: WorkItemTreeNode[], expandedKeys: Set<string>): WorkItemTreeNode[] {
  const result: WorkItemTreeNode[] = [];
  const walk = (list: WorkItemTreeNode[]) => {
    list.forEach(node => {
      result.push(node);
      if (node.children.length > 0 && expandedKeys.has(node.item.issue_key)) {
        walk(node.children);
      }
    });
  };
  walk(nodes);
  return result;
}

/**
 * Paginated work items from wh_issues sorted by jira_updated_at DESC.
 */
export function useWorkItems(
  filters?: Partial<WorkItemFilterConfig>,
  pagination?: PaginationConfig,
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;
  const hasVersionFilter = (filters?.fix_version_names?.length ?? 0) > 0;

  return useQuery({
    queryKey: ['workhub', 'work-items', filters, page, pageSize],
    queryFn: async () => {
      // When fix_version_names filter is active, we need to fetch more and filter client-side
      // because PostgREST doesn't support filtering inside JSONB array elements easily
      if (hasVersionFilter) {
        // Paginated scan to collect ALL matching items, then filter by version client-side
        const allItems: JiraIssue[] = [];
        const batchSize = 1000;
        let batchPage = 0;
        let hasMore = true;

        while (hasMore) {
          const from = batchPage * batchSize;
          const to = from + batchSize - 1;
          let q = supabase
            .from('wh_issues')
            .select('*')
            .order('jira_updated_at', { ascending: false })
            .range(from, to);

          q = buildFilteredQuery(q, filters);

          const { data, error } = await q;
          if (error) throw new Error(error.message);
          if (!data || data.length === 0) break;
          allItems.push(...(data as unknown as JiraIssue[]));
          hasMore = data.length === batchSize;
          batchPage++;
        }

        const versionNames = new Set(filters!.fix_version_names!);
        const filtered = allItems.filter(item => {
          if (!Array.isArray(item.fix_versions) || item.fix_versions.length === 0) return false;
          return item.fix_versions.some((v: any) => versionNames.has(v.name));
        });

        const from = page * pageSize;
        const paged = filtered.slice(from, from + pageSize);

        return {
          items: paged,
          totalCount: filtered.length,
          page,
          pageSize,
          totalPages: Math.ceil(filtered.length / pageSize),
        };
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from('wh_issues')
        .select('*', { count: 'exact' })
        .order('jira_updated_at', { ascending: false })
        .range(from, to);

      q = buildFilteredQuery(q, filters);

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);

      return {
        items: (data ?? []) as unknown as JiraIssue[],
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

/** Distinct fix version names from wh_issues for filter dropdown */
export function useIssueFixVersions() {
  return useQuery({
    queryKey: ['workhub', 'issue-fix-versions'],
    queryFn: async () => {
      // Paginated scan to extract all unique version names from JSONB
      const allVersions = new Map<string, { name: string; releaseDate?: string }>();
      let page = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('wh_issues')
          .select('fix_versions')
          .not('fix_versions', 'eq', '[]')
          .range(page * batchSize, (page + 1) * batchSize - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;

        data.forEach((row: any) => {
          if (Array.isArray(row.fix_versions)) {
            row.fix_versions.forEach((v: any) => {
              if (v?.name && !allVersions.has(v.name)) {
                allVersions.set(v.name, { name: v.name, releaseDate: v.releaseDate });
              }
            });
          }
        });

        hasMore = data.length === batchSize;
        page++;
      }

      // Sort by releaseDate desc, then name
      return Array.from(allVersions.values())
        .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '') || a.name.localeCompare(b.name));
    },
    staleTime: 120_000,
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

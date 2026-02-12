/**
 * ProjectHub Work Items — TanStack Query Hooks
 * Reads from ph_issues (real Jira-synced data) with server-side pagination
 * Supports hierarchy tree view (Epic → Story → Sub-task)
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface WorkItemTreeNode {
  item: JiraIssue;
  children: WorkItemTreeNode[];
  depth: number;
  isExpanded?: boolean;
}

const QUERY_OPTIONS = { staleTime: 30_000, refetchInterval: 60_000 };

function buildFilteredQuery(baseQuery: any, filters?: Partial<WorkItemFilterConfig>) {
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
  return q;
}

export function buildTree(items: JiraIssue[]): WorkItemTreeNode[] {
  const map = new Map<string, WorkItemTreeNode>();
  const roots: WorkItemTreeNode[] = [];
  items.forEach(item => {
    map.set(item.issue_key, { item, children: [], depth: 0 });
  });
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

export function useWorkItems(
  filters?: Partial<WorkItemFilterConfig>,
  pagination?: PaginationConfig,
) {
  const page = pagination?.page ?? 0;
  const pageSize = pagination?.pageSize ?? 50;
  const hasVersionFilter = (filters?.fix_version_names?.length ?? 0) > 0;

  return useQuery({
    queryKey: ['projecthub', 'work-items', filters, page, pageSize],
    queryFn: async () => {
      if (hasVersionFilter) {
        // Use server-side JSONB containment for each version name
        // Build an OR filter using PostgREST contains operator
        const versionNames = filters!.fix_version_names!;
        
        // For a single version, use contains directly
        // For multiple, we need to do parallel queries and merge
        const allItems: JiraIssue[] = [];
        
        for (const vName of versionNames) {
          let batchPage = 0;
          let hasMore = true;
          const batchSize = 1000;
          while (hasMore) {
            const from = batchPage * batchSize;
            const to = from + batchSize - 1;
            let q = supabase
              .from('ph_issues')
              .select('*')
              .contains('fix_versions', JSON.stringify([{ name: vName }]))
              .order('jira_updated_at', { ascending: false })
              .range(from, to);
            // Apply other filters (not fix_version_names)
            const otherFilters = { ...filters, fix_version_names: undefined };
            q = buildFilteredQuery(q, otherFilters);
            const { data, error } = await q;
            if (error) throw new Error(error.message);
            if (!data || data.length === 0) break;
            allItems.push(...(data as unknown as JiraIssue[]));
            hasMore = data.length === batchSize;
            batchPage++;
          }
        }
        
        // Deduplicate by issue_key (item may match multiple versions)
        const seen = new Set<string>();
        const unique = allItems.filter(item => {
          if (seen.has(item.issue_key)) return false;
          seen.add(item.issue_key);
          return true;
        });
        
        // Sort by jira_updated_at desc
        unique.sort((a, b) => (b.jira_updated_at || '').localeCompare(a.jira_updated_at || ''));
        
        const from = page * pageSize;
        const paged = unique.slice(from, from + pageSize);
        return {
          items: paged,
          totalCount: unique.length,
          page,
          pageSize,
          totalPages: Math.ceil(unique.length / pageSize),
        };
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      let q = supabase
        .from('ph_issues')
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

export function useIssueFixVersions() {
  return useQuery({
    queryKey: ['projecthub', 'issue-fix-versions'],
    queryFn: async () => {
      const allVersions = new Map<string, { name: string; releaseDate?: string }>();
      let page = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('ph_issues')
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
      return Array.from(allVersions.values())
        .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '') || a.name.localeCompare(b.name));
    },
    staleTime: 120_000,
  });
}

export function useIssueProjectKeys() {
  return useQuery({
    queryKey: ['projecthub', 'issue-project-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('project_key')
        .order('project_key');
      if (error) throw new Error(error.message);
      const keys = [...new Set((data ?? []).map(d => d.project_key))];
      return keys;
    },
    staleTime: 60_000,
  });
}

export function useIssueTypes() {
  return useQuery({
    queryKey: ['projecthub', 'issue-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .order('issue_type');
      if (error) throw new Error(error.message);
      const types = [...new Set((data ?? []).map(d => d.issue_type))];
      return types;
    },
    staleTime: 60_000,
  });
}

export function useIssueStatuses() {
  return useQuery({
    queryKey: ['projecthub', 'issue-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
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
        .from('ph_issues')
        .update({ [field]: value })
        .eq('issue_key', issueKey);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projecthub'] });
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
        .from('ph_issues')
        .update({ [field]: value })
        .in('issue_key', issueKeys);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['projecthub'] });
      toast.success(`Updated ${vars.issueKeys.length} items`);
    },
    onError: (err: Error) => {
      toast.error(`Bulk update failed: ${err.message}`);
    },
  });
}

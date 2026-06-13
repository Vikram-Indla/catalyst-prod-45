/**
 * useJQLFilteredIssues — execute a JQL string against ph_issues with optional
 * project scoping, pagination, and currentUser() resolution.
 *
 * Similar to useJqlResults but designed for embedded filter panels:
 *   - optional projectKey constraint (omit for cross-project search)
 *   - configurable select columns
 *   - exposes activeFilters for downstream rendering
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { translate, parseOrderBy } from '@/lib/jql';
import { applyJQLFilters } from '@/lib/jql-supabase';
import type { JqlFilter } from '@/lib/jql';

const DEFAULT_SELECT = `
  id, issue_key, summary, status, status_category, issue_type,
  assignee_display_name, project_key, jira_created_at, jira_updated_at,
  due_date, effective_due_date, priority, parent_key, parent_summary,
  sprint_name, labels, resolution
`.trim();

export interface JQLFilteredIssuesOptions {
  /** Constrain to a single project key (e.g. "BAU"). Omit for cross-project. */
  projectKey?: string;
  /** JQL string to execute */
  jql: string;
  /** Max rows (default 100) */
  limit?: number;
  /** Pagination offset (default 0) */
  offset?: number;
  /**
   * Pre-resolved display name for currentUser() substitution.
   * Obtain via useCurrentUserDisplayName() and pass here so the hook
   * stays synchronous — no nested async user lookups.
   */
  currentUserDisplayName?: string | null;
  /** Skip the query entirely (default false) */
  enabled?: boolean;
  /** Custom select string (defaults to DEFAULT_SELECT) */
  select?: string;
}

export interface JQLFilteredIssuesResult {
  data: Record<string, unknown>[];
  isLoading: boolean;
  /** True while a background refetch is in progress (stale data is still shown). */
  isFetching: boolean;
  error: Error | null;
  /** Total row count from Supabase count:exact */
  count: number;
  /** Parsed filter descriptors (useful for rendering active-filter chips) */
  activeFilters: JqlFilter[];
  refetch: () => void;
}

export function useJQLFilteredIssues(opts: JQLFilteredIssuesOptions): JQLFilteredIssuesResult {
  const {
    projectKey,
    jql,
    limit = 100,
    offset = 0,
    currentUserDisplayName,
    enabled = true,
    select = DEFAULT_SELECT,
  } = opts;

  const trimmed = jql.trim();
  const activeFilters = trimmed ? translate(trimmed) : [];

  const query = useQuery({
    queryKey: ['jql-filtered-issues', projectKey ?? null, trimmed, limit, offset, currentUserDisplayName ?? null, select],
    queryFn: async () => {
      let q = supabase
        .from('ph_issues')
        .select(select, { count: 'exact' })
        .is('jira_removed_at', null)
        .is('deleted_at', null);

      if (projectKey) q = q.eq('project_key', projectKey);

      if (activeFilters.length > 0) {
        q = applyJQLFilters(q, activeFilters, {
          currentUserName: currentUserDisplayName ?? undefined,
        });
      }

      const order = parseOrderBy(trimmed) ?? { column: 'jira_updated_at', ascending: false };
      q = q.order(order.column, { ascending: order.ascending });

      const { data, error, count } = await q.range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return { rows: (data ?? []) as unknown as Record<string, unknown>[], total: count ?? 0 };
    },
    enabled: enabled,
    staleTime: 15_000,
    placeholderData: prev => prev,
  });

  return {
    data: query.data?.rows ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    count: query.data?.total ?? 0,
    activeFilters,
    refetch: query.refetch,
  };
}

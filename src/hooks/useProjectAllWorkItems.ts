import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkItem {
  id: string;        // issue_key (e.g. "BAU-123") — used by openDetail
  key: string;       // same as id — the Jira issue key
  summary: string;
  type: string;
  status: string;
  status_category: string;
  priority: string;
  assignee?: string;
  assignee_account_id?: string;
  parent_key?: string;
  parent_summary?: string;
  hierarchy_level?: number;
  jira_created_at?: string;
  jira_updated_at?: string;
  story_points?: number | null;
  sprint_name?: string | null;
  fix_versions?: unknown;
  labels?: unknown;
  severity?: string | null;
}

export interface Filters {
  status?: string;
  type?: string;
  priority?: string;
  assignee?: string;
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

// CLAUDE.md guardrail: only 2026+ data
const YEAR_BOUNDARY = '2026-01-01T00:00:00Z';

export function useProjectAllWorkItems(
  projectKey: string,
  initialFilters?: Partial<Filters>
) {
  const [filters, setFilters] = useState<Filters>({
    status: initialFilters?.status,
    type: initialFilters?.type,
    priority: initialFilters?.priority,
    assignee: initialFilters?.assignee,
  });

  const [sort, setSort] = useState<Sort>({
    field: 'jira_created_at',
    order: 'desc',
  });

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['project-all-work', projectKey, filters, sort],
    queryFn: async (): Promise<WorkItem[]> => {
      let query = (supabase as any)
        .from('ph_issues')
        .select(
          'issue_key, summary, issue_type, status, status_category, priority, ' +
          'assignee_display_name, assignee_account_id, parent_key, parent_summary, ' +
          'hierarchy_level, jira_created_at, jira_updated_at, story_points, ' +
          'sprint_name, fix_versions, labels, severity'
        )
        .eq('project_key', projectKey)
        .is('deleted_at', null)
        .is('jira_removed_at', null)
        // 2026 data guardrail (CLAUDE.md — non-negotiable)
        .or(`jira_created_at.gte.${YEAR_BOUNDARY},jira_updated_at.gte.${YEAR_BOUNDARY}`)
        .order(sort.field, { ascending: sort.order === 'asc' })
        .limit(1000);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.type) {
        query = query.eq('issue_type', filters.type);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignee) {
        query = query.ilike('assignee_display_name', `%${filters.assignee}%`);
      }

      const { data: rows, error: qErr } = await query;
      if (qErr) throw qErr;

      return (rows ?? []).map((r: any): WorkItem => ({
        id: r.issue_key,          // issue_key is the detail-router key
        key: r.issue_key,
        summary: r.summary ?? '',
        type: r.issue_type ?? '',
        status: r.status ?? '',
        status_category: r.status_category ?? '',
        priority: r.priority ?? 'Medium',
        assignee: r.assignee_display_name ?? undefined,
        assignee_account_id: r.assignee_account_id ?? undefined,
        parent_key: r.parent_key ?? undefined,
        parent_summary: r.parent_summary ?? undefined,
        hierarchy_level: r.hierarchy_level ?? undefined,
        jira_created_at: r.jira_created_at ?? undefined,
        jira_updated_at: r.jira_updated_at ?? undefined,
        story_points: r.story_points ?? null,
        sprint_name: r.sprint_name ?? null,
        fix_versions: r.fix_versions,
        labels: r.labels,
        severity: r.severity ?? null,
      }));
    },
    staleTime: 2 * 60_000,
    enabled: !!projectKey,
  });

  return {
    items: data,
    filters,
    setFilters,
    sort,
    setSort,
    isLoading,
    error: error ?? null,
    refetch,
  };
}

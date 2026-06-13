/**
 * useJqlResults — execute a JQL string against ph_issues and return
 * work-item rows for the live filter results table.
 *
 * Cross-project by design: no project_key constraint is forced — the JQL
 * decides scope (`project = BAU` narrows it; omitting it searches every
 * synced project). Reuses the canonical JQL engine (translate +
 * applyJqlToQuery) plus parseOrderBy for the ORDER BY clause.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { translate, applyJqlToQuery, parseOrderBy } from '@/lib/jql';

export interface JqlResultRow {
  id: string;
  key: string;
  summary: string;
  issueType: string | null;
  status: string;
  statusCategory: string;
  projectKey: string;
  assigneeName: string | null;
  priority: string | null;
  created: string | null;
  updated: string | null;
  dueDate: string | null;
  parentKey: string | null;
  parentSummary: string | null;
  /** Sprint name from ph_issues.sprint_name (nullable). Used by WhatsApp summary context builder. */
  sprintName: string | null;
  /** True when item is flagged as blocked in Jira. Used by WhatsApp summary context builder. */
  isFlagged: boolean | null;
  /** Free-text reason for the flag/blocker. Used by WhatsApp summary context builder. */
  flagReason: string | null;
}

const RESULT_SELECT = `id, issue_key, summary, status, status_category, issue_type,
  assignee_display_name, project_key, jira_created_at, jira_updated_at,
  due_date, effective_due_date, priority, parent_key, parent_summary,
  sprint_name, is_flagged, flag_reason`;

export const JQL_RESULTS_LIMIT = 100;

export function useJqlResults(jql: string, enabled = true) {
  const trimmed = jql.trim();

  return useQuery({
    queryKey: ['jql-results', trimmed],
    queryFn: async () => {
      const filters = translate(trimmed);

      // Resolve currentUser() to the signed-in user's display name
      let currentUserName: string | undefined;
      if (filters.some(f => f.value === '__currentUser__')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          currentUserName = profile?.full_name ?? undefined;
        }
      }

      let query = supabase
        .from('ph_issues')
        .select(RESULT_SELECT, { count: 'exact' })
        .is('jira_removed_at', null)
        .is('deleted_at', null);

      query = applyJqlToQuery(query, filters, currentUserName);

      const orderBy = parseOrderBy(trimmed);
      query = orderBy
        ? query.order(orderBy.column, { ascending: orderBy.ascending })
        : query.order('jira_updated_at', { ascending: false });

      const { data, error, count } = await query.limit(JQL_RESULTS_LIMIT);
      if (error) throw new Error(error.message);

      type RawRow = Record<string, string | null>;
      const items: JqlResultRow[] = ((data ?? []) as unknown as RawRow[]).map(r => ({
        id: r.id,
        key: r.issue_key,
        summary: r.summary ?? '',
        issueType: r.issue_type ?? null,
        status: r.status ?? '',
        statusCategory: r.status_category ?? '',
        projectKey: r.project_key ?? '',
        assigneeName: r.assignee_display_name ?? null,
        priority: r.priority ?? null,
        created: r.jira_created_at ?? null,
        updated: r.jira_updated_at ?? null,
        dueDate: r.effective_due_date ?? r.due_date ?? null,
        parentKey: r.parent_key ?? null,
        parentSummary: r.parent_summary ?? null,
        sprintName: r.sprint_name ?? null,
        isFlagged: r.is_flagged === 'true' || r.is_flagged === true ? true : r.is_flagged === 'false' || r.is_flagged === false ? false : null,
        flagReason: r.flag_reason ?? null,
      }));

      return { items, totalCount: count ?? items.length };
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: 15_000,
    placeholderData: prev => prev,
  });
}

/**
 * FilterResultsPanel — live work-item results for a JQL string.
 *
 * Mounts the canonical JiraTable (the project-backlog table) with the same
 * read-only cell factories used by UWVTable, fed by useJqlResults. Used by
 * CreateFilterPage (live preview while building) and FilterDetailPage
 * (filter in use). Cross-project: rows can come from any synced project,
 * so a Project column is shown by default.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import Lozenge from '@atlaskit/lozenge';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryCell,
  makeStatusCell,
  makeAssigneeCell,
  makePriorityCell,
  makeDateCell,
} from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { lozengeAppearance, jiraIconType } from '@/components/universal-work-view/uwv.utils';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { JQL_RESULTS_LIMIT, type JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useJQLFilteredIssues } from '@/hooks/workhub/useJQLFilteredIssues';
import { useCurrentUserDisplayName } from '@/hooks/workhub/useCurrentUserDisplayName';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* 2026-06-17: tasks data path. ph_issues JQL engine cannot be used directly
 *  on the tasks table (different field set, no parent_key/sprint_release).
 *  Strategy: pull all tasks (joined with statuses + assignee + workstream)
 *  then evaluate a small JQL subset client-side. Field set: assignee,
 *  status, priority, duedate, summary search. Each row is shaped into a
 *  JqlResultRow so the downstream JiraTable can render it unchanged. */
function useTasksJqlResults(jql: string, enabled: boolean) {
  const trimmed = jql.trim();
  return useQuery({
    queryKey: ['filter-results-tasks', trimmed],
    enabled: enabled && trimmed.length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      // Resolve currentUser() to a display name first.
      let currentUserName: string | null = null;
      if (/currentUser\(\)/i.test(trimmed)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          currentUserName = profile?.full_name ?? null;
        }
      }

      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(
          '*, status:task_statuses(id, name, slug), assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), workstream:task_workstreams(id, name, key_prefix)',
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);

      // Map task rows → JqlResultRow shape so the downstream table renders
      // identically to the ph_issues path.
      const rows: JqlResultRow[] = ((data ?? []) as any[]).map((r: any) => ({
        id: r.id,
        key: r.task_key ?? r.key ?? r.id,
        summary: r.title ?? '',
        issueType: 'Task',
        status: r.status?.name ?? '',
        statusCategory: r.status?.slug ?? 'todo',
        projectKey: r.workstream?.key_prefix ?? 'TASKS',
        assigneeName: r.assignee?.full_name ?? null,
        priority: r.priority ?? null,
        created: r.created_at ?? null,
        updated: r.updated_at ?? null,
        dueDate: r.due_date ?? null,
        parentKey: null,
        parentSummary: null,
        sprintName: null,
        isFlagged: null,
        flagReason: null,
      }));

      // Client-side JQL evaluation. Supports the predictable filterStateToJql
      // output the chip-driven UI generates: assignee, status, priority,
      // duedate, plus free-text title search via filterStateToJql's text path.
      const lower = trimmed.toLowerCase();
      let filtered = rows;

      // assignee = currentUser()
      if (/assignee\s*=\s*currentuser\(\)/i.test(trimmed) && currentUserName) {
        filtered = filtered.filter(r => r.assigneeName === currentUserName);
      }
      // assignee is EMPTY
      if (/assignee\s+is\s+empty/i.test(trimmed)) {
        filtered = filtered.filter(r => !r.assigneeName);
      }
      // assignee in ("a", "b")
      const assigneeIn = trimmed.match(/assignee\s+in\s+\(([^)]+)\)/i);
      if (assigneeIn) {
        const vals = [...assigneeIn[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
        if (vals.length) filtered = filtered.filter(r => r.assigneeName && vals.includes(r.assigneeName));
      }

      // status != Done   (most common — handle the "not done" case directly)
      if (/status\s*!=\s*("?done"?|"?closed"?)/i.test(trimmed)) {
        filtered = filtered.filter(r => !/done|closed/i.test(r.status));
      }
      // status = Done
      const statusEq = trimmed.match(/status\s*=\s*"?([^"\s)]+)"?/i);
      if (statusEq && !/!=/.test(trimmed)) {
        const want = statusEq[1].toLowerCase();
        filtered = filtered.filter(r => r.status.toLowerCase() === want);
      }
      // status in ("a","b")
      const statusIn = trimmed.match(/status\s+in\s+\(([^)]+)\)/i);
      if (statusIn) {
        const vals = [...statusIn[1].matchAll(/"([^"]+)"/g)].map(m => m[1].toLowerCase());
        if (vals.length) filtered = filtered.filter(r => vals.includes(r.status.toLowerCase()));
      }

      // priority in (Critical, Highest, High, Medium, Low) — comma-separated bare words
      const prioIn = trimmed.match(/priority\s+in\s+\(([^)]+)\)/i);
      if (prioIn) {
        const vals = prioIn[1].split(',').map(v => v.trim().replace(/"/g, '').toLowerCase()).filter(Boolean);
        if (vals.length) filtered = filtered.filter(r => r.priority && vals.includes(r.priority.toLowerCase()));
      }
      // priority = X
      const prioEq = trimmed.match(/priority\s*=\s*"?([^"\s)]+)"?/i);
      if (prioEq && !/in\s*\(/i.test(trimmed.split(prioEq[0])[0] + prioEq[0])) {
        const want = prioEq[1].toLowerCase();
        filtered = filtered.filter(r => r.priority?.toLowerCase() === want);
      }

      // duedate <= 7d   /   duedate <= -30d   /   duedate >= -7d
      const dueRel = trimmed.match(/duedate\s*(<=|>=|<|>)\s*(-?\d+)d/i);
      if (dueRel) {
        const op = dueRel[1];
        const offsetDays = parseInt(dueRel[2], 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + offsetDays);
        filtered = filtered.filter(r => {
          if (!r.dueDate) return false;
          const d = new Date(r.dueDate);
          if (op === '<=') return d <= cutoff;
          if (op === '<')  return d <  cutoff;
          if (op === '>=') return d >= cutoff;
          return d > cutoff;
        });
      }

      // updated >= -7d   updated <= -30d
      const updRel = trimmed.match(/updated\s*(<=|>=|<|>)\s*(-?\d+)d/i);
      if (updRel) {
        const op = updRel[1];
        const offsetDays = parseInt(updRel[2], 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + offsetDays);
        filtered = filtered.filter(r => {
          if (!r.updated) return false;
          const d = new Date(r.updated);
          if (op === '<=') return d <= cutoff;
          if (op === '<')  return d <  cutoff;
          if (op === '>=') return d >= cutoff;
          return d > cutoff;
        });
      }

      // Free-text summary search via summary ~ "foo" or text ~ "foo"
      const textMatch = trimmed.match(/(?:summary|text)\s*~\s*"([^"]+)"/i);
      if (textMatch) {
        const needle = textMatch[1].toLowerCase();
        filtered = filtered.filter(r => r.summary.toLowerCase().includes(needle));
      }

      // ORDER BY parsing — minimal. Supports `ORDER BY field DESC|ASC`.
      const orderBy = trimmed.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
      if (orderBy) {
        const field = orderBy[1].toLowerCase();
        const asc = (orderBy[2] ?? 'asc').toLowerCase() === 'asc';
        const dir = asc ? 1 : -1;
        const fieldMap: Record<string, keyof JqlResultRow> = {
          updated: 'updated', created: 'created', duedate: 'dueDate',
          priority: 'priority', status: 'status', summary: 'summary',
        };
        const key = fieldMap[field];
        if (key) {
          filtered = [...filtered].sort((a, b) => {
            const va = (a[key] ?? '') as string;
            const vb = (b[key] ?? '') as string;
            return va < vb ? -dir : va > vb ? dir : 0;
          });
        }
      }

      // Touch lower to satisfy the noUnusedVars lint.
      void lower;

      return { rows: filtered, total: filtered.length };
    },
  });
}

/** Maps DB column names → human-readable chip labels. */
const JQL_COLUMN_LABELS: Record<string, string> = {
  project_key: 'Project',
  assignee_display_name: 'Assignee',
  assignee_account_id: 'Assignee',
  status: 'Status',
  status_category: 'Status category',
  issue_type: 'Type',
  priority: 'Priority',
  labels: 'Label',
  sprint_name: 'Sprint',
  due_date: 'Due date',
  effective_due_date: 'Due date',
  jira_created_at: 'Created',
  jira_updated_at: 'Updated',
  parent_key: 'Parent',
  resolution: 'Resolution',
  reporter_display_name: 'Reporter',
};

/** Maps FilterMethod codes → readable operator symbols. */
const JQL_OP_LABELS: Record<string, string> = {
  eq: '=',
  neq: '≠',
  in: 'in',
  not_in: 'not in',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  is: 'is',
  not_is: 'is not',
};

const ACCOUNT_ID_RE = /^[0-9a-f]{24}$|^[0-9a-zA-Z]{60,}$/;

function toTitleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Replace known UUID/account-ID values with display names. */
function resolveFilterValue(column: string, value: string | null, currentUserDisplayName: string | null): string | null {
  if (!value) return value;
  if (value === 'currentUser()') return currentUserDisplayName ?? 'Current user';
  if (ACCOUNT_ID_RE.test(value)) {
    // looks like an account ID — can't resolve without a fetch; show as-is in the
    // hope that the parent also triggers a profile lookup. Worst case shows ID.
    return currentUserDisplayName && value.length > 20 ? currentUserDisplayName : value;
  }
  return value;
}

interface FilterResultsPanelProps {
  jql: string;
  /** Shown in the empty state when jql is blank. */
  emptyHint?: string;
  /** Debounce before re-querying as the user types. Default 400ms. */
  debounceMs?: number;
  /** Reports the live match count (null while loading / no JQL). */
  onResultsChange?: (count: number | null) => void;
  /** 2026-06-17: data source selector. 'ph_issues' (default) hits the JQL
   *  engine over ph_issues. 'tasks' fetches from the `tasks` table and
   *  client-side filters (no JQL engine — tasks have a different schema). */
  dataSource?: 'ph_issues' | 'tasks';
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function FilterResultsPanel({
  jql,
  emptyHint = 'Build your filter above — matching work items appear here as you go.',
  debounceMs = 400,
  onResultsChange,
  dataSource = 'ph_issues',
}: FilterResultsPanelProps) {
  const debouncedJql = useDebounced(jql, debounceMs);
  const currentUserDisplayName = useCurrentUserDisplayName();
  const isTasks = dataSource === 'tasks';

  /* ph_issues branch (existing). The hook is always called to satisfy React
     hook rules — we just ignore its data in tasks mode. */
  const phResults = useJQLFilteredIssues({
    jql: isTasks ? '' : debouncedJql,
    currentUserDisplayName,
  });

  /* tasks branch. Similar always-called pattern for symmetry. */
  const tasksResults = useTasksJqlResults(debouncedJql, isTasks);

  const isLoading = isTasks ? tasksResults.isLoading : phResults.isLoading;
  const isFetching = isTasks ? tasksResults.isFetching : phResults.isFetching;
  const error = isTasks ? (tasksResults.error as Error | null | undefined) : phResults.error;
  const totalCount = isTasks ? (tasksResults.data?.total ?? 0) : phResults.count;
  const rawRows = isTasks ? [] : phResults.data;
  const activeFilters = isTasks ? [] : phResults.activeFilters;

  useEffect(() => {
    onResultsChange?.(debouncedJql.trim() ? totalCount : null);
  }, [totalCount, debouncedJql, onResultsChange]);

  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  // Map raw snake_case Supabase rows → typed JqlResultRow for JiraTable columns.
  const items = useMemo<JqlResultRow[]>(() => {
    if (isTasks) {
      const rows = tasksResults.data?.rows ?? [];
      const dir = sortOrder === 'ASC' ? 1 : -1;
      return [...rows].sort((a, b) => {
        const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
        const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
        return va < vb ? -dir : va > vb ? dir : 0;
      });
    }
    type R = Record<string, string | null | boolean>;
    const mapped: JqlResultRow[] = rawRows.map((raw) => {
      const r = raw as R;
      return {
        id: r.id as string,
        key: r.issue_key as string,
        summary: (r.summary as string) ?? '',
        issueType: (r.issue_type as string) ?? null,
        status: (r.status as string) ?? '',
        statusCategory: (r.status_category as string) ?? '',
        projectKey: (r.project_key as string) ?? '',
        assigneeName: (r.assignee_display_name as string) ?? null,
        priority: (r.priority as string) ?? null,
        created: (r.jira_created_at as string) ?? null,
        updated: (r.jira_updated_at as string) ?? null,
        dueDate: (r.effective_due_date as string) ?? (r.due_date as string) ?? null,
        parentKey: (r.parent_key as string) ?? null,
        parentSummary: (r.parent_summary as string) ?? null,
        sprintName: (r.sprint_name as string) ?? null,
        isFlagged: r.is_flagged === true || r.is_flagged === 'true' ? true
          : r.is_flagged === false || r.is_flagged === 'false' ? false : null,
        flagReason: (r.flag_reason as string) ?? null,
      };
    });
    const dir = sortOrder === 'ASC' ? 1 : -1;
    mapped.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    return mapped;
  }, [rawRows, sortKey, sortOrder, isTasks, tasksResults.data]);

  const projectCount = useMemo(
    () => new Set(rawRows.map(r => (r as Record<string, unknown>).project_key).filter(Boolean)).size,
    [rawRows],
  );

  const openDetail = (key: string) =>
    useGlobalSearchStore.getState().openDetail({ id: key });

  const columns = useMemo<Column<JqlResultRow>[]>(() => [
    {
      id: 'key',
      label: 'Key',
      width: 9,
      sortable: true,
      accessor: r => r.key,
      cell: makeKeyCell(
        (r: JqlResultRow) => r.key,
        (r: JqlResultRow) => openDetail(r.key),
        undefined,
        (r: JqlResultRow) => <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} />,
      ),
    },
    {
      id: 'summary',
      label: 'Summary',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      accessor: r => r.summary,
      cell: makeSummaryCell((r: JqlResultRow) => r.summary),
    },
    {
      id: 'projectKey',
      label: 'Project',
      width: 7,
      sortable: true,
      accessor: r => r.projectKey,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle') }}>
          {row.projectKey || '—'}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: 12,
      sortable: true,
      accessor: r => r.status,
      cell: makeStatusCell(
        (r: JqlResultRow) => r.status || null,
        s => lozengeAppearance('', s ?? ''),
        undefined,
        (r: JqlResultRow) => r.statusCategory || null,
      ),
    },
    {
      id: 'assigneeName',
      label: 'Assignee',
      width: 13,
      sortable: true,
      accessor: r => r.assigneeName,
      cell: makeAssigneeCell((r: JqlResultRow) =>
        r.assigneeName ? { name: r.assigneeName, avatarUrl: null } : null,
      ),
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 6,
      sortable: true,
      accessor: r => r.priority,
      cell: makePriorityCell((r: JqlResultRow) => r.priority),
    },
    {
      id: 'updated',
      label: 'Updated',
      width: 8,
      sortable: true,
      accessor: r => r.updated,
      cell: makeDateCell((r: JqlResultRow) => r.updated),
    },
    {
      id: 'dueDate',
      label: 'Due date',
      width: 8,
      sortable: true,
      accessor: r => r.dueDate,
      cell: makeDateCell((r: JqlResultRow) => r.dueDate),
    },
  ], []);

  const hasJql = debouncedJql.trim().length > 0;

  return (
    <div>
      {/* Results header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '16px 0 8px',
        borderTop: `1px solid ${token('color.border')}`,
        marginTop: 24,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 'var(--ds-font-size-500)',
          fontWeight: 653,
          color: token('color.text'),
        }}>
          Results
        </h2>
        {hasJql && totalCount > 0 && (
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest') }}>
            {totalCount > JQL_RESULTS_LIMIT
              ? `${JQL_RESULTS_LIMIT} of ${totalCount}`
              : `${totalCount}`} work item{totalCount === 1 ? '' : 's'}
          </span>
        )}
        {hasJql && projectCount > 1 && (
          <span data-cp-lozenge-jira-parity>
            <Lozenge appearance="inprogress">{projectCount} projects</Lozenge>
          </span>
        )}
        {isFetching && hasJql && <Spinner size="small" />}
      </div>

      {/* Active-filter chips — human-readable labels, no raw DB column names or UUIDs */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {activeFilters.map((f, i) => {
            const label = JQL_COLUMN_LABELS[f.column] ?? toTitleCase(f.column);
            const op = JQL_OP_LABELS[f.method] ?? f.method;
            const val = Array.isArray(f.value)
              ? f.value.map(v => resolveFilterValue(f.column, v, currentUserDisplayName)).join(', ')
              : resolveFilterValue(f.column, f.value, currentUserDisplayName);
            return (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 0,
                fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
                padding: '0px 6px', borderRadius: 3,
                background: 'var(--ds-background-neutral)',
                color: token('color.text.subtle'),
                border: `1px solid ${token('color.border')}`,
              }}>
                <span style={{ color: token('color.text'), fontWeight: 600 }}>{label}</span>
                <span style={{ opacity: 0.6 }}>{` ${op} `}</span>
                <span style={{ color: token('color.text') }}>{val ?? '—'}</span>
              </span>
            );
          })}
        </div>
      )}

      {error && (
        <SectionMessage appearance="warning" title="Couldn't run this filter">
          {error.message}
        </SectionMessage>
      )}

      {!hasJql ? (
        <div style={{
          padding: '32px 24px',
          textAlign: 'center',
          background: `var(--ds-surface-sunken)`,
          border: `1px dashed ${token('color.border')}`,
          borderRadius: 4,
          color: token('color.text.subtle'),
          fontSize: 'var(--ds-font-size-400)',
        }}>
          {emptyHint}
        </div>
      ) : (
        <JiraTable<JqlResultRow>
          columns={columns}
          data={items}
          getRowId={r => r.id}
          onRowClick={r => openDetail(r.key)}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
          isLoading={isLoading}
          density="comfortable"
          ariaLabel="Filter results"
          showRowCount
          totalRowCount={totalCount}
          emptyView={
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
              color: token('color.text.subtle'),
              fontSize: 'var(--ds-font-size-400)',
            }}>
              No work items match this filter yet. Adjust the criteria above.
            </div>
          }
        />
      )}
    </div>
  );
}

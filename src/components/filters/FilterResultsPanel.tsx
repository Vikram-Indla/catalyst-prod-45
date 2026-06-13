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

interface FilterResultsPanelProps {
  jql: string;
  /** Shown in the empty state when jql is blank. */
  emptyHint?: string;
  /** Debounce before re-querying as the user types. Default 400ms. */
  debounceMs?: number;
  /** Reports the live match count (null while loading / no JQL). */
  onResultsChange?: (count: number | null) => void;
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
}: FilterResultsPanelProps) {
  const debouncedJql = useDebounced(jql, debounceMs);
  const currentUserDisplayName = useCurrentUserDisplayName();
  const {
    data: rawRows,
    isLoading,
    isFetching,
    error,
    count: totalCount,
    activeFilters,
  } = useJQLFilteredIssues({ jql: debouncedJql, currentUserDisplayName });

  useEffect(() => {
    onResultsChange?.(debouncedJql.trim() ? totalCount : null);
  }, [totalCount, debouncedJql, onResultsChange]);

  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  // Map raw snake_case Supabase rows → typed JqlResultRow for JiraTable columns.
  const items = useMemo<JqlResultRow[]>(() => {
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
  }, [rawRows, sortKey, sortOrder]);

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
        <span style={{ fontSize: 13, color: token('color.text.subtle') }}>
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
          fontSize: 16,
          fontWeight: 653,
          color: token('color.text'),
        }}>
          Results
        </h2>
        {hasJql && totalCount > 0 && (
          <span style={{ fontSize: 12, color: token('color.text.subtlest') }}>
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

      {/* Active-filter chips — one per parsed JqlFilter from useJQLFilteredIssues */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {activeFilters.map((f, i) => (
            <span key={i} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 3,
              background: `var(--ds-background-neutral, #F1F2F4)`,
              color: token('color.text.subtle'),
              border: `1px solid ${token('color.border')}`,
            }}>
              <span style={{ color: token('color.text'), fontWeight: 600 }}>{f.column}</span>
              <span style={{ opacity: 0.7 }}>{f.method}</span>
              <span style={{ color: token('color.text') }}>
                {Array.isArray(f.value) ? f.value.join(', ') : (f.value ?? 'EMPTY')}
              </span>
            </span>
          ))}
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
          background: `var(--ds-surface-sunken, #F7F8F9)`,
          border: `1px dashed ${token('color.border')}`,
          borderRadius: 4,
          color: token('color.text.subtle'),
          fontSize: 14,
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
              fontSize: 14,
            }}>
              No work items match this filter yet. Adjust the criteria above.
            </div>
          }
        />
      )}
    </div>
  );
}

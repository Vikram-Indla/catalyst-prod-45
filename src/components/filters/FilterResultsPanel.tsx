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
import { useJqlResults, JQL_RESULTS_LIMIT, type JqlResultRow } from '@/hooks/workhub/useJqlResults';

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
  const { data, isLoading, isFetching, error } = useJqlResults(debouncedJql);

  useEffect(() => {
    onResultsChange?.(debouncedJql.trim() && data ? data.totalCount : null);
  }, [data, debouncedJql, onResultsChange]);

  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    const dir = sortOrder === 'ASC' ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    return rows;
  }, [data?.items, sortKey, sortOrder]);

  const projectCount = useMemo(
    () => new Set((data?.items ?? []).map(r => r.projectKey).filter(Boolean)).size,
    [data?.items],
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
        {hasJql && data && (
          <span style={{ fontSize: 12, color: token('color.text.subtlest') }}>
            {data.totalCount > JQL_RESULTS_LIMIT
              ? `${JQL_RESULTS_LIMIT} of ${data.totalCount}`
              : `${data.totalCount}`} work item{data.totalCount === 1 ? '' : 's'}
          </span>
        )}
        {hasJql && projectCount > 1 && (
          <span data-cp-lozenge-jira-parity>
            <Lozenge appearance="inprogress">{projectCount} projects</Lozenge>
          </span>
        )}
        {isFetching && hasJql && <Spinner size="small" />}
      </div>

      {error && (
        <SectionMessage appearance="warning" title="Couldn't run this filter">
          {(error as Error).message}
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
          totalRowCount={data?.totalCount}
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

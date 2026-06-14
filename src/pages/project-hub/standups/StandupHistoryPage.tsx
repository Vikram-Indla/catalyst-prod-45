/**
 * StandupHistoryPage — /project-hub/:key/standups
 *
 * Lists past standups for the active project. JiraTable + CatalystListPageLayout
 * to stack identically with FiltersListPage / RoadmapsListPage.
 *
 * 6b scope: list view with 6 columns (Date, Triggered by, Duration,
 * Speakers, Status changes, Summary) + row click → /standups/:id detail
 * route (lands in 6c).
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import AkAvatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { CatalystListPageLayout } from '@/components/shared/CatalystListPage';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column, SortOrder } from '@/components/shared/JiraTable';
import { useStandupHistory, type StandupHistoryRow, type StandupSummaryStatus } from '@/hooks/useStandupHistory';

/** Compact absolute timestamp — "14 Jun 2026, 16:34". 24-hour clock so
 *  AM/PM ambiguity is gone. Local time zone so it's what the user
 *  actually experienced. */
function formatStandupDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return 'In progress';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function summaryLozenge(status: StandupSummaryStatus) {
  const map: Record<StandupSummaryStatus, { label: string; appearance: 'default' | 'inprogress' | 'success' | 'removed' }> = {
    pending:    { label: 'Pending',     appearance: 'default' },
    generating: { label: 'Generating',  appearance: 'inprogress' },
    ready:      { label: 'Ready',       appearance: 'success' },
    failed:     { label: 'Failed',      appearance: 'removed' },
  };
  const entry = map[status];
  return <Lozenge appearance={entry.appearance}>{entry.label}</Lozenge>;
}

export default function StandupHistoryPage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const navigate = useNavigate();

  const [sortKey, setSortKey] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [columnVisibility, setColumnVisibility] = useState<Set<string>>(
    () => new Set(['date', 'triggered_by', 'duration', 'speakers', 'status_changes', 'summary']),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading, isError } = useStandupHistory(projectKey);

  const sortedRows = useMemo(() => {
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'duration')       return ((a.duration_seconds ?? -1) - (b.duration_seconds ?? -1)) * dir;
      if (sortKey === 'triggered_by')   return (a.triggered_by_name ?? '').localeCompare(b.triggered_by_name ?? '') * dir;
      if (sortKey === 'speakers')       return (a.n_speakers - b.n_speakers) * dir;
      if (sortKey === 'status_changes') return (a.n_status_changes - b.n_status_changes) * dir;
      if (sortKey === 'summary')        return a.summary_status.localeCompare(b.summary_status) * dir;
      return a.started_at.localeCompare(b.started_at) * dir;
    });
  }, [rows, sortKey, sortOrder]);

  const columns = useMemo((): Column<StandupHistoryRow>[] => [
    {
      id: 'date',
      label: 'Date',
      width: 22,
      sortable: true,
      alwaysVisible: true,
      defaultVisible: true,
      accessor: r => r.started_at,
      cell: ({ row }) => (
        <span style={{ fontSize: 14, color: token('color.text') }}>
          {formatStandupDate(row.started_at)}
        </span>
      ),
    },
    {
      id: 'triggered_by',
      label: 'Triggered by',
      width: 18,
      sortable: true,
      defaultVisible: true,
      cell: ({ row }) => (
        row.triggered_by_name
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <AkAvatar size="small" src={row.triggered_by_avatar ?? undefined} name={row.triggered_by_name} />
              <span style={{ fontSize: 14, color: token('color.text') }}>{row.triggered_by_name}</span>
            </span>
          : <span style={{ fontSize: 13, color: token('color.text.subtle') }}>Unknown</span>
      ),
    },
    {
      id: 'duration',
      label: 'Duration',
      width: 12,
      sortable: true,
      defaultVisible: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 14, color: token('color.text') }}>
          {formatDuration(row.duration_seconds)}
        </span>
      ),
    },
    {
      id: 'speakers',
      label: 'Speakers',
      width: 12,
      sortable: true,
      defaultVisible: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 14, color: token('color.text') }}>{row.n_speakers}</span>
      ),
    },
    {
      id: 'status_changes',
      label: 'Status changes',
      width: 14,
      sortable: true,
      defaultVisible: true,
      cell: ({ row }) => (
        <span style={{ fontSize: 14, color: token('color.text') }}>{row.n_status_changes}</span>
      ),
    },
    {
      id: 'summary',
      label: 'Summary',
      width: 14,
      sortable: true,
      defaultVisible: true,
      cell: ({ row }) => summaryLozenge(row.summary_status),
    },
  ], []);

  if (isLoading) {
    return (
      <CatalystListPageLayout chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <Spinner size="medium" />
        </div>
      </CatalystListPageLayout>
    );
  }

  if (isError) {
    return (
      <CatalystListPageLayout chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
        <div style={{ padding: 48, textAlign: 'center', color: token('color.text.danger') }}>
          Couldn't load standups. Try refreshing.
        </div>
      </CatalystListPageLayout>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <CatalystListPageLayout chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
            padding: '48px 24px',
            textAlign: 'center',
            color: token('color.text.subtle'),
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: token('color.text'), marginBottom: 6 }}>
            No standups yet
          </div>
          <div style={{ fontSize: 13 }}>
            Start a standup from a project board — past sessions will appear here.
          </div>
        </div>
      </CatalystListPageLayout>
    );
  }

  return (
    <CatalystListPageLayout chromeBand={projectKey ? <ProjectHeaderChip projectKey={projectKey} /> : null}>
      <JiraTable<StandupHistoryRow>
        data={sortedRows}
        columns={columns}
        getRowId={r => r.id}
        selectable
        selection={selectedIds}
        onSelectionChange={setSelectedIds}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onRowClick={r => navigate(`/project-hub/${projectKey}/standups/${r.id}`)}
      />
    </CatalystListPageLayout>
  );
}

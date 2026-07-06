/**
 * VersionVarianceBody — version variance report (CAT-TESTHUB-V2 slice I4).
 * tm_case_variance rows: snapshot-vs-repository drift and how each instance
 * was resolved (pulled latest / accepted snapshot / cloned / still open).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import EmptyState from '@atlaskit/empty-state';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

interface VarianceRow {
  id: string;
  case_key: string;
  case_title: string;
  locked_version: number;
  latest_version: number;
  detected_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

const RESOLUTION_LABEL: Record<string, string> = {
  pulled_latest: 'Pulled latest',
  accepted_snapshot: 'Accepted snapshot',
  cloned: 'Cloned',
};

function useVarianceRows() {
  return useQuery({
    queryKey: ['tm-report-variance'],
    queryFn: async (): Promise<VarianceRow[]> => {
      const { data, error } = await typedQuery('tm_case_variance')
        .select('id, test_case_id, locked_version, latest_version, detected_at, resolved_at, resolution')
        .order('detected_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const caseIds = [...new Set(rows.map((r) => r.test_case_id))];
      const cases = new Map<string, { key: string; title: string }>();
      if (caseIds.length > 0) {
        const { data: tcs } = await supabase
          .from('tm_test_cases')
          .select('id, case_key, title')
          .in('id', caseIds);
        for (const c of tcs ?? []) cases.set(c.id, { key: c.case_key, title: c.title });
      }
      return rows.map((r) => ({
        id: r.id,
        case_key: cases.get(r.test_case_id)?.key ?? '—',
        case_title: cases.get(r.test_case_id)?.title ?? '—',
        locked_version: r.locked_version,
        latest_version: r.latest_version,
        detected_at: r.detected_at,
        resolved_at: r.resolved_at,
        resolution: r.resolution,
      }));
    },
  });
}

export default function VersionVarianceBody() {
  const { data: rows = [], isPending, isError, error, refetch } = useVarianceRows();

  const columns: Column<VarianceRow>[] = [
    {
      id: 'case', label: 'Case', width: 10, alwaysVisible: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{row.case_key}</span>,
    },
    {
      id: 'title', label: 'Title', flex: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.case_title}</span>,
    },
    {
      id: 'versions', label: 'Drift', width: 10,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          v{row.locked_version} → v{row.latest_version}
        </span>
      ),
    },
    {
      id: 'state', label: 'Resolution', width: 14,
      cell: ({ row }) =>
        row.resolved_at
          ? <Lozenge appearance="success">{RESOLUTION_LABEL[row.resolution ?? ''] ?? row.resolution ?? 'Resolved'}</Lozenge>
          : <Lozenge appearance="moved">Open</Lozenge>,
    },
    {
      id: 'detected', label: 'Detected', width: 13,
      cell: ({ row }) => (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
          {new Date(row.detected_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'resolved', label: 'Resolved', width: 13,
      cell: ({ row }) =>
        row.resolved_at
          ? <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>{new Date(row.resolved_at).toLocaleString()}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
  ];

  if (isError) {
    return (
      <SectionMessage appearance="error" title="Couldn't load variance records">
        <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
        <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: 'var(--ds-link)', cursor: 'pointer', padding: 0 }}>Try again</button>
      </SectionMessage>
    );
  }
  if (isPending) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  if (rows.length === 0) {
    return (
      <EmptyState
        header="No variance recorded"
        description="When a repository case moves past a snapshot in an active cycle, the drift and its explicit resolution are recorded here."
      />
    );
  }
  return (
    <JiraTable<VarianceRow>
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      showRowCount
      totalRowCount={rows.length}
    />
  );
}

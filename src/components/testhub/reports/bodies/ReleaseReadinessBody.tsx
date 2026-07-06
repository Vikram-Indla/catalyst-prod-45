/**
 * ReleaseReadinessBody — Release Readiness report (CAT-TESTHUB-V2 slice I2).
 * Computes the test gate live (tm_compute_ph_release_gate) for every release
 * that has test scope, plus honest "no scope" rows. A block can never render
 * as pass — reasons ride along.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import EmptyState from '@atlaskit/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

interface ReadinessRow {
  release_id: string;
  release_name: string;
  gate: 'pass' | 'warn' | 'block';
  scope: number;
  executed: number;
  failed: number;
  blocked: number;
  open_blocker_defects: number;
  evidence_gaps: number;
  reasons: string[];
}

const GATE: Record<ReadinessRow['gate'], { appearance: 'success' | 'moved' | 'removed'; label: string }> = {
  pass: { appearance: 'success', label: 'Pass' },
  warn: { appearance: 'moved', label: 'Warn' },
  block: { appearance: 'removed', label: 'Block' },
};

function useReadinessRows() {
  return useQuery({
    queryKey: ['tm-report-release-readiness'],
    queryFn: async (): Promise<ReadinessRow[]> => {
      // Releases that actually carry tm cycles (the honest scope set)
      const { data: cycles, error: cErr } = await supabase
        .from('tm_test_cycles')
        .select('release_id')
        .not('release_id', 'is', null);
      if (cErr) throw cErr;
      const releaseIds = [...new Set((cycles ?? []).map((c: any) => c.release_id))].slice(0, 25);
      if (releaseIds.length === 0) return [];

      const { data: releases, error: rErr } = await supabase
        .from('ph_releases')
        .select('id, name')
        .in('id', releaseIds);
      if (rErr) throw rErr;
      const names = new Map((releases ?? []).map((r) => [r.id, r.name]));

      const rows: ReadinessRow[] = [];
      for (const id of releaseIds) {
        const { data, error } = await supabase.rpc(
          'tm_compute_ph_release_gate' as never,
          { p_release_id: id } as never,
        );
        if (error) throw error;
        const g = data as any;
        rows.push({
          release_id: id,
          release_name: names.get(id) ?? id,
          gate: g.gate,
          scope: g.totals?.scope ?? 0,
          executed: g.totals?.executed ?? 0,
          failed: g.totals?.failed ?? 0,
          blocked: g.totals?.blocked ?? 0,
          open_blocker_defects: g.totals?.open_blocker_defects ?? 0,
          evidence_gaps: (g.totals?.failed_blocked_total ?? 0) - (g.totals?.failed_blocked_with_evidence ?? 0),
          reasons: g.reasons ?? [],
        });
      }
      // Blocked releases surface first — a block must never hide below the fold.
      const order = { block: 0, warn: 1, pass: 2 } as const;
      rows.sort((a, b) => order[a.gate] - order[b.gate]);
      return rows;
    },
    staleTime: 30_000,
  });
}

export default function ReleaseReadinessBody() {
  const { data: rows = [], isPending, isError, error, refetch } = useReadinessRows();

  const columns: Column<ReadinessRow>[] = [
    {
      id: 'release', label: 'Release', flex: true, alwaysVisible: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{row.release_name}</span>,
    },
    {
      id: 'gate', label: 'Gate', width: 8,
      cell: ({ row }) => <Lozenge appearance={GATE[row.gate].appearance} isBold>{GATE[row.gate].label}</Lozenge>,
    },
    {
      id: 'executed', label: 'Executed', width: 10,
      cell: ({ row }) => row.scope > 0
        ? <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>{row.executed}/{row.scope}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'failedBlocked', label: 'Failed / blocked', width: 12,
      cell: ({ row }) => (row.failed + row.blocked) > 0
        ? <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600, fontSize: 'var(--ds-font-size-300)' }}>{row.failed} / {row.blocked}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'blockers', label: 'Blocking defects', width: 11,
      cell: ({ row }) => row.open_blocker_defects > 0
        ? <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>{row.open_blocker_defects}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'evidence', label: 'Evidence gaps', width: 10,
      cell: ({ row }) => row.evidence_gaps > 0
        ? <span style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>{row.evidence_gaps}</span>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'reasons', label: 'Gate reasons', flex: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reasons.join('; ')}>
          {row.reasons.join('; ') || '—'}
        </span>
      ),
    },
  ];

  if (isError) {
    return (
      <SectionMessage appearance="error" title="Couldn't compute release readiness">
        <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
        <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: 'var(--ds-link)', cursor: 'pointer', padding: 0 }}>Try again</button>
      </SectionMessage>
    );
  }
  if (isPending) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  if (rows.length === 0) {
    return (
      <EmptyState
        header="No releases carry test scope yet"
        description="Link cycles to a release (or create a release-scoped execution) and its readiness gate appears here."
      />
    );
  }
  return (
    <JiraTable<ReadinessRow>
      columns={columns}
      data={rows}
      getRowId={(r) => r.release_id}
      showRowCount
      totalRowCount={rows.length}
    />
  );
}

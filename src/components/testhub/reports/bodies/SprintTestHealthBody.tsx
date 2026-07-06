/**
 * SprintTestHealthBody — Sprint Health report (CAT-TESTHUB-V2 slice I1).
 * Latest tm_sprint_test_health snapshot per sprint: gate, coverage, execution,
 * blocker defects, draft leaks. Zero-assumption: sprints never computed show
 * "not computed", not fabricated green.
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

interface HealthRow {
  sprint_id: string;
  sprint_name: string;
  gate_state: 'pass' | 'warn' | 'block';
  totals: {
    stories?: number;
    covered_stories?: number;
    scope?: number;
    executed?: number;
    passed?: number;
    failed?: number;
    blocked?: number;
    open_blocker_defects?: number;
    draft_cases?: number;
  };
  gate_reasons: string[];
  computed_at: string;
}

const GATE: Record<HealthRow['gate_state'], { appearance: 'success' | 'moved' | 'removed'; label: string }> = {
  pass: { appearance: 'success', label: 'Pass' },
  warn: { appearance: 'moved', label: 'Warn' },
  block: { appearance: 'removed', label: 'Block' },
};

function useSprintHealthRows() {
  return useQuery({
    queryKey: ['tm-report-sprint-health'],
    queryFn: async (): Promise<HealthRow[]> => {
      // Latest snapshot per sprint (client-side dedup — snapshot volume is small)
      const { data: snaps, error } = await typedQuery('tm_sprint_test_health')
        .select('sprint_id, gate_state, gate_reasons, totals, computed_at')
        .order('computed_at', { ascending: false })
        .limit(400);
      if (error) throw error;
      const latest = new Map<string, any>();
      for (const s of (snaps ?? []) as any[]) {
        if (!latest.has(s.sprint_id)) latest.set(s.sprint_id, s);
      }
      if (latest.size === 0) return [];
      const { data: sprints, error: sErr } = await supabase
        .from('ph_jira_sprints')
        .select('id, name')
        .in('id', [...latest.keys()]);
      if (sErr) throw sErr;
      const names = new Map((sprints ?? []).map((s) => [s.id, s.name]));
      return [...latest.values()].map((s) => ({
        sprint_id: s.sprint_id,
        sprint_name: names.get(s.sprint_id) ?? s.sprint_id,
        gate_state: s.gate_state,
        totals: s.totals ?? {},
        gate_reasons: s.gate_reasons ?? [],
        computed_at: s.computed_at,
      }));
    },
  });
}

export default function SprintTestHealthBody() {
  const { data: rows = [], isPending, isError, error, refetch } = useSprintHealthRows();

  const columns: Column<HealthRow>[] = [
    {
      id: 'sprint', label: 'Sprint', flex: true, alwaysVisible: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{row.sprint_name}</span>,
    },
    {
      id: 'gate', label: 'Gate', width: 8,
      cell: ({ row }) => <Lozenge appearance={GATE[row.gate_state].appearance} isBold>{GATE[row.gate_state].label}</Lozenge>,
    },
    {
      id: 'coverage', label: 'Coverage', width: 10,
      cell: ({ row }) => {
        const t = row.totals;
        return (t.stories ?? 0) > 0
          ? <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>{t.covered_stories}/{t.stories}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'executed', label: 'Executed', width: 10,
      cell: ({ row }) => {
        const t = row.totals;
        return (t.scope ?? 0) > 0
          ? <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>{t.executed}/{t.scope}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'failedBlocked', label: 'Failed / blocked', width: 12,
      cell: ({ row }) => {
        const t = row.totals;
        const bad = (t.failed ?? 0) + (t.blocked ?? 0);
        return bad > 0
          ? <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600, fontSize: 'var(--ds-font-size-300)' }}>{t.failed ?? 0} / {t.blocked ?? 0}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'blockers', label: 'Blocker defects', width: 11,
      cell: ({ row }) => {
        const n = row.totals.open_blocker_defects ?? 0;
        return n > 0
          ? <span style={{ color: 'var(--ds-text-danger)', fontWeight: 600 }}>{n}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'drafts', label: 'Draft cases', width: 9,
      cell: ({ row }) => {
        const n = row.totals.draft_cases ?? 0;
        return n > 0
          ? <span style={{ color: 'var(--ds-text-warning)', fontWeight: 600 }}>{n}</span>
          : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
      },
    },
    {
      id: 'reasons', label: 'Gate reasons', flex: true,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.gate_reasons.join('; ')}>
          {row.gate_reasons.join('; ') || '—'}
        </span>
      ),
    },
    {
      id: 'computed', label: 'Computed', width: 12,
      cell: ({ row }) => (
        <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>
          {new Date(row.computed_at).toLocaleString()}
        </span>
      ),
    },
  ];

  if (isError) {
    return (
      <SectionMessage appearance="error" title="Couldn't load sprint test health">
        <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
        <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: 'var(--ds-link)', cursor: 'pointer', padding: 0 }}>Try again</button>
      </SectionMessage>
    );
  }
  if (isPending) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  if (rows.length === 0) {
    return (
      <EmptyState
        header="No sprint health snapshots yet"
        description="Compute test health from a sprint's detail page — every computation records a snapshot here."
      />
    );
  }
  return (
    <JiraTable<HealthRow>
      columns={columns}
      data={rows}
      getRowId={(r) => r.sprint_id}
      showRowCount
      totalRowCount={rows.length}
    />
  );
}

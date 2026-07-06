/**
 * DefectLeakageBody — Defect leakage & retest report (CAT-TESTHUB-V2 slice I3).
 * Where defects come from (caught by testing vs leaked/customer-reported) and
 * whether fixed test-caught defects have been retested (linked scope re-run).
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

interface LeakRow {
  id: string;
  defect_key: string;
  title: string;
  severity: string | null;
  status: string | null;
  origin: 'test' | 'customer' | 'other';
  retest: 'passed' | 'pending' | 'n/a';
}

function useLeakRows() {
  return useQuery({
    queryKey: ['tm-report-defect-leakage'],
    queryFn: async (): Promise<{ rows: LeakRow[]; caught: number; leaked: number }> => {
      const { data: defects, error } = await supabase
        .from('tm_defects')
        .select('id, defect_key, title, severity, status, customer_reported, source_test_run_id, source_test_case_id')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (defects ?? []) as any[];

      const ids = rows.map((d) => d.id);
      const scopeByDefect = new Map<string, string>();
      if (ids.length > 0) {
        const { data: links } = await supabase
          .from('tm_defect_links')
          .select('defect_id, cycle_scope_id')
          .in('defect_id', ids)
          .not('cycle_scope_id', 'is', null);
        for (const l of (links ?? []) as any[]) {
          if (!scopeByDefect.has(l.defect_id)) scopeByDefect.set(l.defect_id, l.cycle_scope_id);
        }
      }
      const scopeIds = [...new Set(scopeByDefect.values())];
      const scopeStatus = new Map<string, string>();
      if (scopeIds.length > 0) {
        const { data: scopes } = await supabase
          .from('tm_cycle_scope')
          .select('id, current_status')
          .in('id', scopeIds);
        for (const s of (scopes ?? []) as any[]) scopeStatus.set(s.id, s.current_status);
      }

      let caught = 0;
      let leaked = 0;
      const out: LeakRow[] = rows.map((d) => {
        const testOrigin = !!(d.source_test_run_id || d.source_test_case_id || scopeByDefect.has(d.id));
        const origin: LeakRow['origin'] = testOrigin ? 'test' : d.customer_reported ? 'customer' : 'other';
        if (origin === 'test') caught += 1; else leaked += 1;
        const resolved = ['resolved', 'closed'].includes(String(d.status));
        let retest: LeakRow['retest'] = 'n/a';
        if (origin === 'test' && resolved) {
          const scope = scopeByDefect.get(d.id);
          retest = scope && scopeStatus.get(scope) === 'passed' ? 'passed' : 'pending';
        }
        return {
          id: d.id,
          defect_key: d.defect_key,
          title: d.title,
          severity: d.severity,
          status: d.status,
          origin,
          retest,
        };
      });
      return { rows: out, caught, leaked };
    },
  });
}

const ORIGIN_LOZENGE: Record<LeakRow['origin'], { appearance: 'success' | 'removed' | 'default'; label: string }> = {
  test: { appearance: 'success', label: 'Caught by testing' },
  customer: { appearance: 'removed', label: 'Leaked (customer)' },
  other: { appearance: 'default', label: 'Other origin' },
};

export default function DefectLeakageBody() {
  const { data, isPending, isError, error, refetch } = useLeakRows();
  const rows = data?.rows ?? [];

  const columns: Column<LeakRow>[] = [
    {
      id: 'key', label: 'Defect', width: 10, alwaysVisible: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>{row.defect_key}</span>,
    },
    {
      id: 'title', label: 'Title', flex: true,
      cell: ({ row }) => <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>,
    },
    {
      id: 'severity', label: 'Severity', width: 9,
      cell: ({ row }) => row.severity
        ? <Lozenge appearance={['blocker', 'critical'].includes(row.severity) ? 'removed' : 'default'}>{row.severity}</Lozenge>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'status', label: 'Status', width: 9,
      cell: ({ row }) => row.status
        ? <Lozenge appearance={['resolved', 'closed'].includes(row.status) ? 'success' : 'inprogress'}>{row.status}</Lozenge>
        : <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>,
    },
    {
      id: 'origin', label: 'Origin', width: 13,
      cell: ({ row }) => <Lozenge appearance={ORIGIN_LOZENGE[row.origin].appearance}>{ORIGIN_LOZENGE[row.origin].label}</Lozenge>,
    },
    {
      id: 'retest', label: 'Retest', width: 9,
      cell: ({ row }) =>
        row.retest === 'n/a'
          ? <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
          : row.retest === 'passed'
            ? <Lozenge appearance="success">Passed</Lozenge>
            : <Lozenge appearance="moved">Pending</Lozenge>,
    },
  ];

  if (isError) {
    return (
      <SectionMessage appearance="error" title="Couldn't load defect leakage">
        <p style={{ margin: 0 }}>{(error as Error)?.message}</p>
        <button onClick={() => refetch()} style={{ background: 'none', border: 'none', color: 'var(--ds-link)', cursor: 'pointer', padding: 0 }}>Try again</button>
      </SectionMessage>
    );
  }
  if (isPending) return <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner size="large" /></div>;
  if (rows.length === 0) {
    return <EmptyState header="No defects recorded" description="Defects raised from Test Hub (and any leaked from elsewhere) appear here with their retest state." />;
  }
  return (
    <>
      <div style={{ display: 'flex', gap: 24, padding: '4px 4px 12px' }}>
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          Caught by testing: <strong style={{ color: 'var(--ds-text)' }}>{data!.caught}</strong>
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)' }}>
          Leaked / other: <strong style={{ color: data!.leaked > 0 ? 'var(--ds-text-danger)' : 'var(--ds-text)' }}>{data!.leaked}</strong>
        </span>
      </div>
      <JiraTable<LeakRow>
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        showRowCount
        totalRowCount={rows.length}
      />
    </>
  );
}

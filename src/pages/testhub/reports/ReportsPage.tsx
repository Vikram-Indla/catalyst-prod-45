// @ts-nocheck
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';
import { supabase } from '@/integrations/supabase/client';

// ── helpers ──────────────────────────────────────────────────────────────────

function useActiveProject(): string | undefined {
  const { data } = useQuery({
    queryKey: ['tm-projects-first'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tm_projects')
        .select('id')
        .order('name', { ascending: true })
        .limit(1)
        .single();
      return data?.id as string | undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

interface ReportsData {
  totalCases: number;
  totalCycles: number;
  totalRuns: number;
  passedRuns: number;
  recentCycles: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    passed: number;
    total: number;
  }>;
  defectsBySeverity: Array<{ severity: string; count: number }>;
}

function useReportsData(projectId: string | undefined) {
  return useQuery<ReportsData>({
    queryKey: ['tm-reports', projectId],
    enabled: !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ReportsData> => {
      const [casesRes, cyclesRes, runsRes, defectsRes] = await Promise.all([
        // total test cases
        supabase
          .from('tm_test_cases')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId!),

        // recent 5 cycles
        supabase
          .from('tm_test_cycles')
          .select('id, name, status, start_date, end_date')
          .eq('project_id', projectId!)
          .order('created_at', { ascending: false })
          .limit(5),

        // all runs joined via cycle → project
        supabase
          .from('tm_test_runs')
          .select('id, status, cycle_id, tm_test_cycles!inner(project_id)')
          .eq('tm_test_cycles.project_id', projectId!),

        // defects grouped by severity
        supabase
          .from('tm_defects')
          .select('severity')
          .eq('project_id', projectId!),
      ]);

      const totalCases = casesRes.count ?? 0;
      const cycles = cyclesRes.data ?? [];
      const runs = runsRes.data ?? [];
      const defects = defectsRes.data ?? [];

      const totalRuns = runs.length;
      const passedRuns = runs.filter((r: any) => r.status === 'passed').length;

      // cycle scope counts for recent cycles
      const cycleIds = cycles.map((c: any) => c.id);
      let scopeMap: Record<string, { passed: number; total: number }> = {};

      if (cycleIds.length > 0) {
        const { data: scopeRows } = await supabase
          .from('tm_cycle_scope')
          .select('cycle_id, execution_status')
          .in('cycle_id', cycleIds);

        for (const row of scopeRows ?? []) {
          if (!scopeMap[row.cycle_id]) scopeMap[row.cycle_id] = { passed: 0, total: 0 };
          scopeMap[row.cycle_id].total += 1;
          if (row.execution_status === 'passed') scopeMap[row.cycle_id].passed += 1;
        }
      }

      const recentCycles = cycles.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status ?? 'draft',
        start_date: c.start_date,
        end_date: c.end_date,
        passed: scopeMap[c.id]?.passed ?? 0,
        total: scopeMap[c.id]?.total ?? 0,
      }));

      // defects by severity
      const sevMap: Record<string, number> = {};
      for (const d of defects) {
        const sev = (d as any).severity ?? 'unknown';
        sevMap[sev] = (sevMap[sev] ?? 0) + 1;
      }
      const defectsBySeverity = Object.entries(sevMap)
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => b.count - a.count);

      // total cycles from full count
      const { count: totalCycles } = await supabase
        .from('tm_test_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId!);

      return {
        totalCases,
        totalCycles: totalCycles ?? 0,
        totalRuns,
        passedRuns,
        recentCycles,
        defectsBySeverity,
      };
    },
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 8,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

function KpiCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div style={CARD_STYLE}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ds-text, #172B4D)', lineHeight: 1 }}>
        {value}{suffix}
      </span>
    </div>
  );
}

function cycleStatusAppearance(status: string): 'default' | 'inprogress' | 'success' | 'moved' | 'removed' {
  const map: Record<string, 'default' | 'inprogress' | 'success' | 'moved' | 'removed'> = {
    draft: 'default',
    planned: 'default',
    active: 'inprogress',
    in_progress: 'inprogress',
    completed: 'success',
    archived: 'moved',
  };
  return map[status] ?? 'default';
}

function cycleStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    planned: 'Planned',
    active: 'In progress',
    in_progress: 'In progress',
    completed: 'Completed',
    archived: 'Archived',
  };
  return map[status] ?? status;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function severityColor(sev: string): string {
  const map: Record<string, string> = {
    critical: 'var(--ds-text-danger, #AE2A19)',
    high: 'var(--ds-text-warning, #974F0C)',
    medium: 'var(--ds-text, #172B4D)',
    low: 'var(--ds-text-subtle, #42526E)',
  };
  return map[sev.toLowerCase()] ?? 'var(--ds-text, #172B4D)';
}

const TH: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ds-text-subtle, #42526E)',
  textAlign: 'left',
  borderBottom: '2px solid var(--ds-border, #DFE1E6)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 14,
  color: 'var(--ds-text, #172B4D)',
  borderBottom: '1px solid var(--ds-border-subtle, #F1F2F4)',
  verticalAlign: 'middle',
};

// ── main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const projectId = useActiveProject();
  const { data, isLoading } = useReportsData(projectId);

  const passRate =
    data && data.totalRuns > 0
      ? Math.round((data.passedRuns / data.totalRuns) * 100)
      : 0;

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Test Hub', href: '/testhub' },
        { label: 'Reports', isCurrent: true },
      ]}
    />
  );

  return (
    <div
      style={{
        fontFamily: 'var(--ds-font-family-body)',
        minHeight: '100vh',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeader title="Reports" breadcrumbs={breadcrumbs} />

      <div style={{ flex: 1, padding: '24px 24px 40px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spinner size="large" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <KpiCard label="Total Cases" value={data?.totalCases ?? 0} />
              <KpiCard label="Total Cycles" value={data?.totalCycles ?? 0} />
              <KpiCard label="Total Runs" value={data?.totalRuns ?? 0} />
              <KpiCard label="Pass Rate" value={passRate} suffix="%" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* Recent Cycles table */}
              <div style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 0', fontWeight: 600, fontSize: 15, color: 'var(--ds-text, #172B4D)' }}>
                  Recent cycles
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Name</th>
                        <th style={TH}>Status</th>
                        <th style={TH}>Progress</th>
                        <th style={TH}>Start</th>
                        <th style={TH}>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recentCycles ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                            No cycles yet
                          </td>
                        </tr>
                      ) : (
                        (data?.recentCycles ?? []).map(cycle => (
                          <tr key={cycle.id}>
                            <td style={{ ...TD, fontWeight: 500 }}>{cycle.name}</td>
                            <td style={TD}>
                              <Lozenge appearance={cycleStatusAppearance(cycle.status)} isBold={false}>
                                {cycleStatusLabel(cycle.status)}
                              </Lozenge>
                            </td>
                            <td style={TD}>
                              {cycle.total > 0
                                ? `${cycle.passed} / ${cycle.total}`
                                : '—'}
                            </td>
                            <td style={{ ...TD, color: 'var(--ds-text-subtle, #42526E)' }}>{formatDate(cycle.start_date)}</td>
                            <td style={{ ...TD, color: 'var(--ds-text-subtle, #42526E)' }}>{formatDate(cycle.end_date)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Defect Summary table */}
              <div style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 0', fontWeight: 600, fontSize: 15, color: 'var(--ds-text, #172B4D)' }}>
                  Defect summary
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Severity</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.defectsBySeverity ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ ...TD, textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                            No defects
                          </td>
                        </tr>
                      ) : (
                        (data?.defectsBySeverity ?? []).map(row => (
                          <tr key={row.severity}>
                            <td style={{ ...TD, color: severityColor(row.severity), fontWeight: 500, textTransform: 'capitalize' }}>
                              {row.severity}
                            </td>
                            <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {row.count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

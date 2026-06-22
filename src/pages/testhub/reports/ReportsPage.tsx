// @ts-nocheck
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { supabase } from '@/integrations/supabase/client';

// ── types ─────────────────────────────────────────────────────────────────────

interface ReportTile {
  slug: string;
  label: string;
  description: string;
  group: string;
}

interface KpiData {
  totalCases: number;
  totalCycles: number;
  totalRuns: number;
  passRate: number;
}

// ── report tile catalogue ─────────────────────────────────────────────────────

const REPORT_TILES: ReportTile[] = [
  // Execution group
  { slug: 'execution-overview', label: 'Execution Overview', description: 'Status breakdown and overall progress across all runs.', group: 'Execution' },
  { slug: 'execution-summary', label: 'Execution Summary', description: 'Per-cycle summary: total, passed, failed, blocked, pass rate.', group: 'Execution' },
  { slug: 'execution-burndown', label: 'Execution Burndown', description: 'Cumulative runs executed over time by date.', group: 'Execution' },
  { slug: 'execution-burnup', label: 'Execution Burnup', description: 'Cumulative passed runs over time by date.', group: 'Execution' },
  { slug: 'execution-distribution', label: 'Execution Distribution', description: 'Count of runs broken down by status.', group: 'Execution' },
  { slug: 'execution-history', label: 'Execution History', description: 'Full history of runs with case, executor and result.', group: 'Execution' },
  // Case group
  { slug: 'case-distribution', label: 'Case Distribution', description: 'Test cases grouped by current status.', group: 'Cases' },
  { slug: 'case-usage', label: 'Case Usage', description: 'How many cycles each test case appears in.', group: 'Cases' },
  // Defect group
  { slug: 'defect-summary', label: 'Defect Summary', description: 'Defects grouped by severity and status.', group: 'Defects' },
  { slug: 'defect-impact', label: 'Defect Impact', description: 'Defects linked to test cases — severity and case mapping.', group: 'Defects' },
  { slug: 'defect-trend', label: 'Defect Trend', description: 'Defect creation rate over time by date.', group: 'Defects' },
  // Multi-cycle group
  { slug: 'multi-cycle-comparison', label: 'Multi-Cycle Comparison', description: 'Side-by-side pass rate comparison across cycles.', group: 'Multi-Cycle' },
  { slug: 'multi-cycle-summary', label: 'Multi-Cycle Summary', description: 'One-row-per-cycle aggregated metrics.', group: 'Multi-Cycle' },
  { slug: 'multi-cycle-detail', label: 'Multi-Cycle Detail', description: 'Per-case results across every cycle.', group: 'Multi-Cycle' },
  { slug: 'multi-cycle-distribution', label: 'Multi-Cycle Distribution', description: 'Status distribution pivot: status × cycle.', group: 'Multi-Cycle' },
  // Project group
  { slug: 'project-overview', label: 'Project Overview', description: 'Top-level counts: cases, cycles, runs, pass rate.', group: 'Project' },
  { slug: 'project-metrics', label: 'Project Metrics', description: 'Velocity and defect rate metrics over time.', group: 'Project' },
  { slug: 'project-activity', label: 'Project Activity', description: 'Recent test activity: date, action, user, entity.', group: 'Project' },
  // Traceability group
  { slug: 'traceability-summary', label: 'Traceability Summary', description: 'Jira issues with linked test case counts.', group: 'Traceability' },
  { slug: 'traceability-detail', label: 'Traceability Detail', description: 'Per-case detail: Jira issue → test case → status.', group: 'Traceability' },
  // Other
  { slug: 'run-distribution', label: 'Run Distribution', description: 'Runs broken down by executor: total, passed, failed.', group: 'Other' },
  { slug: 'user-activity', label: 'User Activity', description: 'Activity per user: runs executed and pass rate.', group: 'Other' },
];

const GROUP_ORDER = ['Execution', 'Cases', 'Defects', 'Multi-Cycle', 'Project', 'Traceability', 'Other'];

// ── data hooks ────────────────────────────────────────────────────────────────

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

function useKpiData(projectId: string | undefined) {
  return useQuery<KpiData>({
    queryKey: ['tm-reports-kpi', projectId],
    enabled: !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<KpiData> => {
      const [casesRes, cyclesRes, runsRes] = await Promise.all([
        supabase
          .from('tm_test_cases')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId!),
        supabase
          .from('tm_test_cycles')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId!),
        supabase
          .from('tm_test_runs')
          .select('id, status, tm_test_cycles!inner(project_id)')
          .eq('tm_test_cycles.project_id', projectId!),
      ]);

      const totalCases = casesRes.count ?? 0;
      const totalCycles = cyclesRes.count ?? 0;
      const runs = runsRes.data ?? [];
      const totalRuns = runs.length;
      const passedRuns = runs.filter((r: any) => r.status === 'passed').length;
      const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

      return { totalCases, totalCycles, totalRuns, passRate };
    },
  });
}

// ── styles ────────────────────────────────────────────────────────────────────

const KPI_CARD: React.CSSProperties = {
  background: 'var(--ds-surface, #FFFFFF)',
  border: '1px solid var(--ds-border, #DFE1E6)',
  borderRadius: 8,
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={KPI_CARD}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--ds-text, #172B4D)', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function ReportTileCard({ tile }: { tile: ReportTile }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/testhub/${projectKey}/reports/${tile.slug}`)}
      style={{
        width: 200,
        minHeight: 120,
        background: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        padding: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, #F1F2F4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', lineHeight: 1.3 }}>
        {tile.label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', lineHeight: 1.5 }}>
        {tile.description}
      </span>
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { projectKey = 'BAU' } = useParams<{ projectKey: string }>();
  const projectId = useActiveProject();
  const { data: kpi, isLoading: kpiLoading } = useKpiData(projectId);

  // Group tiles
  const groupedTiles = GROUP_ORDER.map(group => ({
    group,
    tiles: REPORT_TILES.filter(t => t.group === group),
  }));

  return (
    <div
      style={{
        fontFamily: 'var(--ds-font-family-body)',
        minHeight: '100vh',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
      }}
    >
      <ProjectPageHeader hubType="test" />

      <div style={{ flex: 1, padding: '24px 24px 48px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* KPI row */}
        {kpiLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size="medium" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <KpiCard label="Total Cases" value={kpi?.totalCases ?? 0} />
            <KpiCard label="Total Cycles" value={kpi?.totalCycles ?? 0} />
            <KpiCard label="Total Runs" value={kpi?.totalRuns ?? 0} />
            <KpiCard label="Pass Rate" value={`${kpi?.passRate ?? 0}%`} />
          </div>
        )}

        {/* Report tile groups */}
        {groupedTiles.map(({ group, tiles }) => (
          <div key={group} style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ds-text-subtlest, #6B778C)',
              marginBottom: 12,
              marginTop: 0,
              letterSpacing: '0.04em',
            }}>
              {group}
            </h2>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              {tiles.map(tile => (
                <ReportTileCard key={tile.slug} tile={tile} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

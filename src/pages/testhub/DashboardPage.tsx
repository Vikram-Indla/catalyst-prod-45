import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCycles } from '@/hooks/test-management/useTestCycles';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import { TMCycle, RunStatus, DefectSeverity } from '@/types/test-management';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RecentRun {
  id: string;
  status: RunStatus;
  updated_at: string;
  cycle_name: string | null;
  case_title: string | null;
  case_key: string | null;
}

interface RecentDefect {
  id: string;
  title: string;
  severity: DefectSeverity | null;
  status: string | null;
  created_at: string;
  cycle_name: string | null;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useRecentRuns(projectId: string | undefined) {
  return useQuery<RecentRun[]>({
    queryKey: ['dashboard-recent-runs', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await (supabase as any)
        .from('tm_cycle_scope')
        .select(`
          id, status, updated_at,
          tm_test_cycles(name),
          tm_test_cases(title, case_key)
        `)
        .eq('tm_test_cycles.project_id', projectId)
        .not('status', 'eq', 'NOT_RUN')
        .order('updated_at', { ascending: false })
        .limit(8);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        updated_at: r.updated_at,
        cycle_name: r.tm_test_cycles?.name ?? null,
        case_title: r.tm_test_cases?.title ?? null,
        case_key: r.tm_test_cases?.case_key ?? null,
      }));
    },
    enabled: !!projectId,
  });
}

function useRecentDefects(projectId: string | undefined) {
  return useQuery<RecentDefect[]>({
    queryKey: ['dashboard-recent-defects', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await (supabase as any)
        .from('tm_defects')
        .select(`id, title, severity, status, created_at, tm_test_cycles(name)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []).map((d: any) => ({
        id: d.id,
        title: d.title,
        severity: d.severity,
        status: d.status,
        created_at: d.created_at,
        cycle_name: d.tm_test_cycles?.name ?? null,
      }));
    },
    enabled: !!projectId,
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cyclesData, isLoading: cyclesLoading } = useTestCycles(projectId);
  const { data: casesData, isLoading: casesLoading } = useTestCases(projectId);
  const { data: recentRuns = [], isLoading: runsLoading } = useRecentRuns(projectId);
  const { data: recentDefects = [] } = useRecentDefects(projectId);

  const cycles = cyclesData ?? [];
  const totalCases = casesData?.total ?? 0;

  const activeCycles = cycles.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PLANNED');
  const totalExecuted = cycles.reduce((sum, c) => sum + (c.passed_count ?? 0) + (c.failed_count ?? 0) + (c.blocked_count ?? 0), 0);
  const totalScope = cycles.reduce((sum, c) => sum + (c.total_cases ?? 0), 0);
  const executionRate = totalScope > 0 ? Math.round((totalExecuted / totalScope) * 100) : 0;
  const totalPassed = cycles.reduce((sum, c) => sum + (c.passed_count ?? 0), 0);
  const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

  const openDefects = recentDefects.filter(d => d.status !== 'CLOSED' && d.status !== 'RESOLVED').length;

  if (projectsLoading || cyclesLoading || casesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)', paddingTop: 16, paddingBottom: 32 }}>
      <ProjectPageHeader hubType="testhub" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard label="Total test cases" value={totalCases} onClick={() => navigate('/testhub/repository')} />
        <KpiCard label="Active cycles" value={activeCycles.length} onClick={() => navigate('/testhub/cycles')} />
        <KpiCard label="Execution rate" value={`${executionRate}%`} />
        <KpiCard
          label="Pass rate"
          value={`${passRate}%`}
          color={passRate >= 80 ? 'var(--ds-text-success, #006644)' : passRate >= 50 ? 'var(--ds-text-warning, #974F0C)' : 'var(--ds-text-danger, #AE2A19)'}
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

        {/* Left: Active cycles + Recent activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Active Cycles */}
          <section>
            <SectionHeader label="Active cycles" action={{ label: 'View all', onClick: () => navigate('/testhub/cycles') }} />
            {activeCycles.length === 0 ? (
              <EmptyState message="No active cycles." cta="Create cycle" onClick={() => navigate('/testhub/cycles')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeCycles.slice(0, 4).map(cycle => <CycleProgressCard key={cycle.id} cycle={cycle} onClick={() => navigate(`/testhub/cycles/${cycle.id}`)} />)}
              </div>
            )}
          </section>

          {/* Recent execution activity */}
          <section>
            <SectionHeader label="Recent execution activity" />
            {runsLoading ? (
              <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}><Spinner size="small" /></div>
            ) : recentRuns.length === 0 ? (
              <EmptyState message="No execution activity yet." cta="Start a cycle" onClick={() => navigate('/testhub/cycles')} />
            ) : (
              <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, overflow: 'hidden' }}>
                {recentRuns.map((run, i) => (
                  <div key={run.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    background: i % 2 === 0 ? 'var(--ds-surface, #FFFFFF)' : 'var(--ds-surface-sunken, #F7F8F9)',
                    borderBottom: i < recentRuns.length - 1 ? '1px solid var(--ds-border-subtle, #EBECF0)' : 'none',
                  }}>
                    <RunStatusDot status={run.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {run.case_key ? <span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', color: 'var(--ds-text-subtle, #42526E)', marginRight: 6 }}>{run.case_key}</span> : null}
                        {run.case_title ?? '—'}
                      </div>
                      {run.cycle_name && (
                        <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 2 }}>{run.cycle_name}</div>
                      )}
                    </div>
                    <RunStatusBadge status={run.status} />
                    <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', flexShrink: 0 }}>
                      {formatRelative(run.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right: Quick links + Recent defects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Quick links */}
          <section>
            <SectionHeader label="Quick links" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'My work', href: '/testhub/my-work' },
                { label: 'Test repository', href: '/testhub/repository' },
                { label: 'Test cycles', href: '/testhub/cycles' },
                { label: 'Test sets', href: '/testhub/sets' },
                { label: 'Defects', href: '/testhub/defects' },
                { label: 'Reports', href: '/testhub/reports' },
                { label: 'Traceability', href: '/testhub/traceability' },
              ].map(link => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  style={{
                    textAlign: 'left', background: 'none', border: '1px solid var(--ds-border, #DFE1E6)',
                    borderRadius: 6, padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                    color: 'var(--ds-link, #0052CC)', fontWeight: 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle, #F7F8F9)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                >
                  {link.label}
                  <span style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 16 }}>›</span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent defects */}
          <section>
            <SectionHeader
              label={`Recent defects${openDefects > 0 ? ` · ${openDefects} open` : ''}`}
              action={{ label: 'View all', onClick: () => navigate('/testhub/defects') }}
            />
            {recentDefects.length === 0 ? (
              <EmptyState message="No defects logged." />
            ) : (
              <div style={{ border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6, overflow: 'hidden' }}>
                {recentDefects.map((d, i) => (
                  <div key={d.id} style={{
                    padding: '10px 14px',
                    borderBottom: i < recentDefects.length - 1 ? '1px solid var(--ds-border-subtle, #EBECF0)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <SeverityDot severity={d.severity} />
                      <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {d.status && <Lozenge>{d.status.toLowerCase().replace('_', ' ')}</Lozenge>}
                      <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)' }}>{formatRelative(d.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionHeader({ label, action }: { label: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', margin: 0 }}>{label}</h2>
      {action && (
        <button
          onClick={action.onClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ds-link, #0052CC)', padding: 0, fontWeight: 500 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function EmptyState({ message, cta, onClick }: { message: string; cta?: string; onClick?: () => void }) {
  return (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13 }}>
      {message}
      {cta && onClick && (
        <button onClick={onClick} style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-link, #0052CC)', fontSize: 13, fontWeight: 500 }}>
          {cta} →
        </button>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, onClick }: { label: string; value: string | number; color?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--ds-surface-raised, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8, padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(9,30,66,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 653, color: color ?? 'var(--ds-text, #172B4D)' }}>{value}</div>
    </div>
  );
}

function CycleProgressCard({ cycle, onClick }: { cycle: TMCycle; onClick?: () => void }) {
  const total = cycle.total_cases ?? 0;
  const passed = cycle.passed_count ?? 0;
  const failed = cycle.failed_count ?? 0;
  const blocked = cycle.blocked_count ?? 0;
  const executed = passed + failed + blocked;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  const pr = executed > 0 ? Math.round((passed / executed) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--ds-surface-raised, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 8, padding: 16, cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(9,30,66,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginRight: 8, fontFamily: 'var(--ds-font-family-code, monospace)' }}>{cycle.key}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{cycle.name}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
          {pr}% pass · {executed}/{total} run
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--ds-background-neutral, #F1F2F4)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ds-background-brand-bold, #0052CC)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <Chip label={`${passed} passed`} color="var(--ds-text-success, #006644)" />
        <Chip label={`${failed} failed`} color="var(--ds-text-danger, #AE2A19)" />
        <Chip label={`${blocked} blocked`} color="var(--ds-text-warning, #974F0C)" />
        <Chip label={`${(cycle.not_run_count ?? 0)} not run`} color="var(--ds-text-subtlest, #6B778C)" />
      </div>
    </div>
  );
}

const RUN_STATUS_CONFIG: Record<RunStatus, { color: string; label: string; lozengeAppearance: 'default' | 'inprogress' | 'success' | 'removed' | 'moved' }> = {
  PASSED:      { color: 'var(--ds-background-success-bold, #1F845A)', label: 'Passed', lozengeAppearance: 'success' },
  FAILED:      { color: 'var(--ds-background-danger-bold, #CA3521)', label: 'Failed', lozengeAppearance: 'removed' },
  BLOCKED:     { color: 'var(--ds-background-warning-bold, #E2B203)', label: 'Blocked', lozengeAppearance: 'moved' },
  IN_PROGRESS: { color: 'var(--ds-background-brand-bold, #0052CC)', label: 'In progress', lozengeAppearance: 'inprogress' },
  NOT_RUN:     { color: 'var(--ds-background-neutral, #F1F2F4)', label: 'Not run', lozengeAppearance: 'default' },
  SKIPPED:     { color: 'var(--ds-background-neutral-bold, #626F86)', label: 'Skipped', lozengeAppearance: 'default' },
};

function RunStatusDot({ status }: { status: RunStatus }) {
  const cfg = RUN_STATUS_CONFIG[status] ?? RUN_STATUS_CONFIG.NOT_RUN;
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />;
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const cfg = RUN_STATUS_CONFIG[status] ?? RUN_STATUS_CONFIG.NOT_RUN;
  return <Lozenge appearance={cfg.lozengeAppearance}>{cfg.label}</Lozenge>;
}

function SeverityDot({ severity }: { severity: DefectSeverity | null }) {
  const color = severity === 'CRITICAL' || severity === 'BLOCKER'
    ? 'var(--ds-text-danger, #AE2A19)'
    : severity === 'MAJOR'
    ? 'var(--ds-text-warning, #974F0C)'
    : 'var(--ds-text-subtle, #42526E)';
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function Chip({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 12, color }}>{label}</span>;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

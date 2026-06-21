import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCycles } from '@/hooks/test-management/useTestCycles';
import { useTestCases } from '@/hooks/test-management/useTestCases';
import { useCycleScope } from '@/hooks/test-management/useTestCycles';
import Spinner from '@atlaskit/spinner';
import { TMCycle } from '@/types/test-management';
import { PageHeader } from '@/components/ads/PageHeader';
import { Breadcrumbs } from '@/components/ads/Breadcrumbs';

export default function DashboardPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const projectId = projects[0]?.id;

  const { data: cyclesData, isLoading: cyclesLoading } = useTestCycles(projectId);
  const { data: casesData, isLoading: casesLoading } = useTestCases(projectId);

  const cycles = cyclesData ?? [];
  const totalCases = casesData?.total ?? 0;

  const activeCycles = cycles.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PLANNED');

  // Execution rate: (passed + failed + blocked) / total across all cycles
  const totalExecuted = cycles.reduce((sum, c) => sum + (c.passed_count ?? 0) + (c.failed_count ?? 0) + (c.blocked_count ?? 0), 0);
  const totalScope = cycles.reduce((sum, c) => sum + (c.total_cases ?? 0), 0);
  const executionRate = totalScope > 0 ? Math.round((totalExecuted / totalScope) * 100) : 0;

  const totalPassed = cycles.reduce((sum, c) => sum + (c.passed_count ?? 0), 0);
  const passRate = totalExecuted > 0 ? Math.round((totalPassed / totalExecuted) * 100) : 0;

  if (projectsLoading || cyclesLoading || casesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, fontFamily: 'var(--ds-font-family-body)' }}>
      <PageHeader
        title="Dashboard"
        breadcrumbs={
          <Breadcrumbs items={[
            { key: 'home', text: 'Home', href: '/for-you' },
            { key: 'testhub', text: 'Test Hub', href: '/testhub' },
            { key: 'dashboard', text: 'Dashboard', isCurrent: true },
          ]} />
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridColumns: 'repeat(4, 1fr)', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KpiCard label="Total Test Cases" value={totalCases} />
        <KpiCard label="Active Cycles" value={activeCycles.length} />
        <KpiCard label="Execution Rate" value={`${executionRate}%`} />
        <KpiCard label="Pass Rate" value={`${passRate}%`} color={passRate >= 80 ? 'var(--ds-text-success, #006644)' : passRate >= 50 ? 'var(--ds-text-warning, #974F0C)' : 'var(--ds-text-danger, #AE2A19)'} />
      </div>

      {/* Active Cycles */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)', marginBottom: 16, marginTop: 0 }}>
          Active Cycles
        </h2>
        {activeCycles.length === 0 ? (
          <p style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 14 }}>No active cycles</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeCycles.map(cycle => <CycleProgressCard key={cycle.id} cycle={cycle} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--ds-surface-raised, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 653, color: color ?? 'var(--ds-text, #172B4D)' }}>{value}</div>
    </div>
  );
}

function CycleProgressCard({ cycle }: { cycle: TMCycle }) {
  const total = cycle.total_cases ?? 0;
  const passed = cycle.passed_count ?? 0;
  const failed = cycle.failed_count ?? 0;
  const blocked = cycle.blocked_count ?? 0;
  const executed = passed + failed + blocked;
  const pct = total > 0 ? Math.round((executed / total) * 100) : 0;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

  return (
    <div style={{
      background: 'var(--ds-surface-raised, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)',
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginRight: 8 }}>{cycle.key}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>{cycle.name}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
          {passRate}% pass rate · {executed}/{total} run
        </div>
      </div>
      {/* Progress bar */}
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

function Chip({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 12, color }}>{label}</span>;
}

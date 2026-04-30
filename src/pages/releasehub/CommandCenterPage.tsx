import React, { useState, useMemo } from 'react';
import { Rocket, ArrowLeftRight, CheckSquare, FlaskConical, Sparkles, ChevronRight, CheckCircle2, XCircle, Minus, Clock } from 'lucide-react';
import { useReleases, useChanges, useCommandCenterKPIs, usePendingSignOffs, useProductionEvents } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS, CHG_STATUS_ORDER } from '@/constants/releasehub.design';
import { useTheme } from '@/hooks/useTheme';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { ChgStatusBadge } from '@/components/releasehub/ChgStatusBadge';
import { DeployResultBadge } from '@/components/releasehub/DeployResultBadge';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { EmptyState } from '@/components/releasehub/EmptyState';
import { ReleaseDrawer } from '@/components/releasehub/ReleaseDrawer';
import { ChgDrawer } from '@/components/releasehub/ChgDrawer';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function KPICard({ label, value, delta, deltaLabel, color, icon: Icon, loading, onClick, isDark }: {
  label: string; value: number | string; delta?: string; deltaLabel?: string; color: string; icon: any; loading?: boolean; onClick?: () => void; isDark?: boolean;
}) {
  return (
    <button onClick={onClick} className="rounded-[6px] p-5 text-left transition-all hover:shadow-md" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border-strong, #CBD5E1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)'; }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em]" style={{ fontFamily: RH.fontBody, color: 'var(--cp-text-tertiary, #64748B)' }}>{label}</p>
          {loading ? (
            <div className="h-9 w-16 rounded animate-pulse mt-2" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
          ) : (
            <p className="text-[32px] mt-1" style={{ fontFamily: RH.fontDisplay, fontWeight: 700, color: isDark ? '#EDEDED' : RH.ink1 }}>{value}</p>
          )}
          {delta && !loading && (
            <p className="text-[12px] mt-1" style={{ fontWeight: 600, color: deltaLabel === 'neutral' ? ('var(--cp-text-tertiary, #64748B)') : delta.startsWith('+') ? '#DC2626' : '#16A34A' }}>
              {delta}
            </p>
          )}
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: color + '1A' }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ title, action, isDark }: { title: string; action?: React.ReactNode; isDark?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>{title}</h2>
      {action}
    </div>
  );
}

export default function CommandCenterPage() {
  const { isDark } = useTheme();
  const { data: releases = [], isLoading: relLoading } = useReleases();
  const { data: changes = [], isLoading: chgLoading } = useChanges();
  const { data: kpis, isLoading: kpiLoading } = useCommandCenterKPIs();
  const { data: pendingSignoffs = [], isLoading: soLoading } = usePendingSignOffs();
  const { data: prodEvents = [], isLoading: evLoading } = useProductionEvents();
  const navigate = useNavigate();
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [selectedChange, setSelectedChange] = useState<any>(null);

  // Two permitted inline queries
  const { data: allSignoffs = [] } = useQuery({
    queryKey: ['release-hub', 'all-signoffs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rh_change_signoffs')
        .select('id, status, change_id');
      return data ?? [];
    },
  });

  const { data: testCycles = [] } = useQuery({
    queryKey: ['release-hub', 'cmd-test-cycles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rh_change_test_cycles')
        .select('result, total_cases, passed_cases');
      return data ?? [];
    },
  });

  const isLoading = relLoading || chgLoading || kpiLoading;
  const coreDataReady = !relLoading && !chgLoading && !kpiLoading && !soLoading && !evLoading;

  const activeReleases = kpis?.active_releases ?? releases.filter((r: any) => ['in_progress', 'planning'].includes(r.status)).length;
  const changesInFlight = kpis?.changes_in_flight ?? changes.filter((c: any) => c.status !== 'in_production').length;
  const signoffsPending = kpis?.signoffs_pending ?? 0;
  const triageCount = kpis?.triage_count ?? 0;

  // Status counts for pipeline
  const statusCounts: Record<string, number> = {};
  changes.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  // Active releases (IN_PROGRESS + PLANNING)
  const activeRels = releases.filter((r: any) => ['in_progress', 'planning'].includes(r.status));

  // Latest deployed change
  const latestDeployed = changes.find((c: any) => c.status === 'in_production');

  // Pipeline columns
  const pipelineCols = [
    { key: 'new', label: 'NEW', loz: { bg: 'var(--cp-border, #DFE1E6)', text: 'var(--cp-text-secondary, #253858)' } },
    { key: 'in_uat', label: 'IN UAT', loz: { bg: isDark ? 'rgba(59,130,246,0.15)' : '#DEEBFF', text: 'var(--cp-text-link, #0747A6)' } },
    { key: 'in_beta', label: 'IN BETA', loz: { bg: isDark ? 'rgba(59,130,246,0.15)' : '#DEEBFF', text: 'var(--cp-text-link, #0747A6)' } },
    { key: 'in_production', label: 'IN PROD', loz: { bg: isDark ? 'rgba(74,222,128,0.15)' : '#E3FCEF', text: 'var(--cp-success-text, #006644)' } },
  ];

  // ═══════════════════════════════════════════
  // READINESS COMPUTATION
  // ═══════════════════════════════════════════
  const computed = useMemo(() => {
    const totalSignoffs = allSignoffs.length;
    const pendingCount = pendingSignoffs.length;
    const approvedCount = totalSignoffs - pendingCount;
    const signoffRate = totalSignoffs > 0 ? approvedCount / totalSignoffs : 0;

    const totalCases = testCycles.reduce((s: number, t: any) => s + (t.total_cases ?? 0), 0);
    const passedCases = testCycles.reduce((s: number, t: any) => s + (t.passed_cases ?? 0), 0);
    const testPassRate = totalCases > 0 ? passedCases / totalCases : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const productionEvents = prodEvents ?? [];
    const recentEvents = productionEvents.filter(
      (e: any) => new Date(e.deployed_at) >= thirtyDaysAgo
    );
    const successEvents = recentEvents.filter((e: any) => e.deployment_result === 'SUCCESS').length;
    const deployRate = recentEvents.length > 0 ? successEvents / recentEvents.length : 0;

    const allChanges = changes ?? [];
    const inProduction = allChanges.filter((c: any) => c.status === 'in_production').length;
    const changeCompletionRate = allChanges.length > 0 ? inProduction / allChanges.length : 0;

    const readinessScore = Math.round(
      (signoffRate * 0.35 + testPassRate * 0.30 + deployRate * 0.20 + changeCompletionRate * 0.15) * 100
    );

    const scoreColor = readinessScore >= 75 ? '#006644' : readinessScore >= 50 ? '#B45309' : '#AE2A19';
    const scoreBg = readinessScore >= 75 ? '#E3FCEF' : readinessScore >= 50 ? '#FFF7ED' : '#FFEBE6';

    // Post-deploy summary
    const lastSuccessEvent = [...productionEvents]
      .filter((e: any) => e.deployment_result === 'SUCCESS')
      .sort((a: any, b: any) =>
        new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime()
      )[0];
    const lastDeployDate = lastSuccessEvent
      ? new Date(lastSuccessEvent.deployed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    const postDeploySummary = allChanges.length === 0
      ? 'No changes have been tracked in this release cycle yet.'
      : `${inProduction} of ${allChanges.length} changes have been deployed to production` +
        (lastDeployDate ? `. Last successful deployment: ${lastDeployDate}.` : '. No successful deployments recorded yet.') +
        (approvedCount === totalSignoffs && totalSignoffs > 0
          ? ' All sign-off gates are complete.'
          : totalSignoffs > 0
            ? ` ${pendingCount} sign-off${pendingCount !== 1 ? 's' : ''} still pending.`
            : '');

    // Conflict alert
    const scheduledChanges = allChanges.filter((c: any) =>
      c.deployment_date && c.status !== 'in_production'
    );
    const dateGroups = scheduledChanges.reduce((acc: Record<string, any[]>, c: any) => {
      const d = c.deployment_date!.slice(0, 10);
      acc[d] = acc[d] ? [...acc[d], c] : [c];
      return acc;
    }, {} as Record<string, any[]>);
    const conflictDates = Object.entries(dateGroups).filter(([, items]) => items.length > 1);
    const hasConflicts = conflictDates.length > 0;
    const hasPendingSignoffs = pendingCount > 0;

    const conflictMessage = hasConflicts
      ? `${conflictDates.length} deployment date conflict${conflictDates.length !== 1 ? 's' : ''} detected. ${conflictDates.length > 1 ? 'Multiple dates have' : 'One date has'} more than one change scheduled simultaneously. Review scheduling to avoid overlap.`
      : hasPendingSignoffs
        ? `${pendingCount} sign-off${pendingCount !== 1 ? 's' : ''} pending approval. No deployment date conflicts detected.`
        : 'No conflicts or pending sign-offs detected. Release path is clear.';

    const alertSeverity = hasConflicts ? 'destructive' : hasPendingSignoffs ? 'warning' : 'success';

    // Gates
    const gates = [
      {
        label: 'Sign-Off Rate',
        rate: signoffRate,
        value: Math.round(signoffRate * 100) + '%',
        threshold: 100,
        detail: `${approvedCount} of ${totalSignoffs} sign-offs approved`,
        noData: totalSignoffs === 0,
      },
      {
        label: 'Test Pass Rate',
        rate: testPassRate,
        value: Math.round(testPassRate * 100) + '%',
        threshold: 85,
        detail: `${passedCases} of ${totalCases} test cases passed`,
        noData: totalCases === 0,
      },
      {
        label: 'Deployment Success',
        rate: deployRate,
        value: Math.round(deployRate * 100) + '%',
        threshold: 90,
        detail: `${successEvents} of ${recentEvents.length} deployments successful (last 30d)`,
        noData: recentEvents.length === 0,
      },
      {
        label: 'Change Completion',
        rate: changeCompletionRate,
        value: Math.round(changeCompletionRate * 100) + '%',
        threshold: 75,
        detail: `${inProduction} of ${allChanges.length} changes in production`,
        noData: allChanges.length === 0,
      },
    ];

    return {
      readinessScore, scoreColor, scoreBg,
      postDeploySummary,
      conflictMessage, alertSeverity, hasConflicts, hasPendingSignoffs,
      gates,
    };
  }, [allSignoffs, pendingSignoffs, testCycles, prodEvents, changes]);

  const alertBorderColor = computed.alertSeverity === 'destructive' ? '#DC2626'
    : computed.alertSeverity === 'warning' ? '#D97706' : '#16A34A';
  const alertBgColor = computed.alertSeverity === 'destructive' ? '#FEF2F2'
    : computed.alertSeverity === 'warning' ? '#FFFBEB' : '#F0FDF4';

  return (
    <div className="p-6" style={{ background: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#FFFFFF' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>Command Center</h1>
          <p className="text-[13px] mt-1" style={{ fontFamily: RH.fontBody, color: 'var(--cp-text-tertiary, #64748B)' }}>Release operations overview — real-time</p>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Releases" value={activeReleases} color="#2563EB" icon={Rocket} loading={isLoading} onClick={() => navigate('/release-hub/releases')} isDark={isDark} />
        <KPICard label="Changes In Flight" value={changesInFlight} delta={`${changesInFlight} active`} deltaLabel="neutral" color="#0D9488" icon={ArrowLeftRight} loading={isLoading} onClick={() => navigate('/release-hub/changes')} isDark={isDark} />
        <KPICard label="Sign-offs Pending" value={signoffsPending} color="#DC2626" icon={CheckSquare} loading={isLoading} onClick={() => navigate('/release-hub/sign-off-queue')} isDark={isDark} />
        <KPICard label="Test Cycles Running" value={kpis?.test_cycles_running ?? 0} color="#16A34A" icon={FlaskConical} loading={isLoading} isDark={isDark} />
      </div>

      {/* Row 2: Latest Deployed + Release Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Latest Approved Change */}
        <div className="rounded-[6px] p-5" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <SectionHeader title="Latest Deployed Change" isDark={isDark} />
          {latestDeployed ? (
            <div className="cursor-pointer" onClick={() => setSelectedChange(latestDeployed)}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px]" style={{ fontFamily: RH.fontMono, fontWeight: 650, color: '#2563EB' }}>{latestDeployed.chg_number}</span>
                <ChgStatusBadge status={latestDeployed.status} />
                {(latestDeployed as any).deployment_result && <DeployResultBadge result={(latestDeployed as any).deployment_result} />}
              </div>
              <p className="text-[14px] mb-3" style={{ fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>{latestDeployed.title}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] uppercase mb-0.5" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Release</p><p className="text-[12px]" style={{ color: isDark ? '#A1A1A1' : RH.ink2 }}>{latestDeployed.release_name || '—'}</p></div>
                <div><p className="text-[11px] uppercase mb-0.5" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Deployed</p><p className="text-[12px]" style={{ color: isDark ? '#A1A1A1' : RH.ink2 }}>{latestDeployed.deployment_date ? format(new Date(latestDeployed.deployment_date), 'MMM d, yyyy') : '—'}</p></div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#94A3B8]">No deployed changes yet</p>
          )}

          {/* AI Post-Deployment Summary */}
          <div className="mt-4 rounded-[6px] p-3.5" style={{ background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', border: `0.75px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#DBEAFE'}` }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={12} style={{ color: '#2563EB' }} />
              <span className="text-[11px] font-bold text-[#2563EB] uppercase">AI Post-Deploy Summary</span>
            </div>
            {!coreDataReady ? (
              <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: isDark ? 'rgba(37,99,235,0.2)' : '#DBEAFE' }} />
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--cp-text-secondary, #334155)' }}>{computed.postDeploySummary}</p>
            )}
          </div>
        </div>

        {/* Release Status Table */}
        <div className="rounded-[6px] overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <div className="px-5 py-3.5">
            <SectionHeader title="Release Status" isDark={isDark} action={<button onClick={() => navigate('/release-hub/releases')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
          </div>
          {relLoading ? <SkeletonRows count={3} /> : activeRels.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--cp-text-muted, #94A3B8)' }}>No active releases</div>
          ) : (
            <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
              <thead>
                <tr style={{ background: 'var(--cp-bg-page, #F8FAFC)', borderBottom: `2px solid ${'var(--cp-border, #E2E8F0)'}` }}>
                  {['RELEASE', 'STATUS', 'CHANGES', 'TARGET', 'PROGRESS'].map(h => (
                    <th key={h} className="px-3 text-left text-[11px] uppercase tracking-[0.06em]" style={{ fontWeight: 600, height: 36, padding: '10px 12px', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRels.map((r: any) => {
                  const chgCount = changes.filter((c: any) => c.release_id === r.id).length;
                  return (
                    <tr key={r.id} onClick={() => setSelectedRelease(r)} className="cursor-pointer" style={{ height: 44, borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-3" style={{ fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>{r.name}</td>
                      <td className="px-3"><ReleaseStatusBadge status={r.status} /></td>
                      <td className="px-3" style={{ fontFamily: RH.fontMono, fontWeight: 650 }}>{r.chg_count || chgCount}</td>
                      <td className="px-3" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>{r.target_date ? format(new Date(r.target_date), 'MMM d') : '—'}</td>
                      <td className="px-3">
                        <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${Math.min(100, (chgCount > 0 ? 60 : 20))}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Row 3: Change Pipeline + AI Release Readiness */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Change Pipeline Funnel */}
        <div className="rounded-[6px] p-5" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <SectionHeader title="Change Pipeline" isDark={isDark} action={<button onClick={() => navigate('/release-hub/changes')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
          <div className="flex items-center gap-0 mt-4">
            {pipelineCols.map((col, i) => (
              <React.Fragment key={col.key}>
                {i > 0 && (
                  <svg width="16" height="24" viewBox="0 0 16 24" className="shrink-0 -mx-1">
                    <path d="M0 0 L12 12 L0 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
                  </svg>
                )}
                <button
                  onClick={() => navigate(`/release-hub/changes?status=${col.key}`)}
                  className="flex-1 rounded-[6px] p-4 text-center hover:opacity-80 transition-opacity"
                  style={{ background: col.loz.bg }}
                >
                  <p className="text-[24px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 700, color: col.loz.text }}>{statusCounts[col.key] || 0}</p>
                  <p className="text-[11px] uppercase mt-1" style={{ fontWeight: 700, color: col.loz.text, letterSpacing: '0.03em' }}>{col.label}</p>
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* AI Conflict Alert — computed */}
          <div className="mt-4 rounded-[6px] p-3.5" style={{ background: isDark ? 'rgba(37,99,235,0.08)' : alertBgColor, border: `0.75px solid ${isDark ? '#2E2E2E' : alertBorderColor + '33'}` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={12} style={{ color: '#2563EB' }} />
              <span className="text-[11px] font-bold text-[#2563EB] uppercase">AI Conflict Alert</span>
            </div>
            {!coreDataReady ? (
              <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: isDark ? 'rgba(37,99,235,0.2)' : '#DBEAFE' }} />
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--cp-text-secondary, #334155)' }}>{computed.conflictMessage}</p>
            )}
          </div>
        </div>

        {/* AI Release Readiness — computed */}
        <div className="rounded-[6px] p-5" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>AI Release Readiness</h2>
            {activeRels[0] && <span className="text-[12px]" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>— {activeRels[0]?.name}</span>}
          </div>

          {!coreDataReady ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-14 rounded animate-pulse" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
                <div className="flex-1 h-1.5 rounded-full" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-[6px] p-3" style={{ border: `0.75px solid ${'var(--cp-border, #DFE1E6)'}`, borderLeft: `4px solid ${'var(--cp-border, #DFE1E6)'}` }}>
                    <div className="h-3 w-20 rounded animate-pulse mb-2" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
                    <div className="h-5 w-10 rounded animate-pulse mb-1" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
                    <div className="h-2.5 w-24 rounded animate-pulse" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Score display */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[28px] px-3 py-0.5 rounded-[6px]"
                  style={{
                    fontFamily: RH.fontDisplay,
                    fontWeight: 700,
                    color: computed.scoreColor,
                    background: computed.scoreBg,
                  }}
                >
                  {computed.readinessScore}%
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${computed.readinessScore}%`,
                      background: computed.scoreColor,
                    }}
                  />
                </div>
              </div>

              {/* 2×2 Gate Cards */}
              <div className="grid grid-cols-2 gap-3">
                {computed.gates.map(gate => {
                  const pass = !gate.noData && Math.round(gate.rate * 100) >= gate.threshold;
                  const borderColor = gate.noData ? '#DFE1E6' : pass ? '#16A34A' : '#DC2626';
                  const GateIcon = gate.noData ? Minus : pass ? CheckCircle2 : XCircle;
                  const iconColor = gate.noData ? '#94A3B8' : pass ? '#16A34A' : '#DC2626';

                  return (
                    <div
                      key={gate.label}
                      className="rounded-[6px] p-3"
                      style={{
                        border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)'}`,
                        borderLeft: `4px solid ${borderColor}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <GateIcon size={16} style={{ color: iconColor }} />
                        <span className="text-[13px]" style={{ fontWeight: 600, color: isDark ? '#EDEDED' : RH.ink1 }}>{gate.label}</span>
                      </div>
                      <p className="text-[22px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 700, color: isDark ? '#EDEDED' : RH.ink1 }}>
                        {gate.noData ? '—' : gate.value}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>{gate.noData ? 'No data yet' : gate.detail}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4: Signoff Queue + Production Events */}
      <div className="grid grid-cols-2 gap-4">
        {/* Signoff Queue Widget */}
        <div className="rounded-[6px] overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>Signoff Queue</h2>
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[11px] font-bold" style={{ background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#2563EB' }}>AI Prioritized</span>
            </div>
            <button onClick={() => navigate('/release-hub/sign-off-queue')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>
          </div>
          {pendingSignoffs.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckSquare size={20} className="mx-auto mb-2 text-[#16A34A]" />
              <p className="text-[13px] text-[#16A34A]" style={{ fontWeight: 650 }}>No pending sign-offs</p>
            </div>
          ) : (
            <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
              <thead>
                <tr style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9' }}>
                  {['CHANGE', 'GATE', 'APPROVER', 'STATUS'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[0.06em]" style={{ fontWeight: 600, height: 50, padding: '8px 12px', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingSignoffs.slice(0, 4).map((so: any) => (
                  <tr key={so.id} className="cursor-pointer" style={{ height: 50, borderBottom: `0.75px solid ${isDark ? '#292929' : 'rgba(15,23,42,0.06)'}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-3" style={{ fontFamily: RH.fontMono, color: '#2563EB', fontWeight: 650 }}>{so.rh_changes?.chg_number || '—'}</td>
                    <td className="px-3" style={{ color: 'var(--cp-text-secondary, #334155)' }}>{so.signoff_role || so.stage || '—'}</td>
                    <td className="px-3" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>{so.assigned_to || '—'}</td>
                    <td className="px-3"><StatusLozenge status={so.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Production Events */}
        <div className="rounded-[6px] overflow-hidden" style={{ background: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}` }}>
          <div className="px-5 py-3.5">
            <SectionHeader title="Recent Production Events" isDark={isDark} action={<button onClick={() => navigate('/release-hub/production-events')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
          </div>
          {prodEvents.length === 0 ? (
            <div className="px-5 py-8 text-center text-[13px]" style={{ color: 'var(--cp-text-muted, #94A3B8)' }}>No production events</div>
          ) : (
            <div className="px-5 pb-4 space-y-3">
              {prodEvents.slice(0, 4).map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                    border: `2px solid ${ev.deployment_result === 'SUCCESS' ? '#16A34A' : ev.deployment_result === 'ROLLED_BACK' ? '#DC2626' : '#94A3B8'}`,
                    background: isDark ? 'var(--cp-bg-surface, #242528)' : 'white',
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] truncate" style={{ fontWeight: 650, color: isDark ? '#EDEDED' : RH.ink1 }}>{ev.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>{ev.deployed_at ? format(new Date(ev.deployed_at), 'MMM d, HH:mm') : '—'} · {ev.deployed_by}</p>
                  </div>
                  {ev.deployment_result && <DeployResultBadge result={ev.deployment_result} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRelease && <ReleaseDrawer release={selectedRelease} onClose={() => setSelectedRelease(null)} />}
      {selectedChange && <ChgDrawer change={selectedChange} onClose={() => setSelectedChange(null)} />}
    </div>
  );
}

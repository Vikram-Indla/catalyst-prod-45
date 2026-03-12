import React, { useState } from 'react';
import { Rocket, ArrowLeftRight, CheckSquare, FlaskConical, Sparkles, ChevronRight, CheckCircle, Clock, Circle } from 'lucide-react';
import { useReleases, useChanges, useCommandCenterKPIs, usePendingSignOffs, useProductionEvents } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS, CHG_STATUS_ORDER } from '@/constants/releasehub.design';
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

function KPICard({ label, value, delta, deltaLabel, color, icon: Icon, loading, onClick }: {
  label: string; value: number | string; delta?: string; deltaLabel?: string; color: string; icon: any; loading?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-white rounded-[6px] p-5 text-left transition-all hover:shadow-sm" style={{ border: `0.75px solid rgba(15,23,42,0.12)` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>{label}</p>
          {loading ? (
            <div className="h-9 w-16 bg-[#F1F5F9] rounded animate-pulse mt-2" />
          ) : (
            <p className="text-[32px] mt-1" style={{ fontFamily: RH.fontDisplay, fontWeight: 700, color: RH.ink1 }}>{value}</p>
          )}
          {delta && !loading && (
            <p className="text-[12px] mt-1" style={{ fontWeight: 600, color: deltaLabel === 'neutral' ? '#64748B' : delta.startsWith('+') ? '#DC2626' : '#16A34A' }}>
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

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: RH.ink1 }}>{title}</h2>
      {action}
    </div>
  );
}

export default function CommandCenterPage() {
  const { data: releases = [], isLoading: relLoading } = useReleases();
  const { data: changes = [], isLoading: chgLoading } = useChanges();
  const { data: kpis, isLoading: kpiLoading } = useCommandCenterKPIs();
  const { data: pendingSignoffs = [] } = usePendingSignOffs();
  const { data: prodEvents = [] } = useProductionEvents();
  const navigate = useNavigate();
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [selectedChange, setSelectedChange] = useState<any>(null);

  const isLoading = relLoading || chgLoading || kpiLoading;
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
    { key: 'new', label: 'NEW', loz: { bg: '#DFE1E6', text: '#253858' } },
    { key: 'in_uat', label: 'IN UAT', loz: { bg: '#DEEBFF', text: '#0747A6' } },
    { key: 'in_beta', label: 'IN BETA', loz: { bg: '#DEEBFF', text: '#0747A6' } },
    { key: 'in_production', label: 'IN PROD', loz: { bg: '#E3FCEF', text: '#006644' } },
  ];

  return (
    <div className="p-6" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: RH.ink1 }}>Command Center</h1>
          <p className="text-[13px] text-[#64748B] mt-1" style={{ fontFamily: RH.fontBody }}>Release operations overview — real-time</p>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Active Releases" value={activeReleases} color="#2563EB" icon={Rocket} loading={isLoading} onClick={() => navigate('/release-hub/releases')} />
        <KPICard label="Changes In Flight" value={changesInFlight} delta={`${changesInFlight} active`} deltaLabel="neutral" color="#0D9488" icon={ArrowLeftRight} loading={isLoading} onClick={() => navigate('/release-hub/changes')} />
        <KPICard label="Sign-offs Pending" value={signoffsPending} color="#DC2626" icon={CheckSquare} loading={isLoading} onClick={() => navigate('/release-hub/sign-off-queue')} />
        <KPICard label="Test Cycles Running" value={kpis?.test_cycles_running ?? 0} color="#16A34A" icon={FlaskConical} loading={isLoading} />
      </div>

      {/* Row 2: Latest Deployed + Release Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Latest Approved Change */}
        <div className="bg-white rounded-[6px] p-5" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <SectionHeader title="Latest Deployed Change" />
          {latestDeployed ? (
            <div className="cursor-pointer" onClick={() => setSelectedChange(latestDeployed)}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px]" style={{ fontFamily: RH.fontMono, fontWeight: 650, color: '#2563EB' }}>{latestDeployed.chg_number}</span>
                <ChgStatusBadge status={latestDeployed.status} />
                {(latestDeployed as any).deployment_result && <DeployResultBadge result={(latestDeployed as any).deployment_result} />}
              </div>
              <p className="text-[14px] mb-3" style={{ fontWeight: 650, color: RH.ink1 }}>{latestDeployed.title}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] uppercase text-[#64748B] mb-0.5">Release</p><p className="text-[12px]" style={{ color: RH.ink2 }}>{latestDeployed.release_name || '—'}</p></div>
                <div><p className="text-[11px] uppercase text-[#64748B] mb-0.5">Deployed</p><p className="text-[12px]" style={{ color: RH.ink2 }}>{latestDeployed.deployment_date ? format(new Date(latestDeployed.deployment_date), 'MMM d, yyyy') : '—'}</p></div>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#94A3B8]">No deployed changes yet</p>
          )}

          {/* AI Post-Deployment Summary */}
          <div className="mt-4 rounded-[6px] p-3.5" style={{ background: '#EFF6FF', border: '0.75px solid #DBEAFE' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={12} style={{ color: '#2563EB' }} />
              <span className="text-[11px] font-bold text-[#2563EB] uppercase">AI Post-Deploy Summary</span>
            </div>
            <p className="text-[12px] text-[#334155]">Deployment completed successfully. No anomalies detected in the first 24h monitoring window.</p>
          </div>
        </div>

        {/* Release Status Table */}
        <div className="bg-white rounded-[6px] overflow-hidden" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <div className="px-5 py-3.5">
            <SectionHeader title="Release Status" action={<button onClick={() => navigate('/release-hub/releases')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
          </div>
          {relLoading ? <SkeletonRows count={3} /> : activeRels.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#94A3B8] text-[13px]">No active releases</div>
          ) : (
            <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  {['RELEASE', 'STATUS', 'CHANGES', 'TARGET', 'PROGRESS'].map(h => (
                    <th key={h} className="px-3 text-left text-[11px] uppercase tracking-[0.06em] text-[#64748B]" style={{ fontWeight: 600, height: 36, padding: '0 12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRels.map((r: any) => {
                  const chgCount = changes.filter((c: any) => c.release_id === r.id).length;
                  return (
                    <tr key={r.id} onClick={() => setSelectedRelease(r)} className="cursor-pointer hover:bg-[rgba(15,23,42,0.04)]" style={{ height: 36, borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                      <td className="px-3" style={{ fontWeight: 650, color: RH.ink1 }}>{r.name}</td>
                      <td className="px-3"><ReleaseStatusBadge status={r.status} /></td>
                      <td className="px-3" style={{ fontFamily: RH.fontMono, fontWeight: 650 }}>{r.chg_count || chgCount}</td>
                      <td className="px-3 text-[#64748B]">{r.target_date ? format(new Date(r.target_date), 'MMM d') : '—'}</td>
                      <td className="px-3">
                        <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
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
        <div className="bg-white rounded-[6px] p-5" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <SectionHeader title="Change Pipeline" action={<button onClick={() => navigate('/release-hub/changes')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
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

          {/* AI Conflict Alert */}
          {changes.filter((c: any) => c.release_id && c.status !== 'in_production').length > 1 && (
            <div className="mt-4 rounded-[6px] p-3.5" style={{ background: '#EFF6FF', border: '0.75px solid #DBEAFE' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={12} style={{ color: '#2563EB' }} />
                <span className="text-[11px] font-bold text-[#2563EB] uppercase">AI Conflict Alert</span>
              </div>
              <p className="text-[12px] text-[#334155]">
                Multiple changes target the same release. Review migration order before advancing to Beta.
              </p>
            </div>
          )}
        </div>

        {/* AI Release Readiness */}
        <div className="bg-white rounded-[6px] p-5" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: RH.ink1 }}>AI Release Readiness</h2>
            {activeRels[0] && <span className="text-[12px] text-[#64748B]">— {activeRels[0]?.name}</span>}
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[28px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 700, color: '#2563EB' }}>65%</span>
            <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '65%' }} />
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: CheckCircle, label: 'Release Status', detail: 'IN_PROGRESS', score: '10/10%', pass: true },
              { icon: Clock, label: 'Change Status', detail: `${statusCounts['in_uat'] || 0} at UAT+`, score: '10/20%', pass: false },
              { icon: CheckCircle, label: 'Sign-off Status', detail: `${signoffsPending} pending`, score: `${signoffsPending === 0 ? '25' : '10'}/25%`, pass: signoffsPending === 0 },
              { icon: Clock, label: 'Work Item Status', detail: 'Review needed', score: '10/20%', pass: false },
              { icon: Clock, label: 'Test Cycle Status', detail: `${kpis?.test_cycles_running || 0} running`, score: '10/25%', pass: false },
            ].map(gate => (
              <div key={gate.label} className="flex items-center gap-2.5">
                <gate.icon size={14} style={{ color: gate.pass ? '#16A34A' : '#2563EB' }} />
                <span className="text-[13px] flex-1" style={{ fontWeight: 500, color: RH.ink2 }}>{gate.label}</span>
                <span className="text-[12px] text-[#64748B]">{gate.detail}</span>
                <span className="text-[12px]" style={{ fontFamily: RH.fontMono, fontWeight: 650, color: gate.pass ? '#16A34A' : '#64748B' }}>{gate.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Sign-off Queue + Test Cycle Health */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sign-off Queue Widget */}
        <div className="bg-white rounded-[6px] overflow-hidden" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px]" style={{ fontFamily: RH.fontDisplay, fontWeight: 650, color: RH.ink1 }}>Sign-off Queue</h2>
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[11px] font-bold" style={{ background: '#EFF6FF', color: '#2563EB' }}>AI Prioritized</span>
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
                <tr style={{ background: '#F1F5F9' }}>
                  {['CHANGE', 'GATE', 'APPROVER', 'STATUS'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[0.06em] text-[#64748B]" style={{ fontWeight: 600, height: 36, padding: '0 12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingSignoffs.slice(0, 4).map((so: any) => (
                  <tr key={so.id} className="cursor-pointer hover:bg-[rgba(15,23,42,0.04)]" style={{ height: 36, borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                    <td className="px-3" style={{ fontFamily: RH.fontMono, color: '#2563EB', fontWeight: 650 }}>{so.rh_changes?.chg_number || '—'}</td>
                    <td className="px-3 text-[#334155]">{so.signoff_role || so.stage || '—'}</td>
                    <td className="px-3 text-[#64748B]">{so.assigned_to || '—'}</td>
                    <td className="px-3"><StatusLozenge status={so.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Test Cycle Health */}
        <div className="bg-white rounded-[6px] overflow-hidden" style={{ border: '0.75px solid rgba(15,23,42,0.12)' }}>
          <div className="px-5 py-3.5">
            <SectionHeader title="Recent Production Events" action={<button onClick={() => navigate('/release-hub/production-events')} className="text-[12px] font-medium text-[#2563EB] hover:underline">View all</button>} />
          </div>
          {prodEvents.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#94A3B8] text-[13px]">No production events</div>
          ) : (
            <div className="px-5 pb-4 space-y-3">
              {prodEvents.slice(0, 4).map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                    border: `2px solid ${ev.deployment_result === 'SUCCESS' ? '#16A34A' : ev.deployment_result === 'ROLLED_BACK' ? '#DC2626' : '#94A3B8'}`,
                    background: 'white',
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] truncate" style={{ fontWeight: 650, color: RH.ink1 }}>{ev.title}</p>
                    <p className="text-[11px] text-[#64748B]">{ev.deployed_at ? format(new Date(ev.deployed_at), 'MMM d, HH:mm') : '—'} · {ev.deployed_by}</p>
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

import React from 'react';
import { RefreshCw, Download, Package, GitBranch, ShieldCheck, TestTube2 } from 'lucide-react';
import { useReleases, useChanges, useCommandCenterMappings } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS, CHG_STATUS_STYLES, RELEASE_STATUS_STYLES, RELEASE_STATUS_LABELS } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { ChgStatusBadge } from '@/components/releasehub/ChgStatusBadge';
import { CatalystAIChip } from '@/components/releasehub/CatalystAIChip';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours } from 'date-fns';

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: number | string; sub?: string; color: string; icon: any }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]" style={{ fontFamily: RH.fontBody }}>{label}</p>
          <p className="text-[28px] font-extrabold mt-1" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{value}</p>
          {sub && <p className="text-[12px] text-[#64748B] mt-1" style={{ fontFamily: RH.fontBody }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function CommandCenterPage() {
  const { data: releases = [] } = useReleases();
  const { data: changes = [] } = useChanges();
  const { data: mappings = [] } = useCommandCenterMappings();

  const activeReleases = releases.filter((r: any) => r.status === 'in_progress').length;
  const changesInFlight = changes.filter((c: any) => c.status !== 'in_production').length;
  const pendingSignoffs = changes.reduce((acc: number, c: any) => acc + (c.pending_signoffs || 0), 0);

  const statusCounts: Record<string, number> = {};
  changes.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  return (
    <div className="rh-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Command Center</h1>
          <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Release operations overview — real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#475569] flex items-center gap-1.5 hover:bg-[#F8FAFC]">
            <Download size={14} /> Export
          </button>
          <button className="h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#475569] flex items-center gap-1.5 hover:bg-[#F8FAFC]">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Releases Active" value={activeReleases} sub={`${releases.length} total`} color={RH.primary} icon={Package} />
        <StatCard label="Changes In Flight" value={changesInFlight} sub={`${changes.length} total`} color={RH.teal} icon={GitBranch} />
        <StatCard label="Sign-offs Pending" value={pendingSignoffs} color={RH.warning} icon={ShieldCheck} />
        <StatCard label="Test Cycles Linked" value={mappings.length} sub="across releases" color="#7C3AED" icon={TestTube2} />
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: 2/3 */}
        <div className="col-span-2 space-y-4">
          {/* Mapping Table */}
          <div className="bg-white rounded-lg border border-[#E2E8F0]">
            <div className="px-5 py-3 border-b border-[#E2E8F0]">
              <h2 className="text-[14px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Test Cycle → Release → Change Mapping</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                    {['TEST CYCLE', 'RELEASE', 'CHG', 'CYCLE STATUS', 'PASS / FAIL'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">No test cycles linked yet</td></tr>
                  ) : mappings.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#FAFBFC]">
                      <td className="px-4 py-2.5 font-medium">{m.tm_test_cycles?.name || '—'}</td>
                      <td className="px-4 py-2.5">{m.release_id?.slice(0, 8)}</td>
                      <td className="px-4 py-2.5 text-[#94A3B8]">—</td>
                      <td className="px-4 py-2.5"><span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">{m.tm_test_cycles?.status || '—'}</span></td>
                      <td className="px-4 py-2.5 text-[#94A3B8]">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Release Status Table */}
          <div className="bg-white rounded-lg border border-[#E2E8F0]">
            <div className="px-5 py-3 border-b border-[#E2E8F0]">
              <h2 className="text-[14px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Release Status</h2>
            </div>
            <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                  {['RELEASE', 'SOURCE', 'STATUS', 'TARGET', 'CHGs', 'TEST CYCLES'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {releases.map((r: any) => (
                  <tr key={r.id} className="border-b border-[#F1F5F9] hover:bg-[#FAFBFC]">
                    <td className="px-4 py-2.5 font-semibold" style={{ color: RH.ink1 }}>{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: r.source === 'jira' ? '#DBEAFE' : '#F0FDFA', color: r.source === 'jira' ? '#1E40AF' : '#0D9488' }}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><ReleaseStatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-[#475569]">{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F0FDFA] text-[#0D9488] text-[11px] font-bold" style={{ fontFamily: RH.fontMono }}>
                        {r.change_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{r.test_cycle_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: 1/3 */}
        <div className="space-y-4">
          {/* Change Pipeline */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
            <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Change Pipeline</h3>
            <div className="space-y-2">
              {['new', 'in_qa', 'in_uat', 'in_beta', 'in_production'].map(s => (
                <div key={s} className="flex items-center justify-between">
                  <span className={`inline-flex items-center h-5 px-2 rounded text-[10px] font-extrabold uppercase ${CHG_STATUS_STYLES[s]}`}>{CHG_STATUS_LABELS[s]}</span>
                  <span className="text-[16px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{statusCounts[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sign-off Queue */}
          <div className="bg-white rounded-lg border border-[#E2E8F0]">
            <div className="px-4 py-3 border-b border-[#E2E8F0]">
              <h3 className="text-[13px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Sign-off Queue</h3>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {changes.filter((c: any) => c.pending_signoffs > 0).length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-[#94A3B8]">No pending sign-offs</div>
              ) : (
                changes.filter((c: any) => c.pending_signoffs > 0).map((c: any) => {
                  const waitHours = c.oldest_pending_signoff_at ? differenceInHours(new Date(), new Date(c.oldest_pending_signoff_at)) : 0;
                  return (
                    <div key={c.id} className="px-4 py-3 hover:bg-[#FAFBFC]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[12px] font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                          <span className="ml-2 text-[12px] text-[#475569]">{c.status?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${waitHours > 48 ? 'text-[#DC2626]' : 'text-[#64748B]'}`}>
                            {c.oldest_pending_signoff_at ? getSignoffWaitTime(c.oldest_pending_signoff_at) : '—'}
                          </span>
                          {waitHours > 48 && <CatalystAIChip label="escalate" />}
                          <button className="w-6 h-6 rounded bg-[#F0FDF4] text-[#15803D] flex items-center justify-center text-[14px] font-bold hover:bg-[#DCFCE7]">✓</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

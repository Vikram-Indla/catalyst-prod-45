import React, { useEffect } from 'react';
import { RefreshCw, Download, Package, GitBranch, ShieldCheck, TestTube2, CheckCircle } from 'lucide-react';
import { useReleases, useChanges, useCommandCenterMappings } from '@/hooks/useReleaseHub';
import { RH, CHG_STATUS_LABELS, CHG_STATUS_STYLES } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from '@/components/releasehub/ReleaseStatusBadge';
import { CatalystAIChip } from '@/components/releasehub/CatalystAIChip';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function StatCard({ label, value, sub, color, icon: Icon, loading }: { label: string; value: number | string; sub?: string; color: string; icon: any; loading?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: loading ? '#E2E8F0' : color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>{label}</p>
          {loading ? (
            <div className="h-8 w-10 bg-[#E2E8F0] rounded animate-pulse mt-1" />
          ) : (
            <p className="text-[28px] font-extrabold mt-1" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{value}</p>
          )}
          {sub && !loading && <p className="text-[12px] text-[#64748B] mt-1" style={{ fontFamily: RH.fontBody }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: (loading ? '#94A3B8' : color) + '18' }}>
          <Icon size={20} style={{ color: loading ? '#94A3B8' : color }} />
        </div>
      </div>
    </div>
  );
}

export default function CommandCenterPage() {
  const { data: releases = [], isLoading: relLoading } = useReleases();
  const { data: changes = [], isLoading: chgLoading } = useChanges();
  const { data: mappings = [], isLoading: mapLoading } = useCommandCenterMappings();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('signoff-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rh_change_signoffs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['releasehub', 'changes'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const isLoading = relLoading || chgLoading;
  const activeReleases = releases.filter((r: any) => r.status === 'in_progress').length;
  const changesInFlight = changes.filter((c: any) => c.status !== 'in_production').length;
  const pendingSignoffs = changes.reduce((acc: number, c: any) => acc + (c.pending_signoffs || 0), 0);
  const statusCounts: Record<string, number> = {};
  changes.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  return (
    <div className="rh-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Command Center</h1>
          <p className="text-[13px] text-[#64748B]" style={{ fontFamily: RH.fontBody }}>Release operations overview — real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded-md border border-[#C9D3E0] bg-white text-[13px] font-semibold text-[#1E293B] flex items-center gap-1.5 hover:bg-[#F4F7FA] active:scale-[0.98] transition-transform">
            <Download size={14} /> Export
          </button>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['releasehub'] })}
            className="h-8 px-3 rounded-md border border-[#C9D3E0] bg-white text-[13px] font-semibold text-[#1E293B] flex items-center gap-1.5 hover:bg-[#F4F7FA] active:scale-[0.98] transition-transform">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Releases Active" value={activeReleases} sub={`${releases.length} total`} color={RH.primary} icon={Package} loading={isLoading} />
        <StatCard label="Changes In Flight" value={changesInFlight} sub={`${changes.length} total`} color={RH.teal} icon={GitBranch} loading={isLoading} />
        <StatCard label="Sign-offs Pending" value={pendingSignoffs} color={RH.warning} icon={ShieldCheck} loading={isLoading} />
        <StatCard label="Test Cycles Linked" value={mappings.length} sub="across releases" color="#7C3AED" icon={TestTube2} loading={mapLoading} />
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="col-span-2 space-y-3.5">
          {/* Mapping Table */}
          <div className="bg-white rounded-lg border border-[#E2E8F0]">
            <div className="px-4 py-3 border-b border-[#E2E8F0]">
              <h2 className="text-[14px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Test Cycle → Release → Change Mapping</h2>
            </div>
            {mapLoading ? <SkeletonRows count={3} /> : mappings.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#94A3B8] text-[13px]">No test cycles linked yet</div>
            ) : (
              <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
                <thead>
                  <tr className="bg-[#F4F7FA] border-b border-[#E2E8F0]">
                    {['TEST CYCLE', 'RELEASE', 'CHG', 'CYCLE STATUS', 'PASS / FAIL'].map(h => (
                      <th key={h} scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#475569]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-[#F1F5F9] hover:bg-[#F4F7FA] h-9" style={{ transition: 'background 80ms ease' }}>
                      <td className="px-3 py-0 font-medium" style={{ color: RH.ink2 }}>{m.tm_test_cycles?.name || '—'}</td>
                      <td className="px-3 py-0 text-[#94A3B8]">{m.release_id?.slice(0, 8) || '—'}</td>
                      <td className="px-3 py-0 text-[#94A3B8]">—</td>
                      <td className="px-3 py-0"><span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">{m.tm_test_cycles?.status || '—'}</span></td>
                      <td className="px-3 py-0 text-[#94A3B8]">{m.tm_test_cycles?.pass_count ?? '—'} / {m.tm_test_cycles?.fail_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Release Status Table */}
          <div className="bg-white rounded-lg border border-[#E2E8F0]">
            <div className="px-4 py-3 border-b border-[#E2E8F0]">
              <h2 className="text-[14px] font-bold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Release Status</h2>
            </div>
            {relLoading ? <SkeletonRows count={3} /> : releases.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#94A3B8] text-[13px]">No releases</div>
            ) : (
              <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
                <thead>
                  <tr className="bg-[#F4F7FA] border-b border-[#E2E8F0]">
                    {['RELEASE', 'SOURCE', 'STATUS', 'TARGET', 'CHGs', 'TEST CYCLES'].map(h => (
                      <th key={h} scope="col" className="px-3 py-0 h-9 text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#475569]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r: any) => (
                    <tr key={r.id} className="border-b border-[#F1F5F9] hover:bg-[#F4F7FA] h-9" style={{ transition: 'background 80ms ease' }}>
                      <td className="px-3 py-0 font-semibold" style={{ color: RH.ink1 }}>{r.name}</td>
                      <td className="px-3 py-0">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ background: r.source === 'jira' ? '#FFF7ED' : '#F0FDFA', color: r.source === 'jira' ? '#9A3412' : '#0D9488', border: r.source === 'jira' ? '1px solid #FED7AA' : '1px solid #99F6E4' }}>{r.source}</span>
                      </td>
                      <td className="px-3 py-0"><ReleaseStatusBadge status={r.status} /></td>
                      <td className="px-3 py-0 text-[#475569]">{r.target_date ? new Date(r.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-[#94A3B8]">—</span>}</td>
                      <td className="px-3 py-0"><span className="font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{r.change_count || r.chg_count || 0}</span></td>
                      <td className="px-3 py-0 text-[#64748B]">{r.test_cycle_count || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: 1/3 */}
        <div className="space-y-3.5">
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
              {chgLoading ? (
                <div className="px-4 py-6"><SkeletonRows count={2} /></div>
              ) : changes.filter((c: any) => c.pending_signoffs > 0).length === 0 ? (
                <div className="px-4 py-6 text-center flex flex-col items-center gap-2">
                  <CheckCircle size={20} className="text-[#15803D]" />
                  <span className="text-[13px] font-semibold text-[#15803D]">No sign-offs pending — all clear ✓</span>
                </div>
              ) : (
                changes.filter((c: any) => c.pending_signoffs > 0).map((c: any) => {
                  const waitHours = c.oldest_pending_signoff_at ? differenceInHours(new Date(), new Date(c.oldest_pending_signoff_at)) : 0;
                  return (
                    <div key={c.id} className="px-4 py-3 hover:bg-[#F4F7FA]" style={{ transition: 'background 80ms ease' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[12px] font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                          <span className="ml-2 text-[12px] text-[#475569]">{c.status?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold" style={{ color: waitHours > 48 ? 'var(--cp-danger-60)' : waitHours > 24 ? 'var(--cp-warning-60)' : 'var(--cp-text-muted)' }}>
                            {c.oldest_pending_signoff_at ? getSignoffWaitTime(c.oldest_pending_signoff_at) : '—'}
                          </span>
                          {waitHours > 48 && <CatalystAIChip label="escalate" />}
                          <button onClick={() => toast.info('Open CHG drawer to approve specific sign-offs')}
                            className="w-6 h-6 rounded bg-[#F0FDF4] text-[#15803D] flex items-center justify-center text-[14px] font-bold hover:bg-[#DCFCE7]">✓</button>
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

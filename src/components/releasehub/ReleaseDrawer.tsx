import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { ChgStatusBadge } from './ChgStatusBadge';
import { WorkItemTag } from './WorkItemTag';
import { CatalystAIChip } from './CatalystAIChip';
import { useUpdateReleaseStatus, useChanges, useReleaseTestCycles, useApproveSignoff, useRejectSignoff } from '@/hooks/useReleaseHub';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReleaseStatus } from '@/types/releasehub';

interface Props {
  release: any;
  onClose: () => void;
}

function DaysRemainingPill({ days, isOverdue }: { days: number; isOverdue: boolean }) {
  if (isOverdue) return <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">{Math.abs(days)}d OVERDUE</span>;
  const color = days > 14 ? '#15803D' : days > 7 ? '#C2840A' : '#DC2626';
  const bg = days > 14 ? '#F0FDF4' : days > 7 ? '#FFFBEB' : '#FEF2F2';
  return <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: bg, color }}>{days}d left</span>;
}

const TABS = ['Overview', 'Changes', 'Test Cycles', 'Sign-offs', 'Activity'] as const;

export function ReleaseDrawer({ release, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const updateStatus = useUpdateReleaseStatus();
  const { data: allChanges = [] } = useChanges();
  const { data: testCycles = [] } = useReleaseTestCycles(release.id);
  const relChanges = allChanges.filter((c: any) => c.release_id === release.id);

  const handleStatusChange = (status: ReleaseStatus) => {
    updateStatus.mutate({ id: release.id, status }, {
      onSuccess: () => toast.success(`Release status updated to ${status}`),
      onError: (err: any) => toast.error(err.message || 'Failed to update'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative w-[700px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: release.source === 'jira' ? '#FFF7ED' : '#F0FDFA', color: release.source === 'jira' ? '#9A3412' : '#0D9488', border: release.source === 'jira' ? '1px solid #FED7AA' : '1px solid #99F6E4' }}>{release.source}</span>
              {release.version && <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{release.version}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><Download size={14} /></button>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><RefreshCw size={14} /></button>
              <button onClick={onClose} aria-label="Close drawer" className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
            </div>
          </div>
          <h2 className="text-[18px] font-extrabold mb-2" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{release.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <ReleaseStatusBadge status={release.status} onChange={handleStatusChange} />
            <span className="text-[12px] text-[#64748B]">{release.target_date ? new Date(release.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
            <DaysRemainingPill days={release.days_remaining ?? 0} isOverdue={!!release.is_overdue} />
            <span className="text-[11px] font-bold text-[#0D9488] bg-[#F0FDFA] px-1.5 py-0.5 rounded">{relChanges.length} CHGs</span>
            <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded">{testCycles.length} cycles</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E2E8F0] px-6 flex gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#475569]'}`}>
              {tab}
              {tab === 'Changes' && <span className="ml-1 text-[10px] font-bold bg-[#F0FDFA] text-[#0D9488] px-1 rounded">{relChanges.length}</span>}
              {tab === 'Test Cycles' && <span className="ml-1 text-[10px] font-bold bg-[#EDE9FE] text-[#7C3AED] px-1 rounded">{testCycles.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && <OverviewTab release={release} changesCount={relChanges.length} />}
          {activeTab === 'Changes' && <ChangesTab changes={relChanges} />}
          {activeTab === 'Test Cycles' && <TestCyclesTab testCycles={testCycles} release={release} />}
          {activeTab === 'Sign-offs' && <SignoffsTab releaseId={release.id} changes={relChanges} />}
          {activeTab === 'Activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ release, changesCount }: { release: any; changesCount: number }) {
  const gates = [
    { label: 'Build Success', pass: true },
    { label: 'Pass Rate ≥85%', pass: false },
    { label: 'Open Blockers = 0', pass: true },
    { label: 'Code Coverage ≥80%', pass: false },
    { label: 'Security Scan', pass: true },
    { label: 'Critical Defects = 0', pass: true },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#F4F7FA] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Status</p>
          <ReleaseStatusBadge status={release.status} />
        </div>
        <div className="bg-[#F4F7FA] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Changes</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{changesCount}</p>
        </div>
        <div className="bg-[#F4F7FA] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Quality Gates</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{gates.filter(g => g.pass).length}/{gates.length}</p>
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Quality Gates</h3>
        <div className="grid grid-cols-2 gap-2">
          {gates.map(g => (
            <div key={g.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${g.pass ? 'bg-[#F0FDF4] border-[#86EFAC]' : 'bg-[#FEF2F2] border-[#FCA5A5]'}`}>
              <span className={`text-[14px] ${g.pass ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>{g.pass ? '✓' : '✕'}</span>
              <span className="text-[12px] font-medium" style={{ color: RH.ink2 }}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangesTab({ changes }: { changes: any[] }) {
  if (changes.length === 0) return <div className="text-center py-10 text-[#94A3B8] text-[13px]">No changes linked to this release</div>;
  return (
    <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }}>
      <thead>
        <tr className="border-b border-[#E2E8F0]">
          {['CHG', 'TITLE', 'STATUS', 'RISK', 'PLANNED', 'FE', 'BE'].map(h => (
            <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#64748B]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map((c: any) => (
          <tr key={c.id} className="border-b border-[#F1F5F9] hover:bg-[#FAFBFC]">
            <td className="px-3 py-2 font-bold text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</td>
            <td className="px-3 py-2 truncate max-w-[200px]" title={c.title}>{c.title}</td>
            <td className="px-3 py-2"><ChgStatusBadge status={c.status} /></td>
            <td className="px-3 py-2"><span className="text-[10px] font-bold uppercase">{c.risk_level}</span></td>
            <td className="px-3 py-2 text-[#64748B]">{c.deployment_date ? new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
            <td className="px-3 py-2">{c.frontend_commit ? <span className="font-mono text-[11px] bg-[#F1F5F9] px-1 rounded">{c.frontend_commit.slice(0, 8)}</span> : <span className="text-[#94A3B8]">—</span>}</td>
            <td className="px-3 py-2">{c.backend_commit ? <span className="font-mono text-[11px] bg-[#F1F5F9] px-1 rounded">{c.backend_commit.slice(0, 8)}</span> : <span className="text-[#94A3B8]">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TestCyclesTab({ testCycles, release }: { testCycles: any[]; release: any }) {
  if (testCycles.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[#94A3B8] text-[13px] mb-3">No test cycles linked</p>
        <button className="h-9 px-4 rounded-md border border-[#7C3AED] text-[#7C3AED] text-[13px] font-semibold hover:bg-[#EDE9FE]">Link Test Cycle</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {testCycles.map((tc: any) => {
        const cycle = tc.tm_test_cycles;
        const passCount = cycle?.pass_count || 0;
        const totalCases = cycle?.total_cases || 1;
        const passRate = Math.round((passCount / totalCases) * 100);
        const daysLeft = release.days_remaining ?? 99;
        const atRisk = cycle?.status === 'running' && daysLeft < 7 && passRate < 50;
        return (
          <div key={tc.id} className="border border-[#E2E8F0] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold" style={{ color: RH.ink1 }}>{cycle?.name || 'Cycle'}</span>
              <a href={`/testhub/cycles/${tc.test_cycle_id}`} className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline">
                Open in TestHub <ExternalLink size={10} />
              </a>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">{cycle?.status || 'unknown'}</span>
              <span className="text-[11px] text-[#64748B]">{passCount}/{totalCases} cases</span>
            </div>
            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#15803D] rounded-full" style={{ width: `${passRate}%` }} />
            </div>
            {atRisk && <CatalystAIChip label="test cycle at risk — recommend pause release" className="mt-2" />}
          </div>
        );
      })}
    </div>
  );
}

function SignoffsTab({ releaseId, changes }: { releaseId: string; changes: any[] }) {
  const changeIds = changes.map((c: any) => c.id);
  const { data: signoffs = [], isLoading } = useQuery({
    queryKey: ['releasehub', 'release-signoffs', releaseId],
    queryFn: async () => {
      if (changeIds.length === 0) return [];
      const { data, error } = await supabase.from('rh_change_signoffs').select('*').in('change_id', changeIds).order('wait_started_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: changeIds.length > 0,
  });
  const approveSignoff = useApproveSignoff();
  const rejectSignoff = useRejectSignoff();

  if (isLoading) return <div className="text-center py-6 text-[#94A3B8] text-[13px]">Loading...</div>;

  const stages = [
    { stage: 'QA', key: 'in_qa' },
    { stage: 'UAT', key: 'in_uat' },
    { stage: 'Product Owner', key: 'in_beta' },
    { stage: 'Deploy Auth', key: 'in_production' },
  ];

  return (
    <div className="space-y-0">
      {stages.map((s, i) => {
        const stageSignoffs = signoffs.filter((so: any) => so.stage === s.key);
        const allApproved = stageSignoffs.length > 0 && stageSignoffs.every((so: any) => so.status === 'approved');
        const hasPending = stageSignoffs.some((so: any) => so.status === 'pending');
        const status = allApproved ? 'approved' : hasPending ? 'pending' : stageSignoffs.length > 0 ? 'pending' : 'locked';

        return (
          <div key={s.stage} className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              status === 'approved' ? 'bg-[#DCFCE7] text-[#15803D]' :
              status === 'pending' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
              'bg-[#F1F5F9] text-[#94A3B8]'
            }`}>
              {status === 'approved' ? '✓' : status === 'pending' ? i + 1 : '🔒'}
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-medium" style={{ color: RH.ink2 }}>{s.stage}</span>
              {stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => {
                const waitHours = so.wait_started_at ? differenceInHours(new Date(), new Date(so.wait_started_at)) : 0;
                return (
                  <span key={so.id} className={`ml-2 text-[11px] font-bold ${waitHours > 48 ? 'text-[#DC2626]' : waitHours > 24 ? 'text-[#C2840A]' : 'text-[#64748B]'}`}>
                    {getSignoffWaitTime(so.wait_started_at)}
                  </span>
                );
              })}
            </div>
            {hasPending && stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => (
              <div key={so.id} className="flex items-center gap-2">
                <button onClick={() => approveSignoff.mutate(so.id, { onSuccess: () => toast.success('Approved') })}
                  className="h-7 px-3 rounded bg-[#15803D] text-white text-[11px] font-bold hover:bg-[#166534]">Approve</button>
                <button onClick={() => rejectSignoff.mutate({ signoffId: so.id, comment: 'Rejected' }, { onSuccess: () => toast.success('Rejected') })}
                  className="h-7 px-3 rounded border border-[#FCA5A5] text-[#DC2626] text-[11px] font-bold hover:bg-[#FEF2F2]">Reject</button>
              </div>
            ))}
          </div>
        );
      })}
      {signoffs.length === 0 && <div className="text-center py-6 text-[#94A3B8] text-[13px]">No sign-offs configured</div>}
    </div>
  );
}

function ActivityTab() {
  return <div className="text-center py-10 text-[#94A3B8] text-[13px]">Release activity feed — coming soon</div>;
}

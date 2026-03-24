import React, { useState } from 'react';
import { X, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { StatusLozenge } from './StatusLozenge';
import { SourceBadge } from './SourceBadge';
import { CatalystAIChip } from './CatalystAIChip';
import { useUpdateReleaseStatus, useChanges, useReleaseTestCycles, useApproveSignoff, useRejectSignoff } from '@/hooks/useReleaseHub';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReleaseStatus } from '@/types/releasehub';

interface Props {
  release: any;
  onClose: () => void;
}

function mapStatus(status: string) {
  if (status === 'todo') return 'planning';
  if (status === 'done') return 'released';
  return status;
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
        <div className="sticky top-0 bg-white z-10 border-b border-[rgba(15,23,42,0.12)] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <SourceBadge source={release.source || 'catalyst'} />
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><Download size={14} /></button>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><RefreshCw size={14} /></button>
              <button onClick={onClose} aria-label="Close drawer" className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
            </div>
          </div>
          <h2 className="text-[18px] font-extrabold mb-2" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{release.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusLozenge status={mapStatus(release.status)} />
            <span className="text-[12px] text-[#64748B]">{release.target_date ? new Date(release.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
            <span className="text-[11px] font-bold text-[#0F172A] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{relChanges.length} CHGs</span>
            <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded">{testCycles.length} cycles</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[rgba(15,23,42,0.12)] px-6 flex gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#475569]'}`}>
              {tab}
              {tab === 'Changes' && <span className="ml-1 text-[10px] font-bold bg-[#F1F5F9] text-[#475569] px-1 rounded">{relChanges.length}</span>}
              {tab === 'Test Cycles' && <span className="ml-1 text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-1 rounded">{testCycles.length}</span>}
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
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Status</p>
          <StatusLozenge status={release.status === 'todo' ? 'planning' : release.status === 'done' ? 'released' : release.status} />
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Changes</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{changesCount}</p>
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Quality Gates</p>
          <p className="text-[20px] font-extrabold" style={{ fontFamily: RH.fontMono, color: RH.ink1 }}>{gates.filter(g => g.pass).length}/{gates.length}</p>
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Quality Gates</h3>
        <div className="grid grid-cols-2 gap-2">
          {gates.map(g => (
            <div key={g.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${g.pass ? 'bg-[#1B7F37] border-[#86EFAC]' : 'bg-[#FEF2F2] border-[#FCA5A5]'}`}>
              <span className={`text-[14px] ${g.pass ? 'text-white' : 'text-[#DC2626]'}`}>{g.pass ? '✓' : '✕'}</span>
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
        <tr className="border-b border-[rgba(15,23,42,0.12)]">
          {['KEY', 'TITLE', 'STATUS', 'RISK', 'DATE'].map(h => (
            <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map((c: any) => (
          <tr key={c.id} className="border-b border-[rgba(15,23,42,0.06)]" style={{ height: 36, background: '#FFFFFF' }}>
            <td className="px-3 py-2"><span className="font-medium text-[#2563EB]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span></td>
            <td className="px-3 py-2 truncate max-w-[200px]" title={c.title}>{c.title}</td>
            <td className="px-3 py-2"><StatusLozenge status={c.status} /></td>
            <td className="px-3 py-2"><span className="text-[11px] font-bold uppercase text-[#475569]">{c.risk_level}</span></td>
            <td className="px-3 py-2 text-[#64748B]" style={{ fontFamily: RH.fontMono, fontSize: 12 }}>{c.deployment_date ? new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
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
        <button className="h-9 px-4 rounded-md border border-[#2563EB] text-[#2563EB] text-[13px] font-semibold hover:bg-[#EFF6FF]">Link Test Cycle</button>
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
          <div key={tc.id} className="border border-[rgba(15,23,42,0.12)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold" style={{ color: RH.ink1 }}>{cycle?.name || 'Cycle'}</span>
              <a href={`/testhub/cycles/${tc.test_cycle_id}`} className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline">
                Open in TestHub <ExternalLink size={10} />
              </a>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <StatusLozenge status={cycle?.status || 'not_started'} />
              <span className="text-[11px] text-[#64748B]">{passCount}/{totalCases} cases</span>
            </div>
            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${passRate}%` }} />
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
          <div key={s.stage} className="flex items-center gap-3 py-3 border-b border-[rgba(15,23,42,0.06)] last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              status === 'approved' ? 'bg-[#1B7F37] text-white' :
              status === 'pending' ? 'bg-[#0C66E4] text-white' :
              'bg-[#F1F5F9] text-[#94A3B8]'
            }`}>
              {status === 'approved' ? '✓' : status === 'pending' ? i + 1 : '🔒'}
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-medium" style={{ color: RH.ink2 }}>{s.stage}</span>
              {stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => {
                const waitHours = so.wait_started_at ? differenceInHours(new Date(), new Date(so.wait_started_at)) : 0;
                return (
                  <span key={so.id} className="ml-2 text-[11px] font-bold" style={{ color: waitHours > 48 ? '#DC2626' : waitHours > 24 ? '#2563EB' : '#94A3B8' }}>
                    {getSignoffWaitTime(so.wait_started_at)}
                  </span>
                );
              })}
            </div>
            {hasPending && stageSignoffs.filter((so: any) => so.status === 'pending').map((so: any) => (
              <div key={so.id} className="flex items-center gap-2">
                <button onClick={() => approveSignoff.mutate(so.id, { onSuccess: () => toast.success('Approved') })}
                  className="h-7 px-3 rounded bg-[#1B7F37] text-white text-[11px] font-bold hover:bg-[#004D33]">Approve</button>
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

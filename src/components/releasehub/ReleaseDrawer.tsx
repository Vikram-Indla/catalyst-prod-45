import React, { useState } from 'react';
import { X, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { ChgStatusBadge } from './ChgStatusBadge';
import { WorkItemTag } from './WorkItemTag';
import { CatalystAIChip } from './CatalystAIChip';
import { useUpdateReleaseStatus, useChanges, useReleaseTestCycles } from '@/hooks/useReleaseHub';
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
    updateStatus.mutate({ id: release.id, status });
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
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: release.source === 'jira' ? '#DBEAFE' : '#F0FDFA', color: release.source === 'jira' ? '#1E40AF' : '#0D9488' }}>{release.source}</span>
              {release.version && <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">{release.version}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><Download size={14} /></button>
              <button className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><RefreshCw size={14} /></button>
              <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
            </div>
          </div>
          <h2 className="text-[18px] font-extrabold mb-2" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{release.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <ReleaseStatusBadge status={release.status} onChange={handleStatusChange} />
            <span className="text-[12px] text-[#64748B]">{release.target_date ? new Date(release.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
            <DaysRemainingPill days={release.days_remaining ?? 0} isOverdue={!!release.is_overdue} />
            <span className="text-[11px] font-bold text-[#0D9488] bg-[#F0FDFA] px-1.5 py-0.5 rounded">{release.change_count || 0} CHGs</span>
            <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded">{release.test_cycle_count || 0} cycles</span>
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
          {activeTab === 'Sign-offs' && <SignoffsTab />}
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
  return (
    <div>
      {changes.length === 0 ? (
        <div className="text-center py-10 text-[#94A3B8] text-[13px]">No changes linked to this release</div>
      ) : (
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
      )}
    </div>
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
      {testCycles.map((tc: any) => (
        <div key={tc.id} className="border border-[#E2E8F0] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold" style={{ color: RH.ink1 }}>{tc.tm_test_cycles?.name || 'Cycle'}</span>
            <a href={`/testhub/cycles/${tc.test_cycle_id}`} className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline">
              Open in TestHub <ExternalLink size={10} />
            </a>
          </div>
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div className="h-full bg-[#15803D] rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SignoffsTab() {
  const stages = [
    { stage: 'QA', status: 'approved' as const },
    { stage: 'UAT', status: 'pending' as const },
    { stage: 'Product Owner', status: 'locked' as const },
    { stage: 'Deploy Auth', status: 'locked' as const },
  ];
  return (
    <div className="space-y-0">
      {stages.map((s, i) => (
        <div key={s.stage} className="flex items-center gap-3 py-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
            s.status === 'approved' ? 'bg-[#DCFCE7] text-[#15803D]' :
            s.status === 'pending' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
            'bg-[#F1F5F9] text-[#94A3B8]'
          }`}>
            {s.status === 'approved' ? '✓' : s.status === 'locked' ? '🔒' : i + 1}
          </div>
          <div className="flex-1">
            <span className="text-[13px] font-medium" style={{ color: RH.ink2 }}>{s.stage}</span>
          </div>
          {s.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button className="h-7 px-3 rounded bg-[#15803D] text-white text-[11px] font-bold hover:bg-[#166534]">Approve</button>
              <button className="h-7 px-3 rounded border border-[#FCA5A5] text-[#DC2626] text-[11px] font-bold hover:bg-[#FEF2F2]">Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ActivityTab() {
  return <div className="text-center py-10 text-[#94A3B8] text-[13px]">Activity feed coming in Stage D</div>;
}

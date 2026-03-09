import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { RH, CHG_STATUS_ORDER, CHG_STATUS_LABELS, CHG_STATUS_STYLES, RISK_STYLES } from '@/constants/releasehub.design';
import { ChgStatusBadge } from './ChgStatusBadge';
import { WorkItemTag } from './WorkItemTag';
import { useUpdateChangeStatus } from '@/hooks/useReleaseHub';
import type { ChangeStatus } from '@/types/releasehub';

interface Props {
  change: any;
  onClose: () => void;
}

const TABS = ['Overview', 'Work Items', 'Sign-offs', 'Activity'] as const;

export function ChgDrawer({ change: c, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const updateStatus = useUpdateChangeStatus();
  const workItems = c.rh_change_work_items || [];
  const currentIdx = CHG_STATUS_ORDER.indexOf(c.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative w-[700px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-[#E2E8F0] px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {c.sn_imported && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#1E40AF]">ServiceNow</span>}
              <span className="text-[16px] font-black text-[#0D9488]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${RISK_STYLES[c.risk_level] || ''}`}>{c.risk_level}</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
          </div>
          <h2 className="text-[18px] font-extrabold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{c.title}</h2>
          <div className="flex items-center gap-2 mb-4">
            <ChgStatusBadge status={c.status} />
            {c.category && <span className="text-[12px] text-[#64748B]">{c.category}</span>}
            {c.deployment_date && <span className="text-[12px] text-[#64748B]">Planned: {new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </div>

          {/* Status Stepper */}
          <div className="flex items-center gap-0">
            {CHG_STATUS_ORDER.map((s, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`flex-1 h-0.5 ${isDone || isCurrent ? 'bg-[#0D9488]' : 'bg-[#E2E8F0]'}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isDone ? 'bg-[#0D9488] text-white' : isCurrent ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]'
                  }`}>
                    {isDone ? '✓' : isCurrent ? '●' : i + 1}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {CHG_STATUS_ORDER.map(s => (
              <span key={s} className="text-[8px] font-medium text-[#94A3B8] text-center" style={{ width: 60 }}>{CHG_STATUS_LABELS[s]}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E2E8F0] px-6 flex gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#475569]'}`}>
              {tab}
              {tab === 'Work Items' && workItems.length > 0 && <span className="ml-1 text-[10px] font-bold bg-[#F0FDFA] text-[#0D9488] px-1 rounded">{workItems.length}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'Overview' && <OverviewTab change={c} />}
          {activeTab === 'Work Items' && <WorkItemsTab workItems={workItems} />}
          {activeTab === 'Sign-offs' && <SignoffsTab />}
          {activeTab === 'Activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ change: c }: { change: any }) {
  const envStages = ['Staging', 'UAT', 'Beta', 'Production', 'Live'];
  const statusMap: Record<string, number> = { new: 0, in_qa: 0, in_uat: 1, in_beta: 2, in_production: 3 };
  const activeIdx = statusMap[c.status] ?? 0;

  return (
    <div className="space-y-5">
      {/* Environment Pipeline */}
      <div>
        <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Environment Pipeline</h3>
        <div className="flex items-center gap-0">
          {envStages.map((s, i) => {
            const isDone = i < activeIdx;
            const isCurrent = i === activeIdx;
            return (
              <React.Fragment key={s}>
                {i > 0 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-[#15803D]' : 'bg-[#E2E8F0]'}`} />}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${
                    isDone ? 'bg-[#15803D] text-white' : isCurrent ? 'border-2 border-[#2563EB] text-[#2563EB]' : 'border border-[#E2E8F0] text-[#94A3B8]'
                  }`}>
                    {isDone ? '✓' : isCurrent ? '●' : i + 1}
                  </div>
                  <span className="text-[9px] font-medium text-[#64748B]">{s}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Deployment Template */}
      <div>
        <h3 className="text-[13px] font-bold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Deployment Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'CHG Number', value: c.chg_number, mono: true },
            { label: 'Category', value: c.category },
            { label: 'Frontend Required', value: c.frontend_required ? 'Yes' : 'No' },
            { label: 'Frontend Commit', value: c.frontend_commit, mono: true },
            { label: 'Backend Required', value: c.backend_required ? 'Yes' : 'No' },
            { label: 'Backend Commit', value: c.backend_commit, mono: true },
            { label: 'Dependency', value: c.dependency },
            { label: 'Deployment Process', value: c.deployment_process },
          ].map(f => (
            <div key={f.label} className="bg-[#F4F7FA] rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase text-[#64748B] mb-1">{f.label}</p>
              <p className={`text-[13px] font-medium ${f.mono ? '' : ''}`}
                style={{ fontFamily: f.mono ? RH.fontMono : RH.fontBody, color: f.value ? RH.ink2 : '#94A3B8' }}>
                {f.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkItemsTab({ workItems }: { workItems: any[] }) {
  if (workItems.length === 0) return <div className="text-center py-10 text-[#94A3B8] text-[13px]">No work items linked</div>;
  return (
    <div className="space-y-2">
      {workItems.map((wi: any) => (
        <WorkItemTag key={wi.id || wi.work_item_key} workItemKey={wi.work_item_key} title={wi.work_item_title} type={wi.work_item_type} status={wi.work_item_status} />
      ))}
    </div>
  );
}

function SignoffsTab() {
  return <div className="text-center py-10 text-[#94A3B8] text-[13px]">Sign-off chain rendered from release context</div>;
}

function ActivityTab() {
  return <div className="text-center py-10 text-[#94A3B8] text-[13px]">Activity feed coming in Stage D</div>;
}

import React, { useState } from 'react';
import { X, ExternalLink, ChevronRight } from 'lucide-react';
import { RH, CHG_STATUS_ORDER, CHG_STATUS_LABELS, RISK_STYLES } from '@/constants/releasehub.design';
import { ChgStatusBadge } from './ChgStatusBadge';
import { WorkItemTag } from './WorkItemTag';
import { CatalystAIChip } from './CatalystAIChip';
import { ChgGateModal } from './ChgGateModal';
import { useUpdateChangeStatus, useChangeSignoffs, useChangeHistory, useApproveSignoff, useRejectSignoff, useLinkWorkItem } from '@/hooks/useReleaseHub';
import { getSignoffWaitTime } from '@/utils/releasehub.utils';
import { differenceInHours, format } from 'date-fns';
import { toast } from 'sonner';
import type { ChangeStatus } from '@/types/releasehub';

interface Props {
  change: any;
  onClose: () => void;
}

const TABS = ['Overview', 'Work Items', 'Sign-offs', 'Activity'] as const;

export function ChgDrawer({ change: c, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const [gateOpen, setGateOpen] = useState(false);
  const updateStatus = useUpdateChangeStatus();
  const workItems = c.rh_change_work_items || [];
  const currentIdx = CHG_STATUS_ORDER.indexOf(c.status);

  const handleAdvanceStatus = (newStatus: string) => {
    if (newStatus === 'in_beta') {
      const hasWorkItems = (c.work_item_count || workItems.length) > 0;
      if (!hasWorkItems) {
        setGateOpen(true);
        return;
      }
    }
    updateStatus.mutate({ id: c.id, status: newStatus }, {
      onSuccess: () => toast.success(`Status updated to ${CHG_STATUS_LABELS[newStatus]}`),
      onError: (err: any) => toast.error(err.message || 'Failed to update status'),
    });
  };

  const nextStatus = currentIdx < CHG_STATUS_ORDER.length - 1 ? CHG_STATUS_ORDER[currentIdx + 1] : null;

  return (
    <>
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
              <button onClick={onClose} aria-label="Close drawer" className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
            </div>
            <h2 className="text-[18px] font-extrabold mb-3" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>{c.title}</h2>
            <div className="flex items-center gap-2 mb-4">
              <ChgStatusBadge status={c.status} />
              {c.category && <span className="text-[12px] text-[#64748B]">{c.category}</span>}
              {c.deployment_date && <span className="text-[12px] text-[#64748B]">Planned: {new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              {nextStatus && (
                <button onClick={() => handleAdvanceStatus(nextStatus)}
                  disabled={updateStatus.isPending}
                  className="ml-auto h-7 px-3 rounded-md bg-[#0D9488] text-white text-[11px] font-bold flex items-center gap-1 hover:bg-[#0B7C71] disabled:opacity-50">
                  Advance to {CHG_STATUS_LABELS[nextStatus]} <ChevronRight size={12} />
                </button>
              )}
            </div>

            {/* Status Stepper */}
            <div className="flex items-center gap-0">
              {CHG_STATUS_ORDER.map((s, i) => {
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
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
            {activeTab === 'Work Items' && <WorkItemsTab workItems={workItems} changeId={c.id} />}
            {activeTab === 'Sign-offs' && <SignoffsTab changeId={c.id} />}
            {activeTab === 'Activity' && <ActivityTab changeId={c.id} />}
          </div>
        </div>
      </div>
      {gateOpen && <ChgGateModal changeId={c.id} chgNumber={c.chg_number} onResolved={() => { setGateOpen(false); handleAdvanceStatus('in_beta'); }} />}
    </>
  );
}

function OverviewTab({ change: c }: { change: any }) {
  const envStages = ['Staging', 'UAT', 'Beta', 'Production', 'Live'];
  const statusMap: Record<string, number> = { new: 0, in_qa: 0, in_uat: 1, in_beta: 2, in_production: 3 };
  const activeIdx = statusMap[c.status] ?? 0;

  return (
    <div className="space-y-5">
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
              <p className="text-[13px] font-medium"
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

function WorkItemsTab({ workItems, changeId }: { workItems: any[]; changeId: string }) {
  const [showLink, setShowLink] = useState(false);
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const linkWorkItem = useLinkWorkItem();

  const handleLink = () => {
    if (!key || !title) return;
    linkWorkItem.mutate({ changeId, workItem: { work_item_key: key, work_item_title: title, work_item_type: 'story', work_item_status: 'todo' } }, {
      onSuccess: () => { setShowLink(false); setKey(''); setTitle(''); toast.success('Work item linked'); },
    });
  };

  return (
    <div className="space-y-3">
      {workItems.length === 0 && !showLink && <div className="text-center py-6 text-[#94A3B8] text-[13px]">No work items linked</div>}
      {workItems.map((wi: any) => (
        <WorkItemTag key={wi.id || wi.work_item_key} workItemKey={wi.work_item_key} title={wi.work_item_title} type={wi.work_item_type} status={wi.work_item_status} />
      ))}
      {showLink ? (
        <div className="border border-[#E2E8F0] rounded-lg p-3 space-y-2">
          <input type="text" value={key} onChange={e => setKey(e.target.value)} placeholder="Key (e.g. BAU-4612)"
            className="w-full h-8 px-2 rounded border border-[#E2E8F0] text-[12px] font-mono" />
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
            className="w-full h-8 px-2 rounded border border-[#E2E8F0] text-[12px]" />
          <div className="flex gap-2">
            <button onClick={() => setShowLink(false)} className="h-7 px-3 rounded border border-[#E2E8F0] text-[11px] text-[#475569]">Cancel</button>
            <button onClick={handleLink} disabled={!key || !title || linkWorkItem.isPending}
              className="h-7 px-3 rounded bg-[#0D9488] text-white text-[11px] font-bold disabled:opacity-50">
              {linkWorkItem.isPending ? 'Linking...' : 'Link'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowLink(true)} className="h-8 px-3 rounded-md border border-[#99F6E4] text-[#0D9488] text-[12px] font-semibold hover:bg-[#F0FDFA]">
          + Link Work Item
        </button>
      )}
    </div>
  );
}

function SignoffsTab({ changeId }: { changeId: string }) {
  const { data: signoffs = [], isLoading } = useChangeSignoffs(changeId);
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
        const signoff = signoffs.find((so: any) => so.stage === s.key);
        const status = signoff?.status || 'locked';
        const waitHours = signoff?.wait_started_at ? differenceInHours(new Date(), new Date(signoff.wait_started_at)) : 0;

        return (
          <div key={s.stage} className="flex items-center gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
              status === 'approved' ? 'bg-[#DCFCE7] text-[#15803D]' :
              status === 'pending' ? 'bg-[#DBEAFE] text-[#1E40AF]' :
              status === 'rejected' ? 'bg-[#FEF2F2] text-[#DC2626]' :
              'bg-[#F1F5F9] text-[#94A3B8]'
            }`}>
              {status === 'approved' ? '✓' : status === 'rejected' ? '✕' : status === 'pending' ? i + 1 : '🔒'}
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-medium" style={{ color: RH.ink2 }}>{s.stage}</span>
              {signoff && status === 'pending' && waitHours > 0 && (
                <span className="ml-2 text-[11px] font-bold" style={{ color: waitHours > 48 ? 'var(--cp-danger-60)' : waitHours > 24 ? 'var(--cp-warning-60)' : 'var(--cp-text-muted)' }}>
                  {getSignoffWaitTime(signoff.wait_started_at)}
                </span>
              )}
              {waitHours > 48 && <CatalystAIChip label="escalate" className="ml-2" />}
            </div>
            {signoff && status === 'pending' && (
              <div className="flex items-center gap-2">
                <button onClick={() => approveSignoff.mutate(signoff.id, { onSuccess: () => toast.success('Approved') })}
                  disabled={approveSignoff.isPending}
                  className="h-7 px-3 rounded bg-[#15803D] text-white text-[11px] font-bold hover:bg-[#166534] disabled:opacity-50">Approve</button>
                <button onClick={() => rejectSignoff.mutate({ signoffId: signoff.id, comment: 'Rejected' }, { onSuccess: () => toast.success('Rejected') })}
                  disabled={rejectSignoff.isPending}
                  className="h-7 px-3 rounded border border-[#FCA5A5] text-[#DC2626] text-[11px] font-bold hover:bg-[#FEF2F2] disabled:opacity-50">Reject</button>
              </div>
            )}
          </div>
        );
      })}
      {signoffs.length === 0 && <div className="text-center py-6 text-[#94A3B8] text-[13px]">No sign-offs configured for this change</div>}
    </div>
  );
}

function ActivityTab({ changeId }: { changeId: string }) {
  const { data: history = [], isLoading } = useChangeHistory(changeId);

  if (isLoading) return <div className="text-center py-6 text-[#94A3B8] text-[13px]">Loading...</div>;
  if (history.length === 0) return <div className="text-center py-6 text-[#94A3B8] text-[13px]">No activity yet</div>;

  return (
    <div className="space-y-2">
      {history.map((h: any) => (
        <div key={h.id} className="flex items-start gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
          <div className="w-2 h-2 rounded-full bg-[#0D9488] mt-1.5 shrink-0" />
          <div>
            <p className="text-[12px] text-[#475569]">
              Status changed {h.from_status ? `from ${CHG_STATUS_LABELS[h.from_status] || h.from_status}` : ''} to <span className="font-bold">{CHG_STATUS_LABELS[h.to_status] || h.to_status}</span>
            </p>
            {h.comment && <p className="text-[11px] text-[#94A3B8] mt-0.5">{h.comment}</p>}
            <p className="text-[10px] text-[#94A3B8] mt-0.5">{h.changed_at ? format(new Date(h.changed_at), 'MMM d, yyyy HH:mm') : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

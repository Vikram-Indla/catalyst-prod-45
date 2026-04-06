import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { useLinkWorkItem } from '@/hooks/useReleaseHub';

interface Props {
  changeId: string;
  chgNumber: string;
  onResolved: () => void;
}

export function ChgGateModal({ changeId, chgNumber, onResolved }: Props) {
  const [mode, setMode] = useState<'choose' | 'link'>('choose');
  const [workItemKey, setWorkItemKey] = useState('');
  const [workItemTitle, setWorkItemTitle] = useState('');
  const linkWorkItem = useLinkWorkItem();

  const handleLink = () => {
    if (!workItemKey || !workItemTitle) return;
    linkWorkItem.mutate({
      changeId,
      workItem: { work_item_key: workItemKey, work_item_title: workItemTitle, work_item_type: 'story', work_item_status: 'todo' },
    }, { onSuccess: () => onResolved() });
  };

  // NON-DISMISSIBLE: no backdrop click, no Esc, no X button
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-[#080E1D]/50 backdrop-blur-[2px]" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden">
        <div className="bg-[#FEF2F2] border-b border-[#FCA5A5] px-6 py-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-[#DC2626]" />
          <div>
            <h2 className="text-[15px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: 'var(--sem-danger)' }}>CHG Gate — Work Items Required</h2>
            <p className="text-[12px] text-[#991B1B]">{chgNumber} cannot advance to Beta without linked work items.</p>
          </div>
        </div>
        <div className="p-6">
          {mode === 'choose' ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[#475569] mb-4">Resolve by linking at least one work item:</p>
              <button onClick={() => setMode('link')}
                className="w-full h-11 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8]">
                Link Work Item
              </button>
              <button onClick={onResolved}
                className="w-full h-11 rounded-md border border-[var(--bd-default, #E2E8F0)] text-[13px] font-medium text-[#94A3B8] hover:bg-[#F4F7FA]">
                Skip (RM only · logged)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#475569] mb-1">Work Item Key *</label>
                <input type="text" value={workItemKey} onChange={e => setWorkItemKey(e.target.value)} placeholder="e.g. BAU-4612"
                  className="w-full h-9 px-3 rounded-md border border-[var(--bd-default, #E2E8F0)] text-[13px] font-mono" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#475569] mb-1">Title *</label>
                <input type="text" value={workItemTitle} onChange={e => setWorkItemTitle(e.target.value)} placeholder="Describe the work item"
                  className="w-full h-9 px-3 rounded-md border border-[var(--bd-default, #E2E8F0)] text-[13px]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMode('choose')} className="flex-1 h-9 rounded-md border border-[var(--bd-default, #E2E8F0)] text-[13px] font-medium text-[#475569]">Back</button>
                <button onClick={handleLink} disabled={!workItemKey || !workItemTitle || linkWorkItem.isPending}
                  className="flex-1 h-9 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold disabled:opacity-50">
                  {linkWorkItem.isPending ? 'Linking...' : 'Link & Continue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

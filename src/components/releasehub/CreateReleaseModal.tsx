import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { useCreateRelease } from '@/hooks/useReleaseHub';
import { toast } from 'sonner';

interface Props { onClose: () => void }

export function CreateReleaseModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [version, setVersion] = useState('');
  const [source, setSource] = useState('catalyst');
  const [error, setError] = useState('');
  const createRelease = useCreateRelease();

  const handleSubmit = () => {
    if (!name || !targetDate) return;
    setError('');
    createRelease.mutate({ name, target_date: targetDate, version: version || undefined, source, status: 'todo' }, {
      onSuccess: () => { toast.success('Release created'); onClose(); },
      onError: (err: any) => { setError(err.message || 'Failed to create release'); toast.error('Failed to create release'); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[16px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>New Release</h2>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-md bg-[#FEF2F2] text-[#DC2626] text-[12px] font-medium">{error}</div>}
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 2026 Release v2.0"
              className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Target Date *</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Version</label>
            <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. v2.0"
              className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Source</label>
            <div className="flex items-center gap-2">
              {['catalyst', 'jira'].map(s => (
                <button key={s} onClick={() => setSource(s)}
                  className={`h-9 px-4 rounded-md text-[13px] font-medium border ${source === s ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-6 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
          <button onClick={handleSubmit} disabled={!name || !targetDate || createRelease.isPending}
            className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50">
            {createRelease.isPending ? 'Creating...' : 'Create Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

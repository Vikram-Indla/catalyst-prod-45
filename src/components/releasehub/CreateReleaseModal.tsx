import React, { useState } from 'react';
import { X, CalendarIcon } from 'lucide-react';
import { RH } from '@/constants/releasehub.design';
import { useCreateRelease } from '@/hooks/useReleaseHub';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props { onClose: () => void }

export function CreateReleaseModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');
  const createRelease = useCreateRelease();

  const handleSubmit = () => {
    if (!name || !targetDate) return;
    setError('');
    createRelease.mutate({ name, target_date: format(targetDate, 'yyyy-MM-dd'), version: version || undefined, source: 'catalyst', status: 'todo' }, {
      onSuccess: () => { toast.success('Release created'); onClose(); },
      onError: (err: any) => { setError(err.message || 'Failed to create release'); toast.error('Failed to create release'); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--bd-default, rgba(255,255,255,0.10))] dark:border-[rgba(255,255,255,0.08)]">
          <h2 className="text-[16px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>New Release</h2>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[rgba(237,237,237,0.40)] hover:bg-[#1A1A1A]"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-md bg-[rgba(248,113,113,0.06)] text-[#DC2626] text-[12px] font-medium">{error}</div>}
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 2026 Release v2.0"
              className="w-full h-9 px-3 rounded-md border border-[var(--bd-default, rgba(255,255,255,0.10))] text-[13px] placeholder:text-[rgba(237,237,237,0.40)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Target Date *</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={`w-full h-9 px-3 rounded-md border border-[var(--bd-default, rgba(255,255,255,0.10))] text-[13px] text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${targetDate ? 'text-[rgba(237,237,237,0.93)]' : 'text-[rgba(237,237,237,0.40)]'}`}>
                  {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Select date...'}
                  <CalendarIcon size={14} className="text-[rgba(237,237,237,0.40)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={targetDate} onSelect={setTargetDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Version</label>
            <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. v2.0"
              className="w-full h-9 px-3 rounded-md border border-[var(--bd-default, rgba(255,255,255,0.10))] text-[13px] placeholder:text-[rgba(237,237,237,0.40)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-[#1A1A1A] border-t border-[var(--bd-default, rgba(255,255,255,0.10))] dark:border-[rgba(255,255,255,0.08)] px-6 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-[var(--bd-default, rgba(255,255,255,0.10))] text-[13px] font-medium text-[#475569] hover:bg-[#F4F7FA]">Cancel</button>
          <button onClick={handleSubmit} disabled={!name || !targetDate || createRelease.isPending}
            className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50">
            {createRelease.isPending ? 'Creating...' : 'Create Release'}
          </button>
        </div>
      </div>
    </div>
  );
}

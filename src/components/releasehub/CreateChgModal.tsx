import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, CalendarIcon } from 'lucide-react';
import { RH, CATEGORIES } from '@/constants/releasehub.design';
import { useCreateChange, useReleases } from '@/hooks/useReleaseHub';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props { onClose: () => void }

export function CreateChgModal({ onClose }: Props) {
  const { data: releases = [] } = useReleases();
  const createChange = useCreateChange();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [deployDate, setDeployDate] = useState<Date | undefined>();
  const [releaseId, setReleaseId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [feRequired, setFeRequired] = useState(false);
  const [feCommit, setFeCommit] = useState('');
  const [beRequired, setBeRequired] = useState(false);
  const [beCommit, setBeCommit] = useState('');
  const [deployProcess, setDeployProcess] = useState('Execute the CICD Pipeline');
  const [dependency, setDependency] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title || !deployDate) return;
    setError('');
    createChange.mutate({
      chg_number: `CHG-${Date.now().toString().slice(-7)}`,
      title,
      category: category || undefined,
      deployment_date: format(deployDate, 'yyyy-MM-dd'),
      status: 'new',
      risk_level: 'low',
      source: 'catalyst',
    }, {
      onSuccess: () => { toast.success('Change created'); onClose(); },
      onError: (err: any) => { setError(err.message || 'Failed to create change'); toast.error('Failed to create change'); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-[#080E1D]/38 backdrop-blur-[1px]" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[16px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>New Change</h2>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9]"><X size={14} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="px-3 py-2 rounded-md bg-[#FEF2F2] text-[#DC2626] text-[12px] font-medium">{error}</div>}
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Category</label>
            <div className="relative">
              <button onClick={() => setCatOpen(!catOpen)} className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] text-left flex items-center justify-between hover:bg-[#F4F7FA]">
                <span className={category ? 'text-[#1E293B]' : 'text-[#94A3B8]'}>{category || 'Select category...'}</span>
                <ChevronDown size={12} className="text-[#94A3B8]" />
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-md shadow-lg border border-[#E2E8F0] z-50 py-1">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => { setCategory(c); setCatOpen(false); }}
                      className="w-full px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] text-[#475569]">{c}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe the change..."
              className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Planned Date *</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={`w-full h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${deployDate ? 'text-[#1E293B]' : 'text-[#94A3B8]'}`}>
                  {deployDate ? format(deployDate, 'MMM d, yyyy') : 'Select date...'}
                  <CalendarIcon size={14} className="text-[#94A3B8]" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={deployDate} onSelect={setDeployDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#475569] mb-1">Linked Release</label>
            <div className="relative">
              <button onClick={() => setRelOpen(!relOpen)} className="w-full h-9 px-3 rounded-md border border-[#E2E8F0] bg-white text-[13px] text-left flex items-center justify-between hover:bg-[#F4F7FA]">
                <span className={releaseId ? 'text-[#1E293B]' : 'text-[#94A3B8]'}>{releases.find((r: any) => r.id === releaseId)?.name || 'Select release...'}</span>
                <ChevronDown size={12} className="text-[#94A3B8]" />
              </button>
              {relOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-md shadow-lg border border-[#E2E8F0] z-50 py-1 max-h-48 overflow-y-auto">
                  <button onClick={() => { setReleaseId(''); setRelOpen(false); }} className="w-full px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] text-[#94A3B8]">None</button>
                  {releases.map((r: any) => (
                    <button key={r.id} onClick={() => { setReleaseId(r.id); setRelOpen(false); }}
                      className="w-full px-3 h-9 text-left text-[13px] font-medium hover:bg-[#F4F7FA] text-[#475569]">{r.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-[12px] font-semibold text-[#64748B] hover:text-[#475569]">
            {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Advanced Options
          </button>
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#475569] cursor-pointer">
                  <input type="checkbox" checked={feRequired} onChange={e => setFeRequired(e.target.checked)} className="rounded" /> Frontend Required
                </label>
                {feRequired && <input type="text" value={feCommit} onChange={e => setFeCommit(e.target.value)} placeholder="Commit hash"
                  className="flex-1 h-8 px-2 rounded border border-[#E2E8F0] text-[12px] font-mono" />}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#475569] cursor-pointer">
                  <input type="checkbox" checked={beRequired} onChange={e => setBeRequired(e.target.checked)} className="rounded" /> Backend Required
                </label>
                {beRequired && <input type="text" value={beCommit} onChange={e => setBeCommit(e.target.value)} placeholder="Commit hash"
                  className="flex-1 h-8 px-2 rounded border border-[#E2E8F0] text-[12px] font-mono" />}
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1">Deployment Process</label>
                <input type="text" value={deployProcess} onChange={e => setDeployProcess(e.target.value)}
                  className="w-full h-8 px-2 rounded border border-[#E2E8F0] text-[12px]" />
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] px-6 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-[#E2E8F0] text-[13px] font-medium text-[#475569] hover:bg-[#F4F7FA]">Cancel</button>
          <button onClick={handleSubmit} disabled={!title || !deployDate || createChange.isPending}
            className="h-9 px-4 rounded-md bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50">
            {createChange.isPending ? 'Creating...' : 'Create Change'}
          </button>
        </div>
      </div>
    </div>
  );
}

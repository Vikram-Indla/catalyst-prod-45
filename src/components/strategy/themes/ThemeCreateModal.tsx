/**
 * ThemeCreateModal — Create/Edit form with Radix Select dropdowns
 */
import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { THEME_COLORS, BSC_FILTER_OPTIONS, PRIORITY_CONFIG } from './theme-utils';
import { useThemeGroups, useCreateThemeGroup } from '@/hooks/use-strategic-themes';
import type { StrategicTheme, BscPerspective } from '@/types/strategic-themes';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StrategicTheme>) => void;
  initialData?: Partial<StrategicTheme>;
}

const inputCls = "w-full text-[13px] py-2 px-2.5 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-md text-slate-900 dark:text-[#F5F3F0] bg-white dark:bg-[#232019] outline-none";
const labelCls = "block text-[11px] font-semibold text-slate-700 dark:text-[#A09890] mb-1";

export function ThemeCreateModal({ open, onClose, onSubmit, initialData }: Props) {
  const { data: themeGroups = [] } = useThemeGroups();
  const createGroup = useCreateThemeGroup();

  const [form, setForm] = useState({
    title: '', vision_statement: '', description: '',
    color: '#2563EB', status: 'active' as 'active' | 'draft' | 'archived',
    priority: 'medium' as string,
    start_date: '', target_completion: '',
    fiscal_year: 2026, bsc_perspective: '' as string,
    planned_budget: '' as string, owner_id: '', theme_group_id: '' as string,
    success_metrics: [] as { name: string; target: string }[],
  });

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (open && initialData) {
      setForm(f => ({
        ...f,
        title: initialData.title || '',
        vision_statement: initialData.vision_statement || '',
        description: initialData.description || '',
        color: initialData.color || '#2563EB',
        status: initialData.status || 'active',
        priority: initialData.priority || 'medium',
        start_date: initialData.start_date || '',
        target_completion: initialData.target_completion || '',
        fiscal_year: initialData.fiscal_year || 2026,
        bsc_perspective: initialData.bsc_perspective || '',
        planned_budget: initialData.planned_budget ? String(initialData.planned_budget) : '',
        theme_group_id: initialData.theme_group_id || '',
        success_metrics: Array.isArray(initialData.success_metrics)
          ? initialData.success_metrics.map((m: any) => ({ name: m.name || '', target: m.target || '' }))
          : [],
      }));
    } else if (open) {
      setForm({
        title: '', vision_statement: '', description: '',
        color: '#2563EB', status: 'active', priority: 'medium',
        start_date: '', target_completion: '',
        fiscal_year: 2026, bsc_perspective: '',
        planned_budget: '', owner_id: '', theme_group_id: '',
        success_metrics: [],
      });
    }
    setShowNewGroup(false);
    setNewGroupName('');
  }, [open, initialData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = (statusOverride?: string) => {
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title,
      vision_statement: form.vision_statement || null,
      description: form.description || null,
      color: form.color,
      status: (statusOverride || form.status) as any,
      priority: form.priority as StrategicTheme['priority'],
      start_date: form.start_date || null,
      target_completion: form.target_completion || null,
      fiscal_year: form.fiscal_year,
      bsc_perspective: (form.bsc_perspective || null) as BscPerspective | null,
      planned_budget: form.planned_budget ? parseFloat(form.planned_budget) : 0,
      theme_group_id: form.theme_group_id || null,
      success_metrics: form.success_metrics.filter(m => m.name),
    });
    onClose();
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroup.mutate({ name: newGroupName } as any, {
      onSuccess: (data: any) => {
        setForm(f => ({ ...f, theme_group_id: data.id }));
        setShowNewGroup(false);
        setNewGroupName('');
      },
    });
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15, 23, 42, 0.3)' }} />

      <div
        className="bg-white dark:bg-[#2C2823] rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 70, width: 640, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          animation: 'modalIn 200ms ease',
        }}
      >
        {/* Header — sticky */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#2C2823] rounded-t-xl z-[1]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-[#F5F3F0]">
            {initialData ? 'Edit Strategic Theme' : 'Create Strategic Theme'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.06)] border-none bg-transparent cursor-pointer">
            <X size={18} className="text-slate-500 dark:text-[#6B6560]" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          <div className="space-y-4">
            {/* Theme Name */}
            <div>
              <label className={labelCls}>Theme Name <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Digital Transformation" />
            </div>


            {/* Description */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={`${inputCls} min-h-[60px] resize-y`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Color */}
            <div>
              <label className={labelCls}>Theme Color <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {THEME_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className="rounded-full w-7 h-7 cursor-pointer transition-[border] duration-150" style={{
                    background: c, border: form.color === c ? '3px solid var(--cp-text-primary, #0F172A)' : '2px solid transparent',
                  }} />
                ))}
              </div>
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Status <span className="text-red-500">*</span></label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>Priority <span className="text-red-500">*</span></label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" className={inputCls} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Target Completion</label>
                <input type="date" className={inputCls} value={form.target_completion} onChange={e => setForm(f => ({ ...f, target_completion: e.target.value }))} />
              </div>
            </div>

            {/* Owner + Fiscal Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Owner <span className="text-red-500">*</span></label>
                <Select value={form.owner_id || '_none'} onValueChange={v => setForm(f => ({ ...f, owner_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select owner..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="_none">Select owner...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>Fiscal Year <span className="text-red-500">*</span></label>
                <Select value={String(form.fiscal_year)} onValueChange={v => setForm(f => ({ ...f, fiscal_year: parseInt(v) }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>FY{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BSC + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>BSC Perspective</label>
                <Select value={form.bsc_perspective || '_none'} onValueChange={v => setForm(f => ({ ...f, bsc_perspective: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="_none">Select...</SelectItem>
                    {BSC_FILTER_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={labelCls}>Planned Budget (SAR)</label>
                <input type="number" className={inputCls} value={form.planned_budget} onChange={e => setForm(f => ({ ...f, planned_budget: e.target.value }))} placeholder="e.g. 25,000,000" />
              </div>
            </div>

            {/* Theme Group */}
            <div>
              <label className={labelCls}>Theme Group</label>
              {!showNewGroup ? (
                <Select value={form.theme_group_id || '_none'} onValueChange={v => {
                  if (v === '__new__') { setShowNewGroup(true); return; }
                  setForm(f => ({ ...f, theme_group_id: v === '_none' ? '' : v }));
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="_none">None</SelectItem>
                    {themeGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    <SelectItem value="__new__">+ Create New Group</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                  <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className={`text-[11px] font-semibold px-2.5 rounded border-none text-white cursor-pointer ${newGroupName.trim() ? 'bg-[#2563EB]' : 'bg-slate-400 dark:bg-[#6B6560] cursor-default'}`}>Create</button>
                  <button onClick={() => { setShowNewGroup(false); setNewGroupName(''); }} className="text-[11px] px-2.5 rounded border border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#232019] text-slate-700 dark:text-[#A09890] cursor-pointer">Cancel</button>
                </div>
              )}
            </div>

            {/* Success Metrics */}
            <div>
              <label className={labelCls}>Success Metrics</label>
              {form.success_metrics.map((m, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                  <input className={inputCls} value={m.name} placeholder="Metric name" onChange={e => {
                    const next = [...form.success_metrics]; next[i] = { ...next[i], name: e.target.value }; setForm(f => ({ ...f, success_metrics: next }));
                  }} />
                  <input className={inputCls} value={m.target} placeholder="Target value" onChange={e => {
                    const next = [...form.success_metrics]; next[i] = { ...next[i], target: e.target.value }; setForm(f => ({ ...f, success_metrics: next }));
                  }} />
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, success_metrics: [...f.success_metrics, { name: '', target: '' }] }))}
                className="flex items-center gap-1 text-xs text-[#2563EB] dark:text-[#60A5FA] bg-transparent border-none cursor-pointer font-medium mt-1"
              >
                <Plus size={13} /> Add Another Metric
              </button>
            </div>
          </div>
        </div>

        {/* Footer — sticky */}
        <div className="flex items-center justify-end gap-2 shrink-0 px-6 py-3.5 border-t border-slate-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#2C2823] rounded-b-xl">
          <button onClick={onClose} className="text-xs font-medium h-[34px] px-3.5 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-md bg-white dark:bg-[#232019] text-slate-700 dark:text-[#A09890] cursor-pointer">Cancel</button>
          {!initialData && (
            <button onClick={() => handleSubmit('draft')} className="text-xs font-medium h-[34px] px-3.5 border border-slate-200 dark:border-[rgba(255,255,255,0.08)] rounded-md bg-white dark:bg-[#232019] text-slate-700 dark:text-[#A09890] cursor-pointer">Save as Draft</button>
          )}
          <button onClick={() => handleSubmit()} disabled={!form.title.trim()} className={`text-xs font-semibold h-[34px] px-4 border-none rounded-md text-white ${form.title.trim() ? 'bg-[#2563EB] cursor-pointer' : 'bg-slate-400 dark:bg-[#6B6560] cursor-default'}`}>{initialData ? 'Update Theme' : 'Create Theme'}</button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

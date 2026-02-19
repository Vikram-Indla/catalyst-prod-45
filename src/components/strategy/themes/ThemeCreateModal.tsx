/**
 * ThemeCreateModal — Create/Edit form with theme groups from DB
 * Fixed: proper scroll, owner field, theme group, budget placeholder
 */
import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { THEME_COLORS, BSC_CONFIG, PRIORITY_CONFIG, BSC_FILTER_OPTIONS } from './theme-utils';
import { useThemeGroups, useCreateThemeGroup } from '@/hooks/use-strategic-themes';
import type { StrategicTheme, BscPerspective } from '@/types/strategic-themes';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<StrategicTheme>) => void;
  initialData?: Partial<StrategicTheme>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '1px solid #E2E8F0', borderRadius: 6,
  color: '#0F172A', outline: 'none', background: '#FFFFFF',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#334155',
  display: 'block', marginBottom: 4,
};

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

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70, width: 640, maxHeight: '85vh',
        background: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn 200ms ease',
      }}>
        {/* Header — sticky */}
        <div className="flex items-center justify-between shrink-0" style={{
          padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF', borderRadius: '12px 12px 0 0', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>
            {initialData ? 'Edit Strategic Theme' : 'Create Strategic Theme'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          <div className="space-y-4">
            {/* Theme Name */}
            <div>
              <label style={labelStyle}>Theme Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Digital Transformation" />
            </div>

            {/* Vision */}
            <div>
              <label style={labelStyle}>Vision Statement</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.vision_statement} onChange={e => setForm(f => ({ ...f, vision_statement: e.target.value.slice(0, 500) }))} placeholder="Max 500 characters" />
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{form.vision_statement.length}/500</p>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Color */}
            <div>
              <label style={labelStyle}>Theme Color <span style={{ color: '#EF4444' }}>*</span></label>
              <div className="flex gap-2">
                {THEME_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className="rounded-full" style={{
                    width: 28, height: 28, background: c, border: form.color === c ? '3px solid #0F172A' : '2px solid transparent',
                    cursor: 'pointer', transition: 'border 150ms',
                  }} />
                ))}
              </div>
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Status <span style={{ color: '#EF4444' }}>*</span></label>
                <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority <span style={{ color: '#EF4444' }}>*</span></label>
                <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" style={inputStyle} value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Target Completion</label>
                <input type="date" style={inputStyle} value={form.target_completion} onChange={e => setForm(f => ({ ...f, target_completion: e.target.value }))} />
              </div>
            </div>

            {/* Owner + Fiscal Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Owner <span style={{ color: '#EF4444' }}>*</span></label>
                <select style={inputStyle} value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}>
                  <option value="">Select owner...</option>
                  {/* Populated from profiles when available */}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fiscal Year <span style={{ color: '#EF4444' }}>*</span></label>
                <select style={inputStyle} value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: parseInt(e.target.value) }))}>
                  {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>FY{y}</option>)}
                </select>
              </div>
            </div>

            {/* BSC + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>BSC Perspective</label>
                <select style={inputStyle} value={form.bsc_perspective} onChange={e => setForm(f => ({ ...f, bsc_perspective: e.target.value }))}>
                  <option value="">Select...</option>
                  {BSC_FILTER_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Planned Budget (SAR)</label>
                <input type="number" style={inputStyle} value={form.planned_budget} onChange={e => setForm(f => ({ ...f, planned_budget: e.target.value }))} placeholder="e.g. 25,000,000" />
              </div>
            </div>

            {/* Theme Group */}
            <div>
              <label style={labelStyle}>Theme Group</label>
              {!showNewGroup ? (
                <select style={inputStyle} value={form.theme_group_id} onChange={e => {
                  if (e.target.value === '__new__') { setShowNewGroup(true); return; }
                  setForm(f => ({ ...f, theme_group_id: e.target.value }));
                }}>
                  <option value="">None</option>
                  {themeGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  <option value="__new__">+ Create New Group</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                  <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} style={{ fontSize: 11, fontWeight: 600, padding: '0 10px', borderRadius: 4, border: 'none', background: newGroupName.trim() ? '#2563EB' : '#94A3B8', color: '#FFF', cursor: newGroupName.trim() ? 'pointer' : 'default' }}>Create</button>
                  <button onClick={() => { setShowNewGroup(false); setNewGroupName(''); }} style={{ fontSize: 11, padding: '0 10px', borderRadius: 4, border: '1px solid #E2E8F0', background: '#FFF', color: '#334155', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>

            {/* Success Metrics */}
            <div>
              <label style={labelStyle}>Success Metrics</label>
              {form.success_metrics.map((m, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                  <input style={inputStyle} value={m.name} placeholder="Metric name" onChange={e => {
                    const next = [...form.success_metrics]; next[i] = { ...next[i], name: e.target.value }; setForm(f => ({ ...f, success_metrics: next }));
                  }} />
                  <input style={inputStyle} value={m.target} placeholder="Target value" onChange={e => {
                    const next = [...form.success_metrics]; next[i] = { ...next[i], target: e.target.value }; setForm(f => ({ ...f, success_metrics: next }));
                  }} />
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, success_metrics: [...f.success_metrics, { name: '', target: '' }] }))}
                className="flex items-center gap-1"
                style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginTop: 4 }}
              >
                <Plus size={13} /> Add Another Metric
              </button>
            </div>
          </div>
        </div>

        {/* Footer — sticky */}
        <div className="flex items-center justify-end gap-2 shrink-0" style={{
          padding: '14px 24px', borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF', borderRadius: '0 0 12px 12px',
        }}>
          <button onClick={onClose} style={{ fontSize: 12, fontWeight: 500, height: 34, padding: '0 14px', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF', color: '#334155', cursor: 'pointer' }}>Cancel</button>
          {!initialData && (
            <button onClick={() => handleSubmit('draft')} style={{ fontSize: 12, fontWeight: 500, height: 34, padding: '0 14px', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF', color: '#334155', cursor: 'pointer' }}>Save as Draft</button>
          )}
          <button onClick={() => handleSubmit()} disabled={!form.title.trim()} style={{
            fontSize: 12, fontWeight: 600, height: 34, padding: '0 16px',
            border: 'none', borderRadius: 6,
            background: form.title.trim() ? '#2563EB' : '#94A3B8',
            color: '#FFFFFF', cursor: form.title.trim() ? 'pointer' : 'default',
          }}>{initialData ? 'Update Theme' : 'Create Theme'}</button>
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

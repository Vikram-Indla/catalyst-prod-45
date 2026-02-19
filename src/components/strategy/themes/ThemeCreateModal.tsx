/**
 * ThemeCreateModal — Create/Edit form for strategic themes
 */
import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { THEME_COLORS, BSC_CONFIG, PRIORITY_CONFIG } from './theme-utils';
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
  const [form, setForm] = useState({
    title: '', vision_statement: '', description: '',
    color: '#2563EB', status: 'active' as 'active' | 'draft' | 'archived',
    priority: 'medium' as string,
    start_date: '', target_completion: '',
    fiscal_year: 2026, bsc_perspective: '' as string,
    planned_budget: 0, owner_id: '',
    success_metrics: [] as { name: string; target: string }[],
  });

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
        planned_budget: initialData.planned_budget || 0,
      }));
    } else if (open) {
      setForm({
        title: '', vision_statement: '', description: '',
        color: '#2563EB', status: 'active', priority: 'medium',
        start_date: '', target_completion: '',
        fiscal_year: 2026, bsc_perspective: '',
        planned_budget: 0, owner_id: '',
        success_metrics: [],
      });
    }
  }, [open, initialData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title,
      vision_statement: form.vision_statement || null,
      description: form.description || null,
      color: form.color,
      status: form.status,
      priority: form.priority as StrategicTheme['priority'],
      start_date: form.start_date || null,
      target_completion: form.target_completion || null,
      fiscal_year: form.fiscal_year,
      bsc_perspective: (form.bsc_perspective || null) as BscPerspective | null,
      planned_budget: form.planned_budget,
      success_metrics: form.success_metrics.filter(m => m.name),
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15, 23, 42, 0.3)',
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 70, width: 640, maxHeight: '85vh',
        background: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn 200ms ease',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{
          padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
          position: 'sticky', top: 0, background: '#FFFFFF',
          borderRadius: '12px 12px 0 0', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>
            {initialData ? 'Edit Strategic Theme' : 'Create Strategic Theme'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={18} color="#64748B" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label style={labelStyle}>Theme Name *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Digital Transformation" />
            </div>

            {/* Vision */}
            <div>
              <label style={labelStyle}>Vision Statement</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={form.vision_statement}
                onChange={e => setForm(f => ({ ...f, vision_statement: e.target.value.slice(0, 500) }))}
                placeholder="Max 500 characters"
              />
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{form.vision_statement.length}/500</p>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Color */}
            <div>
              <label style={labelStyle}>Theme Color *</label>
              <div className="flex gap-2">
                {THEME_COLORS.map(c => (
                  <button
                    key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="rounded-full"
                    style={{
                      width: 28, height: 28, background: c, border: form.color === c ? '3px solid #0F172A' : '2px solid transparent',
                      cursor: 'pointer', transition: 'border 150ms',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Status *</label>
                <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priority *</label>
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

            {/* FY + BSC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Fiscal Year *</label>
                <select style={inputStyle} value={form.fiscal_year} onChange={e => setForm(f => ({ ...f, fiscal_year: parseInt(e.target.value) }))}>
                  {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>FY{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>BSC Perspective</label>
                <select style={inputStyle} value={form.bsc_perspective} onChange={e => setForm(f => ({ ...f, bsc_perspective: e.target.value }))}>
                  <option value="">Select...</option>
                  {Object.entries(BSC_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label style={labelStyle}>Planned Budget (SAR)</label>
              <input type="number" style={inputStyle} value={form.planned_budget} onChange={e => setForm(f => ({ ...f, planned_budget: parseFloat(e.target.value) || 0 }))} />
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 shrink-0" style={{
          padding: '14px 24px', borderTop: '1px solid #E2E8F0',
          position: 'sticky', bottom: 0, background: '#FFFFFF',
          borderRadius: '0 0 12px 12px',
        }}>
          <button onClick={onClose} style={{
            fontSize: 12, fontWeight: 500, height: 34, padding: '0 14px',
            border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF',
            color: '#334155', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => { setForm(f => ({ ...f, status: 'draft' })); handleSubmit(); }} style={{
            fontSize: 12, fontWeight: 500, height: 34, padding: '0 14px',
            border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF',
            color: '#334155', cursor: 'pointer',
          }}>Save as Draft</button>
          <button onClick={handleSubmit} disabled={!form.title.trim()} style={{
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

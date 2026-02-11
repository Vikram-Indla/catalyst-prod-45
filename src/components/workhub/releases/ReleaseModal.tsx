/**
 * ReleaseModal — Create / Edit release form
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Release, ReleaseStatus } from '@/types/workhub.types';
import { useCreateRelease, useUpdateRelease } from '@/hooks/workhub/useReleases';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  release?: Release;
}

const STATUS_OPTIONS: ReleaseStatus[] = ['Planned', 'Active', 'At Risk', 'Completed', 'Cancelled'];
const COLOR_PRESETS = [
  '#2563eb', '#0d9488', '#7c3aed', '#16a34a',
  '#d97706', '#ef4444', '#475569', '#0891b2',
];

export function ReleaseModal({ isOpen, onClose, release }: ReleaseModalProps) {
  const isEdit = !!release;
  const createMut = useCreateRelease();
  const updateMut = useUpdateRelease();

  const [form, setForm] = useState({
    name: '', title: '', description: '',
    status: 'Planned' as ReleaseStatus,
    color: '#2563eb',
    start_date: '', target_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (release) {
        setForm({
          name: release.name ?? '',
          title: release.title ?? '',
          description: release.description ?? '',
          status: release.status ?? 'Planned',
          color: release.color ?? '#2563eb',
          start_date: release.start_date ?? '',
          target_date: release.target_date ?? '',
        });
      } else {
        setForm({ name: '', title: '', description: '', status: 'Planned', color: '#2563eb', start_date: '', target_date: '' });
      }
      setErrors({});
    }
  }, [isOpen, release]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Version name is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.target_date) e.target_date = 'Target date is required';
    if (form.start_date && form.target_date && form.start_date >= form.target_date) {
      e.start_date = 'Start date must be before target date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      color: form.color,
      start_date: form.start_date || null,
      target_date: form.target_date,
    };

    if (isEdit && release) {
      updateMut.mutate({ id: release.id, updates: payload }, { onSuccess: onClose });
    } else {
      createMut.mutate(payload, { onSuccess: onClose });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSubmitting = createMut.isPending || updateMut.isPending;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 'var(--wh-z-modal, 1000)' as any,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'relative', background: 'var(--wh-surface, #fff)',
        borderRadius: 'var(--wh-radius-xl, 12px)', boxShadow: 'var(--wh-shadow-xl)',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        animation: 'wh-modal-in 200ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 0', marginBottom: 20,
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 700, margin: 0,
            fontFamily: 'var(--wh-font-display, Sora, sans-serif)',
            color: 'var(--wh-text-primary, #0f172a)',
          }}>
            {isEdit ? 'Edit Release' : 'Create Release'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--wh-text-tertiary, #94a3b8)',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Version Name" required error={errors.name}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., v2.7.0" style={inputStyle} />
          </Field>

          <Field label="Title" required error={errors.title}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Performance Optimization" style={inputStyle} />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Optional description" style={{ ...inputStyle, height: 'auto', resize: 'vertical' }} />
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ReleaseStatus }))}
              style={inputStyle}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Color">
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: form.color === c ? '2px solid #0f172a' : '2px solid transparent',
                    background: c, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 150ms',
                  }}>
                  {form.color === c && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Date" error={errors.start_date}>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                style={inputStyle} />
            </Field>
            <Field label="Target Date" required error={errors.target_date}>
              <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                style={inputStyle} />
            </Field>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, borderTop: '1px solid var(--wh-border-light, #f1f5f9)', paddingTop: 16 }}>
            <button onClick={onClose} style={{
              height: 36, padding: '0 16px', borderRadius: 'var(--wh-radius-md, 6px)',
              border: '1px solid var(--wh-border, #e2e8f0)', background: 'var(--wh-surface, #fff)',
              fontSize: 13, fontWeight: 500, color: 'var(--wh-text-primary, #0f172a)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} style={{
              height: 36, padding: '0 16px', borderRadius: 'var(--wh-radius-md, 6px)',
              border: 'none', background: 'var(--wh-primary, #2563eb)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Release'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 500,
        color: 'var(--wh-text-primary, #0f172a)', marginBottom: 4,
      }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#ef4444', marginTop: 2, display: 'block' }}>{error}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 'var(--wh-radius-md, 6px)',
  border: '1px solid var(--wh-border, #e2e8f0)',
  fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif',
  color: 'var(--wh-text-primary, #0f172a)',
  background: 'var(--wh-surface, #fff)',
  outline: 'none',
};

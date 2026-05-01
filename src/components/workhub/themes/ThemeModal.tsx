/**
 * ThemeModal — Create / Edit theme form
 */
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCreateTheme, useUpdateTheme } from '@/hooks/workhub/useThemes';
import type { Theme } from '@/types/workhub.types';
import toast from 'react-hot-toast';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: Theme;
}

const COLOR_PRESETS = ['var(--ds-text-brand, var(--ds-text-brand, #2563eb))', '#0d9488', '#7c3aed', 'var(--ds-text-success, var(--ds-text-success, #16a34a))', 'var(--ds-text-warning, var(--ds-text-warning, #d97706))', 'var(--ds-text-danger, var(--ds-text-danger, #ef4444))', 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))', '#0891b2'];
const STATUS_OPTIONS = ['Active', 'Completed', 'On Hold'] as const;

export function ThemeModal({ isOpen, onClose, theme }: ThemeModalProps) {
  const isEdit = !!theme;
  const createMut = useCreateTheme();
  const updateMut = useUpdateTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('Active');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(theme?.name ?? '');
      setDescription(theme?.description ?? '');
      setStatus(theme?.status ?? 'Active');
      setColor(theme?.color ?? COLOR_PRESETS[0]);
      setStartDate(theme?.start_date ?? '');
      setEndDate(theme?.end_date ?? '');
      setError('');
    }
  }, [isOpen, theme]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Theme name is required'); return; }
    if (startDate && endDate && startDate >= endDate) { setError('Start date must be before end date'); return; }

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      color,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    try {
      if (isEdit && theme) {
        await updateMut.mutateAsync({ id: theme.id, updates: payload });
        toast.success('Theme updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Theme created');
      }
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 9998, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'var(--cp-float)', borderRadius: 12, width: 480, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', zIndex: 9999,
        fontFamily: 'var(--cp-font-body)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--divider)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--fg-1)' }}>
            {isEdit ? 'Edit Theme' : 'New Theme'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="var(--fg-3)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
              Theme Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Digital Maturity"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--cp-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--divider)'}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this theme..."
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                resize: 'vertical', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--cp-blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--divider)'}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                background: 'var(--cp-float)', boxSizing: 'border-box',
              }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 6 }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', border: 'none',
                    background: c, cursor: 'pointer',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transition: 'outline 100ms',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--divider)', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 12, color: 'var(--sem-danger)', margin: 0 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: '1px solid var(--divider)',
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--divider)',
            background: 'var(--cp-float)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: 'var(--fg-3)',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--cp-blue)', color: 'var(--bg-app)',
              fontSize: 13, fontWeight: 600, cursor: isPending ? 'wait' : 'pointer',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Theme'}
          </button>
        </div>
      </div>
    </>
  );
}

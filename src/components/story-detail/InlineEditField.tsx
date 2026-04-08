import React, { useState, useCallback, useRef, ReactNode } from 'react';
import { Edit2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   InlineEditField — Catalyst V12
   Click-to-edit wrapper for sidebar fields
   ═══════════════════════════════════════════════════════════ */

interface InlineEditFieldProps<T = any> {
  value: T;
  renderDisplay: (value: T) => ReactNode;
  renderEdit: (
    value: T,
    onChange: (newValue: T) => void,
    onSave: () => void,
    onCancel: () => void
  ) => ReactNode;
  onSave: (newValue: T) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const TRANSITION = '200ms cubic-bezier(0.4, 0, 0.2, 1)';

export function InlineEditField<T = any>({
  value,
  renderDisplay,
  renderEdit,
  onSave,
  label,
  className,
  disabled = false,
}: InlineEditFieldProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<T>(value);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);

  const enterEdit = useCallback(() => {
    if (disabled || lockRef.current) return;
    lockRef.current = true;
    setEditValue(value);
    setIsEditing(true);
    setTimeout(() => { lockRef.current = false; }, 100);
  }, [value, disabled]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    onSave(editValue);
  }, [editValue, onSave]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
  }, [value]);

  const handleChange = useCallback((newValue: T) => {
    setEditValue(newValue);
  }, []);

  // ── Styles ──

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.45,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--cp-text-secondary, #475569)',
    marginBottom: 4,
    userSelect: 'none',
  };

  const displayStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: hovered && !isEditing
      ? 'var(--cp-interact-hover, rgba(15, 23, 42, 0.04))'
      : 'transparent',
    border: '2px solid transparent',
    borderRadius: 'var(--cp-radius-sm, 4px)',
    cursor: 'pointer',
    transition: `background-color ${TRANSITION}`,
    position: 'relative',
    minHeight: 32,
    outline: 'none',
  };

  const contentStyle: React.CSSProperties = {
    fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    color: 'var(--cp-text-primary, #0F172A)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 16,
    height: 16,
    color: 'var(--cp-text-muted, #94A3B8)',
    opacity: hovered && !isEditing ? 1 : 0,
    visibility: hovered && !isEditing ? 'visible' : 'hidden',
    transition: `opacity ${TRANSITION}, visibility ${TRANSITION}`,
    flexShrink: 0,
    pointerEvents: 'none',
  };

  const editStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    border: '2px solid var(--cp-border-interactive, var(--cp-primary-60, #2563EB))',
    borderRadius: 'var(--cp-radius-sm, 4px)',
    background: 'var(--cp-input-bg, #FFFFFF)',
    transition: `border-color ${TRANSITION}, box-shadow ${TRANSITION}`,
    minHeight: 32,
    width: '100%',
  };

  return (
    <div ref={containerRef} style={rootStyle} className={className}>
      {label && <span style={labelStyle}>{label}</span>}

      {isEditing ? (
        <div style={editStyle}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            {renderEdit(editValue, handleChange, handleSave, handleCancel)}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={label ? `Edit ${label}` : 'Edit field'}
          style={displayStyle}
          onClick={enterEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              enterEdit();
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div style={contentStyle}>{renderDisplay(value)}</div>
          <Edit2 size={16} style={iconStyle} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Demo
// ═══════════════════════════════════════════════════════════

const inputReset: React.CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontFamily: "var(--cp-font-body, 'Inter', sans-serif)",
  fontSize: 14,
};

export function InlineEditFieldDemo() {
  const [sp, setSp] = useState<number | null>(5);
  const [date, setDate] = useState<string | null>('2026-04-15');
  const [desc, setDesc] = useState<string | null>(null);
  const [assignee, setAssignee] = useState('Ahmed Al-Rashid');

  return (
    <div style={{ padding: 48, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "var(--cp-font-body, 'Inter', sans-serif)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        InlineEditField Demo
      </div>

      {/* Story Points */}
      <InlineEditField<number | null>
        value={sp}
        label="Story Points"
        renderDisplay={(v) => <span>{v ?? '—'}</span>}
        renderEdit={(v, onChange, onSave, onCancel) => (
          <input
            type="number"
            value={v ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            onBlur={onSave}
            autoFocus
            min={0}
            max={21}
            style={inputReset}
          />
        )}
        onSave={(v) => { setSp(v); console.log('Story Points saved:', v); }}
      />

      {/* Assignee */}
      <InlineEditField<string>
        value={assignee}
        label="Assignee"
        renderDisplay={(v) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cp-chart-1, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {v.charAt(0)}
            </div>
            <span>{v || '—'}</span>
          </div>
        )}
        renderEdit={(v, onChange, onSave, onCancel) => (
          <input
            type="text"
            value={v}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            onBlur={onSave}
            autoFocus
            placeholder="Enter name…"
            style={inputReset}
          />
        )}
        onSave={(v) => { setAssignee(v); console.log('Assignee changed:', v); }}
      />

      {/* Due Date */}
      <InlineEditField<string | null>
        value={date}
        label="Due Date"
        renderDisplay={(v) => (
          <span>{v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
        )}
        renderEdit={(v, onChange, onSave, onCancel) => (
          <input
            type="date"
            value={v ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            onBlur={onSave}
            autoFocus
            style={{ ...inputReset, cursor: 'pointer' }}
          />
        )}
        onSave={(v) => { setDate(v); console.log('Due date changed:', v); }}
      />

      {/* Description (empty) */}
      <InlineEditField<string | null>
        value={desc}
        label="Description"
        renderDisplay={(v) => (
          <span style={{ color: v ? 'var(--cp-text-primary, #0F172A)' : 'var(--cp-text-muted, #94A3B8)', fontStyle: v ? 'normal' : 'italic' }}>
            {v || 'Add description'}
          </span>
        )}
        renderEdit={(v, onChange, onSave, onCancel) => (
          <textarea
            value={v ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) onSave(); if (e.key === 'Escape') onCancel(); }}
            onBlur={onSave}
            autoFocus
            placeholder="Add description…"
            style={{ ...inputReset, resize: 'none', minHeight: 60 }}
          />
        )}
        onSave={(v) => { setDesc(v); console.log('Description changed:', v); }}
      />
    </div>
  );
}

export default InlineEditField;

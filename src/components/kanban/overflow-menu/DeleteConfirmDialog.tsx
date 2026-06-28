/**
 * DeleteConfirmDialog — Destructive confirmation requiring key input
 */
import { useState, useEffect, useRef } from 'react';
import { Trash2 } from '@/lib/atlaskit-icons';
import type { KanbanThemeTokens } from '../kanban-tokens';

interface Props {
  issueKey: string;
  tk: KanbanThemeTokens;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ issueKey, tk, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const canDelete = typed === issueKey;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'var(--ds-shadow-raised, rgba(0,0,0,0.4))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete work item"
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, background: tk.surfaceBg, borderRadius: 8,
          border: `1px solid ${tk.border}`, boxShadow: '0 8px 32px var(--ds-shadow-raised, rgba(0,0,0,0.3))',
          padding: 24, fontFamily: 'var(--cp-font-body)',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--ds-background-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 size={18} color="var(--ds-icon-danger)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: tk.textPrimary }}>Delete work item?</div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: tk.textMuted, marginTop: 0 }}>
              This action is irreversible. All data for <strong>{issueKey}</strong> will be permanently removed.
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 'var(--ds-font-size-200)', color: tk.textSecondary, display: 'block', marginBottom: 4 }}>
            Type <strong>{issueKey}</strong> to confirm
          </label>
          <input
            ref={inputRef}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={issueKey}
            style={{
              width: '100%', padding: '4px 10px', fontSize: 'var(--ds-font-size-300)', borderRadius: 4,
              border: `1px solid ${tk.inputBorder}`, background: tk.inputBg,
              color: tk.textPrimary, outline: 'none', fontFamily: 'var(--cp-font-mono)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--ds-border-danger)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = tk.inputBorder; }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} style={{
            padding: '4px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 6,
            border: `1px solid ${tk.border}`, background: 'transparent',
            color: tk.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={canDelete ? onConfirm : undefined}
            disabled={!canDelete}
            style={{
              padding: '4px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, borderRadius: 6,
              border: 'none', background: canDelete ? '#D32F2F' : 'var(--ds-border)',
              color: canDelete ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : 'var(--ds-text-disabled)', cursor: canDelete ? 'pointer' : 'not-allowed',
              opacity: canDelete ? 1 : 0.6,
            }}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

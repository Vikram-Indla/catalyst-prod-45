/**
 * ArchiveConfirmDialog — Confirmation before archiving a work item
 */
import { useEffect, useRef } from 'react';
import { Archive } from 'lucide-react';
import type { KanbanThemeTokens } from '../kanban-tokens';

interface Props {
  issueKey: string;
  tk: KanbanThemeTokens;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveConfirmDialog({ issueKey, tk, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10001,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Archive work item"
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, background: tk.surfaceBg, borderRadius: 8,
          border: `1px solid ${tk.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          padding: 24, fontFamily: 'var(--cp-font-body)',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Archive size={18} color="#E65100" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: tk.textPrimary }}>Archive work item?</div>
            <div style={{ fontSize: 12, color: tk.textMuted, marginTop: 2 }}>
              {issueKey} will be removed from active boards and can be restored later.
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
            border: `1px solid ${tk.border}`, background: 'transparent',
            color: tk.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
            border: 'none', background: '#E65100', color: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer',
          }}>Archive</button>
        </div>
      </div>
    </div>
  );
}

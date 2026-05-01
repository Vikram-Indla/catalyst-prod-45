import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface StatusOption {
  id: string;
  name: string;
  color: string;
}

interface DeleteStatusModalProps {
  open: boolean;
  statusName: string;
  itemCount: number;
  otherStatuses: StatusOption[];
  onClose: () => void;
  onConfirm: (targetStatusId?: string) => void;
  loading?: boolean;
}

export function DeleteStatusModal({ open, statusName, itemCount, otherStatuses, onClose, onConfirm, loading }: DeleteStatusModalProps) {
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    if (open && otherStatuses.length > 0) setTargetId(otherStatuses[0].id);
  }, [open, otherStatuses]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const hasMigration = itemCount > 0;

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 40, padding: '8px 12px', fontSize: 13,
    color: 'var(--fg-1)', border: '1px solid var(--divider)',
    borderRadius: 6, outline: 'none', fontFamily: 'var(--cp-font-body)',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]" style={{ width: 440, borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)', fontFamily: 'var(--cp-font-body)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} color="var(--sem-danger)" strokeWidth={2} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>Delete Status</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-md hover:bg-[var(--cp-bd-zone)] transition-colors" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={16} color="var(--fg-3)" />
          </button>
        </div>

        {hasMigration ? (
          <>
            <div
              className="rounded-lg mb-4 bg-[var(--sem-warning-bg)]"
              style={{ borderLeft: '4px solid var(--sem-warning)', padding: '12px 16px' }}
            >
              <p style={{ fontSize: 13, color: 'var(--sem-warning-fg)' }}>
                <strong>{itemCount} items</strong> are in this status. Move them to another status before deleting.
              </p>
            </div>

            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>Move items to:</label>
              <select value={targetId} onChange={e => setTargetId(e.target.value)} className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]" style={{ ...inputStyle, cursor: 'pointer' }}>
                {otherStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 16 }}>
            Delete <strong>"{statusName}"</strong>? This cannot be undone.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]" style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => onConfirm(hasMigration ? targetId : undefined)}
            disabled={loading || (hasMigration && !targetId)}
            className="hover:opacity-90 transition-opacity disabled:opacity-50 bg-[var(--sem-danger)]"
            style={{ height: 50, padding: '0 16px', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)', border: 'none', borderRadius: 6, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Deleting...' : hasMigration ? 'Move & Delete' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

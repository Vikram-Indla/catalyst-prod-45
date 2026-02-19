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
    width: '100%', height: 40, padding: '0 12px', fontSize: 13,
    color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
    borderRadius: 6, outline: 'none', fontFamily: "'Inter', sans-serif",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: 440, background: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)', fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} color="#DC2626" strokeWidth={2} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Delete Status</h3>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={16} color="#64748B" />
          </button>
        </div>

        {hasMigration ? (
          <>
            <div
              className="rounded-lg mb-4"
              style={{ borderLeft: '4px solid #D97706', background: '#FFFBEB', padding: '12px 16px' }}
            >
              <p style={{ fontSize: 13, color: '#92400E' }}>
                <strong>{itemCount} items</strong> are in this status. Move them to another status before deleting.
              </p>
            </div>

            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>Move items to:</label>
              <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {otherStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 16 }}>
            Delete <strong>"{statusName}"</strong>? This cannot be undone.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FFFFFF', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={() => onConfirm(hasMigration ? targetId : undefined)}
            disabled={loading || (hasMigration && !targetId)}
            className="hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: '#DC2626', border: 'none', borderRadius: 6, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Deleting...' : hasMigration ? 'Move & Delete' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

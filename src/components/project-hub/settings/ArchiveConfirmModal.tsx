import { X, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface ArchiveConfirmModalProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ArchiveConfirmModal({ open, projectName, onClose, onConfirm, loading }: ArchiveConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]"
        style={{
          width: 440, borderRadius: 12, padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} color="var(--sem-danger)" strokeWidth={2} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', fontFamily: "'Sora', sans-serif" }}>
              Archive Project
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md hover:bg-[#1A1A1A] transition-colors"
            style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} color="var(--fg-3)" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
          Are you sure you want to archive <strong>{projectName}</strong>? This will hide it from the project list but it can be restored later.
        </p>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-[var(--cp-float)] dark:bg-[#1A1A1A]"
            style={{
              height: 50, padding: '0 16px', fontSize: 13, fontWeight: 500,
              color: 'var(--fg-2)', border: '1px solid var(--divider)', borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="hover:opacity-90 transition-opacity disabled:opacity-50 bg-[var(--sem-danger)]"
            style={{
              height: 50, padding: '0 16px', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', border: 'none', borderRadius: 6,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

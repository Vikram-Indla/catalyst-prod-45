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
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 440, background: '#FFFFFF', borderRadius: 12, padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,.1)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} color="#DC2626" strokeWidth={2} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
              Archive Project
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
            style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} color="#64748B" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          Are you sure you want to archive <strong>{projectName}</strong>? This will hide it from the project list but it can be restored later.
        </p>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            style={{
              height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500,
              color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6,
              background: '#FFFFFF', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{
              height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
              color: '#FFFFFF', background: '#DC2626', border: 'none', borderRadius: 6,
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

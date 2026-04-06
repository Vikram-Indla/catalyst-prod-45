/**
 * ConfirmDialog — Reusable confirmation modal for destructive actions
 */
import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', variant = 'danger', isLoading,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconBg = variant === 'danger' ? '#fee2e2' : '#fef3c7';
  const iconColor = variant === 'danger' ? 'var(--sem-danger)' : 'var(--sem-warning)';
  const btnBg = variant === 'danger' ? 'var(--sem-danger)' : 'var(--sem-warning)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 'var(--wh-z-modal, 1000)' as any,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />

      {/* Content */}
      <div style={{
        position: 'relative', background: 'var(--cp-float)',
        borderRadius: 'var(--wh-radius-xl, 12px)', boxShadow: 'var(--wh-shadow-xl)',
        width: '100%', maxWidth: 420, padding: 24,
        animation: 'wh-modal-in 200ms ease-out',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: 'var(--fg-4)',
        }}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color={iconColor} />
          </div>
          <div>
            <h3 style={{
              fontSize: 18, fontWeight: 600, color: 'var(--fg-1)',
              fontFamily: 'var(--wh-font-display, Sora)', margin: 0,
            }}>
              {title}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 8, lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            height: 50, padding: '0 16px', borderRadius: 'var(--wh-radius-md, 6px)',
            border: '1px solid var(--divider)', background: 'var(--cp-float)',
            fontSize: 13, fontWeight: 500, color: 'var(--fg-1)',
            cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} style={{
            height: 50, padding: '0 16px', borderRadius: 'var(--wh-radius-md, 6px)',
            border: 'none', background: btnBg, color: 'var(--bg-app)',
            fontSize: 13, fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}>
            {isLoading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

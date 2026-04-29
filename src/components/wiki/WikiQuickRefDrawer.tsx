import React from 'react';
import { X, FileText, Eye } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  open: boolean;
  onClose: () => void;
  qr: any | null;
}

export function WikiQuickRefDrawer({ open, onClose, qr }: Props) {
  const { isDark } = useTheme();

  if (!open || !qr) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.3)', zIndex: 60 }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '90vw',
        background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-float)', zIndex: 61, boxShadow: isDark ? '-4px 0 24px rgba(0,0,0,0.3)' : '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 200ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 36, height: 50, borderRadius: 6, background: isDark ? 'rgba(37,99,235,0.12)' : 'var(--cp-blue-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} style={{ color: 'var(--cp-blue)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 14, fontWeight: 700, margin: 0, color: isDark ? '#EDEDED' : 'var(--fg-1)' }}>{qr.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10 }}>
              <span style={{ fontFamily: 'var(--cp-font-mono)', color: 'var(--cp-blue)', fontWeight: 500 }}>{qr.domain_code}</span>
              <span style={{ fontFamily: 'var(--cp-font-mono)', color: isDark ? '#878787' : 'var(--fg-3)' }}>{qr.steps} steps</span>
              <span style={{ fontFamily: 'var(--cp-font-mono)', color: isDark ? '#878787' : 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Eye size={10} /> {qr.view_count ?? qr.views ?? 0}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
            <X size={16} style={{ color: isDark ? '#878787' : 'var(--fg-3)' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {qr.description ? (
            <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : 'var(--fg-2)', lineHeight: 1.6, marginBottom: 24 }}>{qr.description}</p>
          ) : (
            <p style={{ fontSize: 12, color: isDark ? '#878787' : 'var(--fg-4)', fontStyle: 'italic', marginBottom: 24 }}>No detailed description available yet.</p>
          )}

          <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 12, fontWeight: 600, color: isDark ? '#EDEDED' : 'var(--fg-1)', marginBottom: 16 }}>Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: qr.steps ?? 0 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: isDark ? 'rgba(37,99,235,0.12)' : 'var(--cp-blue-wash)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--cp-font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cp-blue)',
                }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: isDark ? '#A1A1A1' : 'var(--fg-2)', lineHeight: 1.5, paddingTop: 3 }}>
                  Step {i + 1} — Complete this action to proceed.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

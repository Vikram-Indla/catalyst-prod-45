import React from 'react';
import { X, FileText, Eye } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  qr: any | null;
}

export function WikiQuickRefDrawer({ open, onClose, qr }: Props) {
  if (!open || !qr) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 60 }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '90vw',
        background: '#FFFFFF', zIndex: 61, boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 200ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '0.75px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: '#0F172A' }}>{qr.title}</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#2563EB', fontWeight: 500 }}>{qr.domain_code}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>{qr.steps} steps</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Eye size={10} /> {qr.view_count ?? qr.views ?? 0}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
            <X size={16} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {qr.description ? (
            <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, marginBottom: 24 }}>{qr.description}</p>
          ) : (
            <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginBottom: 24 }}>No detailed description available yet.</p>
          )}

          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: qr.steps ?? 0 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#2563EB',
                }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, paddingTop: 3 }}>
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

/**
 * ConfirmDialog — Confirm/cancel modal overlay
 */
import React from 'react';
import { V } from './tokens';

export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(9,30,66,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{
        width: 400, maxWidth: 'calc(100vw - 48px)', background: V.white,
        borderRadius: 8, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
        animation: 'sdm-confirm-in 150ms ease-out both',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: V.textPrimary, fontFamily: 'Sora, sans-serif' }}>{title}</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: V.textSecondary, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px' }}>
          <button onClick={onCancel} style={{
            padding: '6px 16px', fontSize: 13, border: `0.75px solid ${V.border}`,
            borderRadius: 6, background: V.white, color: V.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 600,
            border: 'none', borderRadius: 6, cursor: 'pointer',
            background: danger ? V.dangerRed : V.primaryBlue, color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

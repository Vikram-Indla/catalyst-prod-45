/**
 * ConfirmDialog — Ring-fenced confirm dialog for StoryDetailModal
 * Replaces banned window.confirm() per design guardrails
 */
import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = true, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9, 30, 66, 0.4)',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw',
        animation: 'sdm-confirm-in 200ms ease-out',
      }}>
        <h3 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ds-text, var(--ds-text, #172B4D))', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', borderRadius: 4, background: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', border: '1px solid #DFE1E6',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))')}
          >{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '7px 16px', borderRadius: 4,
            background: destructive ? '#DE350B' : 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
            color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #FFF)))', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
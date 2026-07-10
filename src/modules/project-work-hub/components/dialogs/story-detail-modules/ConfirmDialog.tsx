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
      background: 'var(--ds-shadow-raised)',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--ds-surface)', borderRadius: 8, padding: 24, width: 400, maxWidth: '95vw',
        animation: 'sdm-confirm-in 200ms ease-out',
      }}>
        <h3 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', lineHeight: 1.6, marginBottom: 16 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: 4, background: 'var(--ds-surface)', border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral))',
            fontSize: 'var(--ds-font-size-300)', fontWeight: 500, cursor: 'pointer', color: 'var(--ds-text-subtle)',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface)')}
          >{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '8px 16px', borderRadius: 4,
            background: destructive ? 'var(--ds-background-danger-bold)' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
            color: 'var(--ds-surface)', border: 'none', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, cursor: 'pointer',
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
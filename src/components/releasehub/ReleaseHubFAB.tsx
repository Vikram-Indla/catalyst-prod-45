import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Package, RefreshCw, Upload } from 'lucide-react';

interface Props {
  onNewRelease: () => void;
  onNewChange: () => void;
  onImportSN?: () => void;
}

export function ReleaseHubFAB({ onNewRelease, onNewChange, onImportSN }: Props) {
  const [open, setOpen] = useState(false);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, handleEsc]);

  const items = [
    { icon: <Package size={14} style={{ color: 'var(--cp-primary-60)' }} />, label: 'New Release', action: onNewRelease, shortcut: 'R' },
    { icon: <RefreshCw size={14} style={{ color: 'var(--cp-primary-60)' }} />, label: 'New Change', action: onNewChange, shortcut: 'C' },
    { icon: <Upload size={14} style={{ color: 'var(--cp-primary-60)' }} />, label: 'Import SN CHG', action: onImportSN || (() => {}), shortcut: null as string | null },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {items.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => { opt.action(); setOpen(false); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: '0 16px',
                backgroundColor: 'var(--cp-bg-elevated)',
                border: '1px solid var(--cp-border-default)',
                borderRadius: 'var(--cp-radius-default)',
                boxShadow: 'var(--cp-shadow-overlay)',
                fontSize: 13,
                fontFamily: 'var(--cp-font-body)',
                fontWeight: 600,
                color: 'var(--cp-text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                animation: `rh-fab-in 0.15s ease ${i * 50}ms both`,
              }}
            >
              {opt.icon}
              {opt.label}
              {opt.shortcut && (
                <kbd style={{
                  fontSize: 9,
                  fontFamily: 'var(--cp-font-mono)',
                  color: 'var(--cp-text-muted)',
                  background: 'var(--cp-bg-sunken)',
                  padding: '1px 5px',
                  borderRadius: 'var(--cp-radius-sm)',
                }}>
                  {opt.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(f => !f)}
        aria-label={open ? 'Close actions' : 'Open actions'}
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--cp-radius-full, 50%)',
          backgroundColor: 'var(--cp-primary-60)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(37,99,235,0.40)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          color: 'white',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cp-primary-70)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--cp-primary-60)')}
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

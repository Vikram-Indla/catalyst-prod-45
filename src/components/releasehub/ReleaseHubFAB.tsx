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
    { icon: <Package size={14} className="text-[#2563EB]" />, label: 'New Release', action: onNewRelease, shortcut: 'R' },
    { icon: <RefreshCw size={14} className="text-[#2563EB]" />, label: 'New Change', action: onNewChange, shortcut: 'C' },
    { icon: <Upload size={14} className="text-[#2563EB]" />, label: 'Import SN CHG', action: onImportSN || (() => {}), shortcut: null as string | null },
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
                whiteSpace: 'nowrap',
                animation: `fadeSlideIn 0.15s ease ${i * 50}ms both`,
              }}
            >
              {opt.icon}
              {opt.label}
              {opt.shortcut && (
                <kbd style={{ fontSize: 9, fontFamily: 'monospace', color: '#94A3B8', background: '#F1F5F9', padding: '1px 5px', borderRadius: 3 }}>
                  {opt.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#2563EB',
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
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

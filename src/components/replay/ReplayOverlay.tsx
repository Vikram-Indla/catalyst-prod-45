import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CatalystReplay } from './CatalystReplay';

interface ReplayOverlayProps {
  rootKey: string;
  onClose: () => void;
}

export function ReplayOverlay({ rootKey, onClose }: ReplayOverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Replay — ${rootKey}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'var(--ds-surface, #FFFFFF)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          Replay — {rootKey}
        </span>
        <button
          onClick={onClose}
          aria-label="Close Replay"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            color: 'var(--ds-text-subtle, #42526E)',
            padding: '4px 8px',
            borderRadius: 4,
          }}
        >
          ×
        </button>
      </div>

      {/* Replay canvas */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <CatalystReplay rootKey={rootKey} embedded />
      </div>
    </div>,
    document.body,
  );
}

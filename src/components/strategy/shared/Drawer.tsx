/**
 * Drawer — Right-side slide-in panel for Strategy Room
 * Accessible modal with focus trap, ESC to close, overlay click to close
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, width = 480, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus trap: focus the panel on open
      setTimeout(() => panelRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 399,
          animation: 'drawerOverlayIn 200ms ease',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width,
          maxWidth: '90vw',
          height: '100vh',
          background: 'var(--catalyst-bg-surface-0, #FFFFFF)',
          borderLeft: '1px solid var(--catalyst-border-default, var(--bd-default, rgba(255,255,255,0.10)))',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawerSlideIn 300ms ease',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--catalyst-border-default, var(--bd-default, rgba(255,255,255,0.10)))',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--catalyst-text-primary, rgba(237,237,237,0.93))' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              width: 32,
              height: 32,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--catalyst-text-tertiary, rgba(237,237,237,0.40))',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--catalyst-bg-hover, #1A1A1A)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes drawerOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

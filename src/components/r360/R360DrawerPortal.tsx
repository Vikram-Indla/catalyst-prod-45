import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface R360DrawerPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function R360DrawerPortal({ isOpen, onClose, children }: R360DrawerPortalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.25)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '700px',
          zIndex: 9999,
          background: '#FFFFFF',
          borderLeft: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column' as const,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

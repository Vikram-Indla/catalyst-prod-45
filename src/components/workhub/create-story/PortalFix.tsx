/**
 * PortalFix — drop-in replacements for @atlaskit/modal-dialog components.
 *
 * @atlaskit/modal-dialog uses @atlaskit/portal which creates an empty
 * container div in this Vite build (portal renders nothing inside it).
 * These replacements render the same shell directly in the React tree
 * using position:fixed, matching the Atlaskit visual exactly.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { token } from '@atlaskit/tokens';

// ── ModalTransition ──────────────────────────────────────────────────────────
export function ModalTransition({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

// ── Fullscreen context — shared between ModalDialog and the header buttons ───
export const FullscreenContext = createContext<{
  fullscreen: boolean;
  toggleFullscreen: () => void;
}>({ fullscreen: false, toggleFullscreen: () => {} });

export function useFullscreen() {
  return useContext(FullscreenContext);
}

// ── ModalDialog ──────────────────────────────────────────────────────────────
interface ModalDialogProps {
  children: ReactNode;
  onClose?: () => void;
  width?: 'small' | 'medium' | 'large' | 'x-large' | string;
  shouldScrollInViewport?: boolean;
  autoFocus?: boolean;
}

const WIDTH_MAP: Record<string, number> = {
  small: 400,
  medium: 560,
  large: 640,   // Jira Create modal is ~640px
  'x-large': 800,
};

export function ModalDialog({ children, onClose, width = 'medium' }: ModalDialogProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const maxW = typeof width === 'number' ? width : (WIDTH_MAP[width] ?? 640);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <FullscreenContext.Provider value={{ fullscreen, toggleFullscreen: () => setFullscreen(f => !f) }}>
      {/* Overlay */}
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: 'rgba(9,30,66,0.54)',  // scrim always visible — confirmed (b)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: fullscreen ? '5vh 5vw' : '32px 16px',
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {/* Dialog — normal: 640px; fullscreen: 90vw×90vh centred, scrim stays visible */}
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'relative',
            background: token('elevation.surface.overlay', '#FFFFFF'),
            borderRadius: 8,
            boxShadow: '0 8px 16px -4px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
            width: fullscreen ? '90vw' : '100%',
            maxWidth: fullscreen ? '90vw' : maxW,
            height: fullscreen ? '90vh' : 'auto',
            maxHeight: fullscreen ? '90vh' : 'min(90vh, 800px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 200ms ease, height 200ms ease, max-width 200ms ease',
          }}
        >
          {children}
        </div>
      </div>
    </FullscreenContext.Provider>
  );
}

// ── ModalHeader ──────────────────────────────────────────────────────────────
export function ModalHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
      {children}
    </div>
  );
}

// ── ModalTitle ───────────────────────────────────────────────────────────────
export function ModalTitle({ children }: { children: ReactNode }) {
  return (
    <h1 style={{
      fontFamily: 'Sora, sans-serif',
      fontSize: 20,
      fontWeight: 600,
      color: token('color.text', '#172B4D'),
      margin: 0,
      lineHeight: '28px',
    }}>
      {children}
    </h1>
  );
}

// ── ModalBody ────────────────────────────────────────────────────────────────
export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
      {children}
    </div>
  );
}

// ── ModalFooter ──────────────────────────────────────────────────────────────
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '16px 24px',
      borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

/**
 * LaterRowMenu — three-dots row menu.
 * In progress: Archive · Remove from Later
 * Completed:   Move to in progress · Remove from Later
 * Archived:    Move to in progress · Remove from Later
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type Tab = 'in_progress' | 'archived' | 'completed';

interface LaterRowMenuProps {
  anchorRect: DOMRect;
  tab: Tab;
  onArchive: () => void;
  onMoveToInProgress: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function LaterRowMenu({ anchorRect, tab, onArchive, onMoveToInProgress, onRemove, onClose }: LaterRowMenuProps) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const W = 220;
  const vw = window.innerWidth;
  let left = anchorRect.right - W;
  if (left < 12) left = 12;
  if (left + W > vw - 12) left = vw - W - 12;
  const top = anchorRect.bottom + 4;

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      aria-label="More"
      style={{
        position: 'fixed',
        top, left, width: W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: '4px 0',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        zIndex: 'var(--cv2-tooltip-z, 1200)' as any,
      }}
    >
      {tab === 'in_progress' ? (
        <Item onClick={() => { onArchive(); onClose(); }}>Archive</Item>
      ) : (
        <Item onClick={() => { onMoveToInProgress(); onClose(); }}>Move to in progress</Item>
      )}
      <Item danger onClick={() => { onRemove(); onClose(); }}>Remove from Later</Item>
    </div>,
    document.body,
  );
}

function Item({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 16px',
        textAlign: 'left',
        background: 'transparent',
        color: danger ? '#E66E76' : 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
      }}
    >
      {children}
    </button>
  );
}

/**
 * SummarizeMenu — small dropdown anchored under the SummarizeIcon trigger in
 * the chat header. Three options: Unreads, Last 7 days, Custom date range.
 * Mirrors Slack AI's compact preset menu (image #206).
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SummarizePreset = 'unreads' | 'last7' | 'custom';

interface SummarizeMenuProps {
  anchorRect: DOMRect;
  onSelect: (preset: SummarizePreset) => void;
  onClose: () => void;
}

export function SummarizeMenu({ anchorRect, onSelect, onClose }: SummarizeMenuProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: anchorRect.bottom + 6,
    left: Math.max(8, anchorRect.right - 220),
  });

  // Click-outside + Esc close.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  // Flip up if it would overflow.
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let top = anchorRect.bottom + 6;
    if (top + rect.height + 8 > window.innerHeight) {
      top = Math.max(8, anchorRect.top - rect.height - 6);
    }
    setPos(p => (p.top === top ? p : { ...p, top }));
  }, [anchorRect.bottom, anchorRect.top]);

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      aria-label="Summarize"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 220,
        background: 'var(--cv2-bg-panel)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 8,
        boxShadow: '0 12px 28px rgba(0,0,0,0.32)',
        padding: '6px 0',
        zIndex: 9999,
        fontFamily: 'var(--cv2-font)',
      }}
    >
      <MenuItem onClick={() => onSelect('unreads')}>Unreads</MenuItem>
      <MenuItem onClick={() => onSelect('last7')}>Last 7 days</MenuItem>
      <MenuItem onClick={() => onSelect('custom')} strong>
        Custom date range
      </MenuItem>
    </div>,
    document.body,
  );
}

function MenuItem({
  onClick,
  strong,
  children,
}: {
  onClick: () => void;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 14px',
        background: 'transparent',
        border: 'none',
        color: strong ? 'var(--cv2-text-strong)' : 'var(--cv2-text)',
        fontSize: 14,
        fontWeight: strong ? 700 : 500,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

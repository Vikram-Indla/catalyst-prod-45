/**
 * LaterFilterMenu — header filter dropdown.
 * Two options: Show upcoming reminders / Hide upcoming reminders.
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon } from '../shared/Icon';

interface LaterFilterMenuProps {
  anchorRect: DOMRect;
  hideUpcoming: boolean;
  onChange: (next: boolean) => void;
  onClose: () => void;
}

export function LaterFilterMenu({ anchorRect, hideUpcoming, onChange, onClose }: LaterFilterMenuProps) {
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

  const W = 260;
  let left = anchorRect.right - W;
  if (left < 12) left = 12;
  const top = anchorRect.bottom + 4;

  const options: Array<{ key: 'show' | 'hide'; label: string; selected: boolean }> = [
    { key: 'show', label: 'Show upcoming reminders', selected: !hideUpcoming },
    { key: 'hide', label: 'Hide upcoming reminders', selected: hideUpcoming },
  ];

  return createPortal(
    <div
      ref={popRef}
      role="menu"
      aria-label="Filter Later"
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
      {options.map(opt => (
        <button
          key={opt.key}
          type="button"
          role="menuitem"
          onClick={() => { onChange(opt.key === 'hide'); onClose(); }}
          onMouseEnter={e => {
            if (!opt.selected) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          }}
          onMouseLeave={e => {
            if (!opt.selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 14px',
            background: opt.selected ? 'var(--cv2-accent)' : 'transparent',
            color: opt.selected ? 'var(--ds-text-inverse)' : 'var(--cv2-text)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'var(--ds-font-size-400)',
            textAlign: 'left',
          }}
        >
          <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
            {opt.selected && <CheckIcon size={14} />}
          </span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

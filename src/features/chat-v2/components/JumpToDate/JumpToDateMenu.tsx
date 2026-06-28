import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface JumpToDateMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onPickMostRecent: () => void;
  onPickBeginning: () => void;
  onPickSpecific: () => void;
  onClose: () => void;
}

const MENU_W = 260;

export function JumpToDateMenu({
  anchorRef,
  onPickMostRecent,
  onPickBeginning,
  onPickSpecific,
  onClose,
}: JumpToDateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchorRef, onClose]);

  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  let top = rect.bottom + 6;
  let left = rect.left + rect.width / 2 - MENU_W / 2;
  if (left + MENU_W > window.innerWidth - 12) left = window.innerWidth - MENU_W - 12;
  if (left < 12) left = 12;
  if (top + 200 > window.innerHeight) top = rect.top - 200;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Jump to"
      style={{
        position: 'fixed',
        top, left, width: MENU_W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: '6px 0',
        fontFamily: 'var(--cv2-font)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      <Header>Jump to…</Header>
      <Item onClick={onPickMostRecent}>Most recent</Item>
      <Item onClick={onPickBeginning}>The very beginning</Item>
      <Divider />
      <Item onClick={onPickSpecific}>Jump to a specific date</Item>
    </div>,
    document.body,
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '6px 14px', fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)' }}>{children}</div>
  );
}

function Item({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '8px 14px',
        background: 'transparent', color: 'var(--cv2-text)',
        border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 'var(--ds-font-size-400)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div aria-hidden="true" style={{ height: 1, margin: '4px 0', background: 'var(--cv2-divider)' }} />;
}

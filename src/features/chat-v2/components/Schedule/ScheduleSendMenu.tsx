import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getQuickSuggestions } from './scheduleHelpers';
import { ScheduleModal } from './ScheduleModal';

interface ScheduleSendMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onPick: (iso: string) => void;
  onClose: () => void;
}

const MENU_W = 280;

export function ScheduleSendMenu({ anchorRef, onPick, onClose }: ScheduleSendMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const suggestions = getQuickSuggestions();

  useEffect(() => {
    if (showCustom) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) onClose();
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
  }, [anchorRef, onClose, showCustom]);

  if (showCustom) {
    return (
      <ScheduleModal
        onCancel={() => { setShowCustom(false); onClose(); }}
        onConfirm={iso => {
          setShowCustom(false);
          onPick(iso);
        }}
      />
    );
  }

  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const vh = window.innerHeight;
  const top = Math.max(12, rect.top - 180);
  const left = Math.max(12, rect.right - MENU_W);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Schedule message"
      style={{
        position: 'fixed',
        top,
        left,
        width: MENU_W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
        padding: '4px 0',
        fontFamily: 'var(--cv2-font)',
      }}
    >
      <Header>Schedule message</Header>
      {suggestions.map(s => (
        <MenuItem key={s.id} onClick={() => onPick(s.iso)} title={s.detail}>
          {s.detail}
        </MenuItem>
      ))}
      <Divider />
      <MenuItem onClick={() => setShowCustom(true)}>Custom time</MenuItem>
    </div>,
    document.body,
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '4px 12px',
        font: 'var(--ds-font-body-small)',
        color: 'var(--cv2-text-muted)',
        textTransform: 'none',
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      title={title}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        font: 'var(--ds-font-body)',
        transition: 'background var(--cv2-transition-fast)',
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

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 1,
        margin: '4px 0',
        background: 'var(--cv2-divider)',
      }}
    />
  );
}

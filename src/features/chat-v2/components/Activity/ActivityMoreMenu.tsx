import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellOffIcon,
  ChevronRightIcon,
  CopyLinkIcon,
  CopyTextIcon,
  MarkUnreadIcon,
  PencilEditIcon,
  RemindClockIcon,
} from '../shared/Icon';
import { RemindMeSubmenu } from './RemindMeSubmenu';

interface ActivityMoreMenuProps {
  anchorRect: DOMRect | null;
  canEdit: boolean;
  onEdit: () => void;
  onMarkUnread: () => void;
  onRemindMe: (whenIso: string) => void;
  onRemindMeCustom: () => void;
  onTurnOffReplies: () => void;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  onClose: () => void;
}

const MENU_W = 320;

export function ActivityMoreMenu({
  anchorRect,
  canEdit,
  onEdit,
  onMarkUnread,
  onRemindMe,
  onRemindMeCustom,
  onTurnOffReplies,
  onCopyLink,
  onCopyMessage,
  onClose,
}: ActivityMoreMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const remindRef = useRef<HTMLButtonElement>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (menuRef.current?.contains(t)) return;
      if (t.closest('[data-cv2-submenu-of="activity-more"]')) return;
      onClose();
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
  }, [onClose]);

  if (!anchorRect) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Measured menu height with all standard items (no canEdit) ≈ 212px; with
  // Edit row ≈ 252px. Using a tight estimate keeps the menu close to the row
  // when it has to flip upward (bottom items in the list), instead of leaving
  // a big gap that made it look detached from the source row.
  const estimated = canEdit ? 260 : 220;
  let top = anchorRect.bottom + 4;
  if (top + estimated > vh - 12) top = Math.max(12, anchorRect.top - estimated - 4);
  // Open the menu to the RIGHT of the trigger so the trigger row content
  // isn't covered (Slack-style anchor). Clamp to viewport so the menu never
  // overflows the right edge.
  let left = anchorRect.right + 4;
  if (left + MENU_W > vw - 12) left = vw - MENU_W - 12;
  if (left < 12) left = 12;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Activity actions"
      style={{
        position: 'fixed',
        top, left, width: MENU_W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: '4px 0',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      {canEdit && (
        <>
          <Item
            icon={<PencilEditIcon size={16} />}
            label="Edit message"
            shortcut="E"
            onClick={() => { onEdit(); onClose(); }}
          />
          <Divider />
        </>
      )}
      <Item
        icon={<MarkUnreadIcon size={16} />}
        label="Mark unread"
        shortcut="U"
        onClick={() => { onMarkUnread(); onClose(); }}
      />
      <Item
        ref={remindRef}
        icon={<RemindClockIcon size={16} />}
        label="Remind me about this"
        trailingArrow
        active={remindOpen}
        onClick={() => setRemindOpen(v => !v)}
        onMouseEnter={() => setRemindOpen(true)}
      />
      <Item
        icon={<BellOffIcon size={16} />}
        label="Turn off notifications for replies"
        onClick={() => { onTurnOffReplies(); onClose(); }}
      />
      <Divider />
      <Item
        icon={<CopyLinkIcon size={16} />}
        label="Copy link"
        shortcut="L"
        onClick={() => { onCopyLink(); onClose(); }}
      />
      <Item
        icon={<CopyTextIcon size={16} />}
        label="Copy message"
        shortcut="⌘C"
        onClick={() => { onCopyMessage(); onClose(); }}
      />
      {remindOpen && (
        <RemindMeSubmenu
          anchorRect={remindRef.current?.getBoundingClientRect() ?? null}
          onPick={iso => { onRemindMe(iso); setRemindOpen(false); onClose(); }}
          onCustom={() => { setRemindOpen(false); onRemindMeCustom(); onClose(); }}
          onClose={() => setRemindOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}

const Item = React.forwardRef<HTMLButtonElement, {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  trailingArrow?: boolean;
  active?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}>(function Item({ icon, label, shortcut, trailingArrow, active, onClick, onMouseEnter }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
        onMouseEnter?.();
      }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        height: 34,
        padding: '0 14px',
        background: active ? 'var(--cv2-accent)' : 'transparent',
        color: active ? 'var(--ds-text-inverse)' : 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
        transition: 'background var(--cv2-transition-fast)',
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, color: 'inherit' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: active ? 'var(--ds-surface, rgba(255,255,255,0.8))' : 'var(--cv2-text-muted)' }}>
          {shortcut}
        </span>
      )}
      {trailingArrow && (
        <ChevronRightIcon size={14} style={{ color: active ? 'var(--ds-surface)' : 'var(--cv2-text-subtle)' }} />
      )}
    </button>
  );
});

function Divider() {
  return (
    <div aria-hidden="true" style={{ height: 1, margin: '4px 0', background: 'var(--cv2-divider)' }} />
  );
}

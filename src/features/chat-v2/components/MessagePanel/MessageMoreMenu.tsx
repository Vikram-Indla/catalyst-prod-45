import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRightIcon,
  CopyLinkIcon,
  CopyTextIcon,
  MarkUnreadIcon,
  OrganizeIcon,
  PencilEditIcon,
  PinIcon,
  RemindClockIcon,
  TrashIcon,
} from '../shared/Icon';

interface MessageMoreMenuProps {
  anchorRect: DOMRect | null;
  canEdit: boolean;
  canDelete: boolean;
  isPinned: boolean;
  onEdit: () => void;
  onMarkUnread: () => void;
  onRemindMe: () => void;
  onCopyLink: () => void;
  onCopyMessage: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const MENU_W = 320;

export function MessageMoreMenu({
  anchorRect,
  canEdit,
  canDelete,
  isPinned,
  onEdit,
  onMarkUnread,
  onRemindMe,
  onCopyLink,
  onCopyMessage,
  onTogglePin,
  onDelete,
  onClose,
}: MessageMoreMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const organizeRef = useRef<HTMLButtonElement>(null);
  const [organizeOpen, setOrganizeOpen] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      // Submenus are portaled OUTSIDE menuRef but still part of this menu.
      // Skip the parent close so the submenu's onClick can fire.
      if (target.closest('[data-cv2-submenu-of="message-more"]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      const root = menuRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
      if (items.length === 0) return;
      e.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === 'Home' ? 0
        : e.key === 'End' ? items.length - 1
        : e.key === 'ArrowDown' ? (current + 1) % items.length
        : (current - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    // Move focus into the menu so arrow keys work immediately.
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Position above-right of the anchor (matches Slack's pattern)
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estimatedHeight = 420;
  let top = anchorRect.bottom + 4;
  if (top + estimatedHeight > vh - 12) top = Math.max(12, anchorRect.top - estimatedHeight - 4);
  let left = anchorRect.right - MENU_W;
  if (left < 12) left = 12;
  if (left + MENU_W > vw - 12) left = vw - MENU_W - 12;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Message actions"
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
        icon={<RemindClockIcon size={16} />}
        label="Remind me"
        onClick={() => { onRemindMe(); onClose(); }}
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
      <Divider />
      <Item
        ref={organizeRef}
        icon={<OrganizeIcon size={16} />}
        label="Organize"
        trailingArrow
        active={organizeOpen}
        ariaHasPopup
        ariaExpanded={organizeOpen}
        onClick={() => setOrganizeOpen(v => !v)}
      />
      {canDelete && (
        <>
          <Divider />
          <Item
            icon={<TrashIcon size={16} />}
            label="Delete message…"
            shortcut="delete"
            danger
            onClick={() => { onDelete(); onClose(); }}
          />
        </>
      )}
      {organizeOpen && (
        <OrganizeSubmenu
          anchorRect={organizeRef.current?.getBoundingClientRect() ?? null}
          isPinned={isPinned}
          onPin={() => { onTogglePin(); setOrganizeOpen(false); onClose(); }}
          onClose={() => setOrganizeOpen(false)}
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
  danger?: boolean;
  ariaHasPopup?: boolean;
  ariaExpanded?: boolean;
  onClick: () => void;
}>(function Item({ icon, label, shortcut, trailingArrow, active, danger, ariaHasPopup, ariaExpanded, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-haspopup={ariaHasPopup ? 'menu' : undefined}
      aria-expanded={ariaHasPopup ? ariaExpanded : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        height: 34,
        padding: '0 14px',
        background: active ? 'var(--cv2-accent)' : 'transparent',
        color: active ? 'var(--ds-text-inverse)' : danger ? 'var(--cv2-danger)' : 'var(--cv2-text)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        font: 'var(--ds-font-body)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = danger
            ? 'var(--ds-background-danger)'
            : 'var(--cv2-bg-row-hover)';
        }
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, color: 'inherit' }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ font: 'var(--ds-font-body-small)', color: active ? 'var(--ds-text-inverse)' : 'var(--cv2-text-muted)' }}>
          {shortcut}
        </span>
      )}
      {trailingArrow && (
        <ChevronRightIcon size={14} style={{ color: active ? 'var(--ds-text-inverse)' : 'var(--cv2-text-subtle)' }} />
      )}
    </button>
  );
});

function Divider() {
  return (
    <div
      aria-hidden="true"
      style={{ height: 1, margin: '4px 0', background: 'var(--cv2-divider)' }}
    />
  );
}

function OrganizeSubmenu({
  anchorRect,
  isPinned,
  onPin,
  onClose,
}: {
  anchorRect: DOMRect | null;
  isPinned: boolean;
  onPin: () => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  if (!anchorRect) return null;
  const top = anchorRect.top;
  const left = Math.max(12, anchorRect.left - 220);
  return createPortal(
    <div
      ref={popRef}
      role="menu"
      data-cv2-submenu-of="message-more"
      style={{
        position: 'fixed',
        top, left, width: 220,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: '4px 0',
        fontFamily: 'var(--cv2-font)',
        zIndex: 'var(--cv2-tooltip-z, 1200)' as any,
      }}
    >
      <Item
        icon={<PinIcon size={16} />}
        label={isPinned ? 'Unpin from conversation' : 'Pin to this conversation'}
        shortcut="P"
        onClick={onPin}
      />
    </div>,
    document.body,
  );
}

/**
 * ColumnHeaderMenu — portal-based per-column 3-dot menu (Jira parity, 2026-06-23).
 *
 * Why portal not @atlaskit/dropdown-menu:
 *   JiraTable wrapper has overflow:hidden + borderRadius. @atlaskit/dropdown-menu
 *   uses Popper.js v2 which collapses to (0,0) inside overflow:hidden ancestors
 *   (see CLAUDE.md 2026-06-13 dropdown-menu lesson). Canonical portal pattern.
 *
 * Menu shape (per Jira screenshots):
 *   Sortable + reorderable + resizable → Sort lo→hi / Sort hi→lo / Move first /
 *     Move left / Move right / Move last / Remove / Resize / Reset width.
 *   Non-sortable, locked (Work) → Sort by columns (sub-options) / Resize.
 *   Last column → omit Move right / Move last.
 *   First column → omit Move first / Move left.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  id: string;
  label: string;
  hasSubmenu?: boolean;
  submenu?: MenuItem[];
  divider?: 'before' | 'after';
  onClick?: () => void;
  /** Non-interactive header label rendered above a group (Jira parity). */
  kind?: 'sectionLabel';
}

interface ColumnHeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: MenuItem[];
}

/**
 * Each submenu owns its OWN open state so arbitrarily deep nesting works.
 * Hovering a sibling at the same level closes the previously-open submenu
 * via the parent's onHover prop; entering a child submenu doesn't disturb
 * its ancestors.
 */
function MenuItemRow({
  item,
  onClose,
  isActive,
  onActivate,
}: {
  item: MenuItem;
  onClose: () => void;
  isActive: boolean;
  onActivate: () => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  if (item.kind === 'sectionLabel') {
    return (
      <div
        role="presentation"
        style={{
          padding: '8px 16px 4px',
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 653,
          color: 'var(--ds-text-subtle)',
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        {item.label}
      </div>
    );
  }
  if (item.hasSubmenu && item.submenu) {
    return (
      <>
        <div
          ref={rowRef}
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={isActive}
          onMouseEnter={onActivate}
          style={menuItemStyle(isActive)}
        >
          <span style={{ flex: 1 }}>{item.label}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 2.5L6.5 5L3.5 7.5" />
          </svg>
        </div>
        {isActive && rowRef.current && (
          <SubmenuPortal
            anchorRect={rowRef.current.getBoundingClientRect()}
            items={item.submenu}
            onClose={onClose}
          />
        )}
      </>
    );
  }
  return (
    <>
      {item.divider === 'before' && <div style={dividerStyle} />}
      <div
        role="menuitem"
        tabIndex={0}
        onClick={() => {
          item.onClick?.();
          onClose();
        }}
        onMouseEnter={onActivate}
        style={menuItemStyle(false)}
      >
        {item.label}
      </div>
      {item.divider === 'after' && <div style={dividerStyle} />}
    </>
  );
}

function SubmenuPortal({
  anchorRect,
  items,
  onClose,
}: {
  anchorRect: DOMRect;
  items: MenuItem[];
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return createPortal(
    <div role="menu" style={submenuStyle(anchorRect)}>
      {items.map((sub) => (
        <MenuItemRow
          key={sub.id}
          item={sub}
          onClose={onClose}
          isActive={openId === sub.id}
          onActivate={() => setOpenId(sub.id)}
        />
      ))}
    </div>,
    document.body,
  );
}

export function ColumnHeaderMenu({ isOpen, onClose, triggerRef, items }: ColumnHeaderMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setOpenId(null);
      return;
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      // Submenus are portaled — check by ancestor role=menu hop
      let el: HTMLElement | null = t instanceof HTMLElement ? t : null;
      while (el) {
        if (el.getAttribute('role') === 'menu') return;
        el = el.parentElement;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (openId) { setOpenId(null); return; }
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, openId, triggerRef]);

  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const menuLeft = Math.max(8, rect.left);
  const menuTop = rect.bottom + 4;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Column actions"
      style={{
        position: 'fixed',
        top: menuTop,
        left: menuLeft,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        padding: '4px 0',
        minWidth: 220,
        zIndex: 9999,
        fontSize: 'var(--ds-font-size-400)',
        color: 'var(--ds-text)',
      }}
    >
      {items.map((item) => (
        <MenuItemRow
          key={item.id}
          item={item}
          onClose={onClose}
          isActive={openId === item.id}
          onActivate={() => setOpenId(item.id)}
        />
      ))}
    </div>,
    document.body,
  );
}

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--ds-border)',
  margin: '4px 0',
};

function menuItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    background: active ? 'var(--ds-background-selected)' : 'transparent',
    color: active ? 'var(--ds-text-selected)' : 'var(--ds-text)',
    fontWeight: active ? 500 : 400,
    userSelect: 'none',
  };
}

function submenuStyle(triggerRect: DOMRect): React.CSSProperties {
  return {
    position: 'fixed',
    top: triggerRect.top,
    left: triggerRect.right + 4,
    background: 'var(--ds-surface-overlay)',
    border: '1px solid var(--ds-border)',
    borderRadius: 6,
    boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
    padding: '4px 0',
    minWidth: 180,
    zIndex: 10000,
    fontSize: 'var(--ds-font-size-400)',
    color: 'var(--ds-text)',
  };
}

export type { MenuItem };

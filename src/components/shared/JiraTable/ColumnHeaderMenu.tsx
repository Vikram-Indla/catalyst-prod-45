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
}

interface ColumnHeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: MenuItem[];
}

export function ColumnHeaderMenu({ isOpen, onClose, triggerRef, items }: ColumnHeaderMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const submenuTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubmenuOpen(null);
      return;
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (submenuOpen) { setSubmenuOpen(null); return; }
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, submenuOpen, triggerRef]);

  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const menuLeft = Math.max(8, rect.left);
  const menuTop = rect.bottom + 4;

  const renderItem = (item: MenuItem, isSubmenu: boolean = false) => {
    if (item.hasSubmenu && item.submenu) {
      const isOpenSub = submenuOpen === item.id;
      return (
        <div
          key={item.id}
          ref={(el) => { if (isOpenSub) submenuTriggerRef.current = el; }}
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={isOpenSub}
          onMouseEnter={() => setSubmenuOpen(item.id)}
          style={menuItemStyle(isOpenSub)}
        >
          <span style={{ flex: 1 }}>{item.label}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 2.5L6.5 5L3.5 7.5" />
          </svg>
          {isOpenSub && submenuTriggerRef.current && (
            createPortal(
              <div
                role="menu"
                style={submenuStyle(submenuTriggerRef.current.getBoundingClientRect())}
              >
                {item.submenu!.map((sub) => renderItem(sub, true))}
              </div>,
              document.body,
            )
          )}
        </div>
      );
    }
    return (
      <React.Fragment key={item.id}>
        {item.divider === 'before' && <div style={dividerStyle} />}
        <div
          role="menuitem"
          tabIndex={0}
          onClick={() => {
            item.onClick?.();
            onClose();
          }}
          onMouseEnter={() => { if (!isSubmenu) setSubmenuOpen(null); }}
          style={menuItemStyle(false)}
        >
          {item.label}
        </div>
        {item.divider === 'after' && <div style={dividerStyle} />}
      </React.Fragment>
    );
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Column actions"
      style={{
        position: 'fixed',
        top: menuTop,
        left: menuLeft,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
        padding: '4px 0',
        minWidth: 220,
        zIndex: 9999,
        fontSize: 14,
        color: 'var(--ds-text, #292A2E)',
      }}
    >
      {items.map((item) => renderItem(item))}
    </div>,
    document.body,
  );
}

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--ds-border, #DFE1E6)',
  margin: '4px 0',
};

function menuItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    background: active ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
    color: active ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #292A2E)',
    fontWeight: active ? 500 : 400,
    userSelect: 'none',
  };
}

function submenuStyle(triggerRect: DOMRect): React.CSSProperties {
  return {
    position: 'fixed',
    top: triggerRect.top,
    left: triggerRect.right + 4,
    background: 'var(--ds-surface-overlay, #FFFFFF)',
    border: '1px solid var(--ds-border, #DFE1E6)',
    borderRadius: 6,
    boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
    padding: '4px 0',
    minWidth: 180,
    zIndex: 10000,
    fontSize: 14,
    color: 'var(--ds-text, #292A2E)',
  };
}

export type { MenuItem };

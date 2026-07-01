/**
 * SubmenuItem — Jira-parity nested submenu row inside a PortalMenu.
 *
 *  • Parent row behaves like the existing ParentItem (label + chevron-right),
 *    but when its submenu is open it renders with the ADS "selected" tokens
 *    (blue background, brand text, brand chevron) — matches the Jira LMS 763
 *    "Move work item" screenshot.
 *  • The submenu itself lives in its OWN portal on document.body so no ancestor
 *    overflow can clip it. It measures its rendered size on first paint and
 *    picks the side (right or left of the parent row) with the larger free
 *    area — the user's "always place in larger area" rule. Vertical position
 *    aligns with the row top and clamps to the viewport.
 *  • Keyboard: ArrowRight opens the submenu, ArrowLeft/Escape closes it,
 *    ArrowUp/Down cycle items inside it, Enter selects. Click-outside closes.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { SIZES } from '../constants';

const VIEWPORT_MARGIN = 8;
const SIDE_GAP = 2;

interface Props {
  label: string;
  ariaLabel?: string;
  /** Called once the submenu closes (fires on any select, outer click, or Escape). */
  onCloseParentMenu?: () => void;
  children: (close: () => void) => React.ReactNode;
  minWidth?: number;
}

export const SubmenuItem: React.FC<Props> = ({ label, ariaLabel, onCloseParentMenu, children, minWidth = 200 }) => {
  const parentRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHoverOpen(false);
    setPos(null);
  }, []);

  const requestClose = useCallback(() => {
    close();
    onCloseParentMenu?.();
  }, [close, onCloseParentMenu]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !parentRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); parentRef.current?.focus(); }
      if (e.key === 'ArrowLeft') { e.stopPropagation(); close(); parentRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);

  const recompute = useCallback(() => {
    const pEl = parentRef.current;
    const mEl = menuRef.current;
    if (!pEl || !mEl) return;
    const parent = pEl.getBoundingClientRect();
    const menu = mEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceRight = vw - parent.right - VIEWPORT_MARGIN;
    const spaceLeft  = parent.left - VIEWPORT_MARGIN;
    // Prefer right; flip left only when it fits there and right can't fit while left has more room.
    const placeRight = menu.width <= spaceRight || spaceRight >= spaceLeft;
    let left = placeRight
      ? parent.right + SIDE_GAP
      : parent.left - menu.width - SIDE_GAP;
    if (left + menu.width > vw - VIEWPORT_MARGIN) left = vw - menu.width - VIEWPORT_MARGIN;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    let top = parent.top;
    if (top + menu.height > vh - VIEWPORT_MARGIN) top = vh - menu.height - VIEWPORT_MARGIN;
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => { if (open) recompute(); }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(() => recompute());
    if (menuRef.current) ro.observe(menuRef.current);
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, recompute]);

  const showAsOpen = open || hoverOpen;

  return (
    <>
      <button
        ref={parentRef}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        onMouseEnter={() => { setHoverOpen(true); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onMouseLeave={() => setHoverOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setOpen(true); }
        }}
        style={{
          width: '100%', height: 36, padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: 'none',
          background: showAsOpen
            ? token('color.background.selected', 'var(--ds-background-selected)')
            : 'transparent',
          color: showAsOpen
            ? token('color.text.selected', 'var(--ds-text-selected)')
            : token('color.text', 'var(--ds-text)'),
          fontSize: 'var(--ds-font-size-400)',
          fontFamily: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{label}</span>
        <ChevronRightIcon
          label=""
          size="small"
          primaryColor={showAsOpen
            ? token('color.icon.selected', 'var(--ds-text-selected)')
            : token('color.icon.subtle', 'var(--ds-icon-subtle)')}
        />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${label} submenu`}
          data-kanban-submenu="true"
          onMouseEnter={() => setOpen(true)}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: SIZES.DROPDOWN_RADIUS,
            boxShadow: token('elevation.shadow.overlay', 'var(--ds-shadow-overlay)'),
            padding: '4px 0',
            minWidth,
            maxHeight: SIZES.DROPDOWN_MAX_HEIGHT,
            overflowY: 'auto',
            zIndex: SIZES.Z_DROPDOWN + 1,
          }}
        >
          {children(requestClose)}
        </div>,
        document.body,
      )}
    </>
  );
};

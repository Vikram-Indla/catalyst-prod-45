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
 *  • Only one submenu is open at a time — instances coordinate via a
 *    module-level EventTarget. Opening one broadcasts a close signal to all
 *    others, so hovering row A then row B never leaves both open.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { SIZES } from '../constants';

const VIEWPORT_MARGIN = 8;
const SIDE_GAP = 2;
const HOVER_CLOSE_DELAY = 180;

/* Module-level coordination bus. Every SubmenuItem instance listens for the
   'open' event; on receipt it closes itself unless the event's `id` matches its
   own. This gives us global "only one open at a time" without threading state
   or context through the caller. */
const submenuBus: EventTarget | null =
  typeof window !== 'undefined' ? new EventTarget() : null;
const SUBMENU_OPEN_EVT = 'kanban-submenu-open';

let submenuIdSeq = 0;

export const SubmenuItem: React.FC<{
  label: string;
  ariaLabel?: string;
  /** Called once the submenu closes (fires on any select, outer click, or Escape). */
  onCloseParentMenu?: () => void;
  children: (close: () => void) => React.ReactNode;
  minWidth?: number;
}> = ({ label, ariaLabel, onCloseParentMenu, children, minWidth = 200 }) => {
  const parentRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Stable per-instance id used by the coordination bus.
  const idRef = useRef<string>('');
  if (!idRef.current) {
    submenuIdSeq += 1;
    idRef.current = `kb-submenu-${submenuIdSeq}`;
  }

  // Delayed-close timer so a brief hover across the gap between the parent
  // row and the submenu portal doesn't dismiss the submenu.
  const closeTimer = useRef<number | null>(null);
  const cancelPendingClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelPendingClose();
    setOpen(false);
    // Keep pos around — it lets the next open reuse it as a fallback while
    // useLayoutEffect re-measures. Clearing it forced a visibility:hidden
    // flash on every re-open.
  }, [cancelPendingClose]);

  const scheduleClose = useCallback(() => {
    cancelPendingClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY);
  }, [cancelPendingClose]);

  const requestOpen = useCallback(() => {
    cancelPendingClose();
    // Tell every other SubmenuItem to close before we open. Without this,
    // hovering a sibling parent row leaves the previous submenu on screen
    // until its own mouseLeave timer fires.
    submenuBus?.dispatchEvent(
      new CustomEvent(SUBMENU_OPEN_EVT, { detail: { id: idRef.current } }),
    );
    // Seed position synchronously from the parent row + estimated width so
    // the very first paint shows the submenu in the correct spot. Without
    // this seed the first render uses pos=null → visibility:hidden until
    // useLayoutEffect measures actual dimensions (visible 1-frame lag when
    // the user tabs between sibling submenus).
    const pEl = parentRef.current;
    if (pEl) {
      const parent = pEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Horizontal side by larger room.
      const spaceRight = vw - parent.right - VIEWPORT_MARGIN;
      const spaceLeft  = parent.left - VIEWPORT_MARGIN;
      const placeRight = minWidth <= spaceRight || spaceRight >= spaceLeft;
      let left = placeRight
        ? parent.right + SIDE_GAP
        : parent.left - minWidth - SIDE_GAP;
      if (left + minWidth > vw - VIEWPORT_MARGIN) left = vw - minWidth - VIEWPORT_MARGIN;
      if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
      // Vertical seed — anchor to the parent's top edge. Real height isn't
      // known yet, so useLayoutEffect will shift up later if the actual
      // menu doesn't fit below. Never float away from the parent trigger.
      let top = parent.top;
      if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
      if (top > vh - VIEWPORT_MARGIN) top = vh - VIEWPORT_MARGIN;
      setPos({ top, left });
    }
    setOpen(true);
  }, [cancelPendingClose, minWidth]);

  const requestClose = useCallback(() => {
    close();
    onCloseParentMenu?.();
  }, [close, onCloseParentMenu]);

  // Listen for other SubmenuItems opening → close ourselves.
  useEffect(() => {
    if (!submenuBus) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== idRef.current) close();
    };
    submenuBus.addEventListener(SUBMENU_OPEN_EVT, handler);
    return () => submenuBus.removeEventListener(SUBMENU_OPEN_EVT, handler);
  }, [close]);

  useEffect(() => () => cancelPendingClose(), [cancelPendingClose]);

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

    // HORIZONTAL — pick the side (left / right of parent row) with more room.
    const spaceRight = vw - parent.right - VIEWPORT_MARGIN;
    const spaceLeft  = parent.left - VIEWPORT_MARGIN;
    const placeRight = menu.width <= spaceRight || spaceRight >= spaceLeft;
    let left = placeRight
      ? parent.right + SIDE_GAP
      : parent.left - menu.width - SIDE_GAP;
    if (left + menu.width > vw - VIEWPORT_MARGIN) left = vw - menu.width - VIEWPORT_MARGIN;
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    // VERTICAL — always anchor near the parent trigger. Start with the top
    // edge aligned to the parent row; if the submenu would overflow the
    // bottom edge of the viewport, slide it UP just enough to fit (so its
    // bottom edge sits at `vh - margin`). Never float away from the parent.
    let top = parent.top;
    if (top + menu.height > vh - VIEWPORT_MARGIN) {
      top = Math.max(VIEWPORT_MARGIN, vh - menu.height - VIEWPORT_MARGIN);
    }
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

  return (
    <>
      <button
        ref={parentRef}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        onMouseEnter={requestOpen}
        onFocus={requestOpen}
        onMouseLeave={scheduleClose}
        onClick={() => (open ? close() : requestOpen())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); requestOpen(); }
        }}
        style={{
          width: '100%', height: 36, padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: 'none',
          background: open
            ? token('color.background.selected', 'var(--ds-background-selected)')
            : 'transparent',
          color: open
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
          primaryColor={open
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
          onMouseEnter={cancelPendingClose}
          onMouseLeave={scheduleClose}
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

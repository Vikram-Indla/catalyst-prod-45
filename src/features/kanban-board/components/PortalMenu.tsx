/**
 * PortalMenu — anchored dropdown via createPortal + getBoundingClientRect.
 *
 * @atlaskit/dropdown-menu (and any popper-based atlaskit popup) renders at
 * viewport (0,0) when nested inside overflow:hidden ancestors — the project-hub
 * shell has several. This is the documented canonical workaround (CLAUDE.md
 * 2026-06-13): skip popper, position from the trigger's own bounding rect.
 * Menu items are ADS-token styled.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckIcon from '@atlaskit/icon/glyph/check';
import { SIZES } from '../constants';

interface TriggerRenderProps { open: boolean; }

interface PortalMenuProps {
  trigger: (p: TriggerRenderProps) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  minWidth?: number;
  ariaLabel: string;
  onClose?: () => void;
}

/* 2026-06-15: smart-positioning rewrite.
   PortalMenu now measures its own rendered size and the trigger's viewport
   rect, then picks the placement (above/below × left-aligned/right-aligned)
   that fits — clamping to the viewport when nothing fits cleanly. Re-measures
   on submenu navigation via ResizeObserver and on window resize. Initial paint
   uses `visibility:hidden` so users never see the menu flash at the wrong spot. */
import { useLayoutEffect } from 'react';

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 4;

export const PortalMenu: React.FC<PortalMenuProps> = ({ trigger, children, align = 'left', minWidth = SIZES.DROPDOWN_MIN_WIDTH, ariaLabel, onClose }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); setPos(null); }, []);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) onClose?.();
    wasOpen.current = open;
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open, close]);

  /* Compute placement: prefer below+within-viewport, flip above when the menu
     would otherwise clip; shift horizontally to stay inside the viewport,
     respecting the requested `align` as a tie-breaker. */
  const recompute = useCallback(() => {
    const tEl = triggerRef.current;
    const mEl = menuRef.current;
    if (!tEl || !mEl) return;
    const trigger = tEl.getBoundingClientRect();
    const menu = mEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Vertical: below if it fits; else above if it fits; else whichever side
    // has more room (and clamp into viewport so the user can scroll inside it).
    const spaceBelow = vh - trigger.bottom - VIEWPORT_MARGIN;
    const spaceAbove = trigger.top - VIEWPORT_MARGIN;
    let top: number;
    if (menu.height <= spaceBelow) {
      top = trigger.bottom + TRIGGER_GAP;
    } else if (menu.height <= spaceAbove) {
      top = trigger.top - TRIGGER_GAP - menu.height;
    } else if (spaceBelow >= spaceAbove) {
      top = trigger.bottom + TRIGGER_GAP;
    } else {
      top = Math.max(VIEWPORT_MARGIN, trigger.top - TRIGGER_GAP - menu.height);
    }

    // Horizontal: try the requested align first; if the menu would overflow,
    // shift it inward. Clamp final position to the viewport.
    let left: number;
    if (align === 'right') {
      // Right-aligned: menu's right edge sits at trigger.right
      left = trigger.right - menu.width;
    } else {
      // Left-aligned: menu's left edge sits at trigger.left
      left = trigger.left;
    }
    if (left + menu.width > vw - VIEWPORT_MARGIN) {
      left = vw - menu.width - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    setPos({ top, left });
  }, [align]);

  // Measure on first paint after `open` flips true.
  useLayoutEffect(() => {
    if (open) recompute();
  }, [open, recompute]);

  // Re-measure when the menu's content size changes (submenu navigation,
  // search filtering, etc.) and when the viewport itself resizes/scrolls.
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
    <div ref={triggerRef} style={{ display: 'inline-flex' }} onClick={() => setOpen((v) => !v)}>
      {trigger({ open })}
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#091E4224')}`,
            borderRadius: SIZES.DROPDOWN_RADIUS,
            boxShadow: token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
            padding: '4px 0',
            minWidth,
            maxHeight: SIZES.DROPDOWN_MAX_HEIGHT,
            overflowY: 'auto',
            zIndex: SIZES.Z_DROPDOWN,
          }}
        >
          {children(close)}
        </div>,
        document.body,
      )}
    </div>
  );
};

export const MenuItem: React.FC<{
  selected?: boolean;
  variant?: 'check' | 'radio' | 'plain';
  onClick: () => void;
  children: React.ReactNode;
}> = ({ selected, variant = 'check', onClick, children }) => (
  <button
    role={variant === 'radio' ? 'menuitemradio' : variant === 'check' ? 'menuitemcheckbox' : 'menuitem'}
    aria-checked={variant !== 'plain' ? !!selected : undefined}
    onClick={onClick}
    style={{
      width: '100%', height: SIZES.MENU_ITEM_HEIGHT, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
      border: 'none', background: selected ? token('color.background.selected', '#E9F2FF') : 'transparent',
      color: selected ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'),
      fontSize: 14, lineHeight: '20px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    }}
    onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
    onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
  >
    {variant !== 'plain' && (
      <span style={{ width: 16, display: 'inline-flex', flexShrink: 0 }}>
        {selected && <CheckIcon label="" size="small" primaryColor={token('color.icon.selected', '#0C66E4')} />}
      </span>
    )}
    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </button>
);

export const TriggerChevron: React.FC = () => (
  <span style={{ display: 'inline-flex', flexShrink: 0 }}>
    <ChevronDownIcon label="" size="small" primaryColor={token('color.icon.subtle', '#626F86')} />
  </span>
);

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

export const PortalMenu: React.FC<PortalMenuProps> = ({ trigger, children, align = 'left', minWidth = SIZES.DROPDOWN_MIN_WIDTH, ariaLabel, onClose }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
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

  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} style={{ display: 'inline-flex' }} onClick={() => setOpen((v) => !v)}>
      {trigger({ open })}
      {open && rect && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            ...(align === 'right' ? { right: window.innerWidth - rect.right } : { left: rect.left }),
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

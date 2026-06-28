/**
 * ToolbarMenuButton — generic icon-button + portal-mounted menu.
 *
 * Extracted 2026-06-17 from BacklogPage.atlaskit.tsx so Tasks Hub (and any
 * future toolbar surface) reuses the exact same control instead of
 * replicating it (CLAUDE.md REUSE-FIRST P0). Behaviour is byte-identical to
 * the original local helper.
 *
 * Apr 27, 2026 (jira-compare audit P1 #7 + #8 re-probe iter 2):
 * @atlaskit/dropdown-menu renders an empty portal on these surfaces (same
 * bug GroupByControl works around). This helper mirrors GroupByControl's
 * proven pattern: native trigger + ReactDOM.createPortal menu mounted to
 * <body> with position computed from the trigger rect. Items are grouped,
 * each with an optional icon + click handler. Disabled items still render
 * but don't fire onClick.
 *
 * Visual + a11y conventions match Atlaskit DropdownMenu / DropdownItem:
 *   - role="menu" on container, role="menuitem" on items
 *   - aria-haspopup="menu" + aria-expanded on trigger
 *   - keyboard nav: ArrowUp/Down, Home/End, Enter/Space, Esc
 *   - mousedown outside the trigger or menu closes the menu
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';

export type ToolbarMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDisabled?: boolean;
  onClick?: () => void;
  /** When true, skip focus-return to trigger so a newly-opened modal can claim focus. */
  opensModal?: boolean;
};
export type ToolbarMenuGroup = {
  title?: string;
  items: ToolbarMenuItem[];
};

export function ToolbarMenuButton({
  icon, ariaLabel, tooltipContent, buttonStyle, groups,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  tooltipContent: string;
  buttonStyle: React.CSSProperties;
  groups: ToolbarMenuGroup[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Flat enabled-items list for keyboard navigation (skips disabled).
  const enabledItems = useMemo(() => {
    const out: Array<{ groupIdx: number; itemIdx: number; flat: number }> = [];
    let flat = 0;
    groups.forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        if (!it.isDisabled) out.push({ groupIdx: gi, itemIdx: ii, flat });
        flat++;
      });
    });
    return out;
  }, [groups]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    // Anchor by the right edge so menu opens flush-right with trigger
    // (matches Atlaskit DropdownMenu placement="bottom-end" semantics).
    setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setFocusedIdx(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = itemsRef.current[enabledItems[focusedIdx]?.flat ?? 0];
    if (el) el.focus();
  }, [isOpen, focusedIdx, enabledItems]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => (i + 1) % Math.max(1, enabledItems.length)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => (i - 1 + enabledItems.length) % Math.max(1, enabledItems.length)); }
      else if (e.key === 'Home') { e.preventDefault(); setFocusedIdx(0); }
      else if (e.key === 'End') { e.preventDefault(); setFocusedIdx(Math.max(0, enabledItems.length - 1)); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = enabledItems[focusedIdx];
        if (target) {
          const item = groups[target.groupIdx]?.items[target.itemIdx];
          if (item && !item.isDisabled) {
            item.onClick?.();
            setIsOpen(false);
            triggerRef.current?.focus();
          }
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, focusedIdx, enabledItems, groups]);

  // Flat counter for assigning refs / focus indices to items in render.
  let flatIdx = 0;

  return (
    <>
      <Tooltip content={tooltipContent}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
          onKeyDown={(e) => {
            if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-hovered, #E4E6EA)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {icon}
        </button>
      </Tooltip>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: anchor.top,
            right: anchor.right,
            minWidth: 180,
            background: token('elevation.surface.overlay', 'var(--ds-surface, #FFFFFF)'),
            border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))'),
            padding: '8px 0',
            zIndex: 9999,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 14,
          }}
        >
          {groups.map((group, gi) => (
            <React.Fragment key={`g${gi}`}>
              {group.title && (
                <div style={{
                  padding: '4px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                }}>
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const myFlat = flatIdx++;
                const enabledIdx = enabledItems.findIndex((e) => e.flat === myFlat);
                const focused = enabledIdx !== -1 && enabledIdx === focusedIdx;
                return (
                  <button
                    key={item.id}
                    ref={(el) => { itemsRef.current[myFlat] = el; }}
                    role="menuitem"
                    type="button"
                    aria-disabled={item.isDisabled || undefined}
                    tabIndex={focused ? 0 : -1}
                    disabled={item.isDisabled}
                    onMouseEnter={() => { if (enabledIdx !== -1) setFocusedIdx(enabledIdx); }}
                    onClick={() => {
                      if (item.isDisabled) return;
                      item.onClick?.();
                      setIsOpen(false);
                      if (!item.opensModal) triggerRef.current?.focus();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 16px',
                      border: 'none',
                      outline: 'none',
                      background: focused
                        ? token('color.background.neutral.subtle.hovered', '#091E4208')
                        : 'transparent',
                      color: item.isDisabled
                        ? token('color.text.disabled', '#A6A7AA')
                        : token('color.text', 'var(--ds-text, #172B4D)'),
                      fontSize: 14,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      cursor: item.isDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {item.icon && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {gi < groups.length - 1 && (
                <div style={{
                  height: 1,
                  margin: '4px 0',
                  background: token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))'),
                }} />
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default ToolbarMenuButton;

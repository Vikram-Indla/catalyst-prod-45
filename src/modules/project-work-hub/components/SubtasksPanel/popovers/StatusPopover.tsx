/**
 * StatusPopover — createPortal-based status picker (fixed-position dropdown).
 *
 * Replaced @atlaskit/popup on 2026-05-05 due to a click-outside race condition
 * in the Atlaskit controlled Popup that prevented the picker from opening inside
 * the jira-table-viewport (overflow:auto) container. The portal approach
 * (identical pattern to CatalystStatusPill) appends directly to document.body
 * with fixed positioning, sidestepping all ancestor overflow constraints.
 *
 * Three groups (To Do / In Progress / Done) match the Jira Cloud status menu.
 * Items keep the 3-colour guardrail (CLAUDE.md §5) — each row renders an
 * inline Atlaskit Lozenge with one of three appearances (default, inprogress,
 * success). No destructive / new / moved lozenges are ever emitted.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lozenge from '@atlaskit/lozenge';
import { Check } from '@/lib/atlaskit-icons';
import { token } from '@atlaskit/tokens';
import { STATUS_OPTION_GROUPS } from '../../dialogs/story-detail-modules/constants';

interface StatusPopoverProps {
  status: string;
  statusCategory: string;
  onChange: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

const CATEGORY_TO_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success'> = {
  todo: 'default',
  in_progress: 'inprogress',
  done: 'success',
};

export function StatusPopover({ status, onChange, children, showActive = true }: StatusPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Close on click outside.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const popover = document.querySelector('[data-sp-status-popover]');
      if (popover?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Esc to close — capture phase + stopImmediatePropagation so the panel's own
  // Escape listener doesn't also fire and close the entire detail drawer.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    setIsOpen(true);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onClick={toggle}
        style={{ display: 'inline-flex', cursor: 'pointer' }}
      >
        {children}
      </span>

      {isOpen && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-sp-status-popover
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              width: 260,
              maxHeight: 360,
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              padding: '4px 0',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {STATUS_OPTION_GROUPS.map((group) => (
              <div key={group.category}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: token('color.text.subtle', '#6B6E76'),
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '8px 12px 4px', marginTop: 4,
                }}>
                  {group.groupLabel}
                </div>
                {group.statuses.map((s) => {
                  const active = showActive && s === status;
                  const appearance = CATEGORY_TO_APPEARANCE[group.category] ?? 'default';
                  return (
                    <button
                      key={s}
                      type="button"
                      role="menuitem"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', height: 36, padding: '0 12px',
                        background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, #F4F5F7)'; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => {
                        onChange(s, group.category as 'todo' | 'in_progress' | 'done');
                        setIsOpen(false);
                      }}
                    >
                      {/* jira-compare 2026-05-05: isBold removed — matches non-bold picker parity */}
                      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                        <Lozenge appearance={appearance}>{s}</Lozenge>
                      </span>
                      {active && <Check size={14} color="#0052CC" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

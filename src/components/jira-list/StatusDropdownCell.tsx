import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Lozenge from '@atlaskit/lozenge';
import type { StatusDropdownCellProps } from './jira-list.types';
import { categoryToLozengeAppearance } from './jira-list.utils';

/**
 * Status cell: Lozenge + self-rolled portal dropdown.
 * Uses createPortal to document.body (avoids @atlaskit/popup L21 empty-portal bug — CLAUDE.md 2026-05-08).
 * Capture-phase Escape guard prevents event propagation to parent modals (CLAUDE.md 2026-05-08).
 */
export function StatusDropdownCell({ issue, onStatusChange, availableStatuses }: StatusDropdownCellProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        portalRef.current && !portalRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler, true);
    };
  }, [open]);

  const appearance = categoryToLozengeAppearance(issue.status.statusCategory.key);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="catalyst-status-trigger"
        data-testid="catalyst-status-pill-trigger"
        onClick={openDropdown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${issue.status.name}. Click to change.`}
      >
        <Lozenge appearance={appearance}>{issue.status.name}</Lozenge>
      </button>

      {open && availableStatuses?.length && createPortal(
        <div
          ref={portalRef}
          className="catalyst-status-dropdown-portal"
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          role="listbox"
          aria-label="Select status"
          data-filter-portal="true"
        >
          {availableStatuses.map((s) => (
            <div
              key={s.id}
              className="catalyst-status-dropdown-portal__item"
              role="menuitem"
              tabIndex={0}
              onClick={() => {
                onStatusChange(issue.key, s.id);
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onStatusChange(issue.key, s.id);
                  setOpen(false);
                }
              }}
            >
              <Lozenge appearance={categoryToLozengeAppearance(s.statusCategory.key)}>
                {s.name}
              </Lozenge>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

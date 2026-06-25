/**
 * HeaderOverflowMenu — Jira 4-item overflow: Hide done · Sort › · Bulk edit · View in search.
 *
 * Reason for portal: CLAUDE.md 2026-06-13 — @atlaskit/dropdown-menu inside
 * any overflow:hidden ancestor (the detail-view body) renders at (0,0) or at
 * the top of the page instead of anchored to the trigger. Replaced with a
 * portal + getBoundingClientRect for pixel-accurate placement under the ⋯
 * button. The Sort row opens a nested portal popup anchored to the Sort
 * item's bounding rect.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreHorizontal,
  Edit3,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Check,
} from '@/lib/atlaskit-icons';
import { SORT_FIELDS, type SortField, type SortState } from './sort';

interface HeaderOverflowMenuProps {
  hideDone: boolean;
  onToggleHideDone: () => void;
  bulkEditMode: boolean;
  onEnterBulkEdit: () => void;
  onViewInSearch: () => void;
  sort: SortState;
  onCycleSort: (field: SortField) => void;
}

const ITEM_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '6px 12px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  color: 'var(--ds-text, #172B4D)',
  textAlign: 'left',
};

function MenuItem({
  onClick,
  disabled,
  iconBefore,
  iconAfter,
  children,
  role = 'menuitem',
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...ITEM_BASE,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}>
        {iconBefore}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
      {iconAfter && (
        <span style={{ display: 'inline-flex' }}>{iconAfter}</span>
      )}
    </button>
  );
}

export function HeaderOverflowMenu({
  hideDone,
  onToggleHideDone,
  bulkEditMode,
  onEnterBulkEdit,
  onViewInSearch,
  sort,
  onCycleSort,
}: HeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const sortAnchorRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open && !sortOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const inMain = menuRef.current?.contains(t);
      const inSort = sortMenuRef.current?.contains(t);
      const inTrigger = triggerRef.current?.contains(t);
      if (!inMain && !inSort && !inTrigger) {
        setOpen(false);
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (sortOpen) setSortOpen(false);
        else setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, sortOpen]);

  const renderMain = () => {
    if (!open || !triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="Subtasks actions"
        style={{
          position: 'fixed',
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6,
          boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
          padding: '4px 0',
          minWidth: 200,
          zIndex: 9999,
        }}
      >
        <MenuItem
          role="menuitemcheckbox"
          iconBefore={
            hideDone ? (
              <Check size={14} color="var(--cp-primary-60, #0052CC)" />
            ) : null
          }
          onClick={() => {
            onToggleHideDone();
            setOpen(false);
          }}
        >
          Hide done
        </MenuItem>

        <div
          style={{
            height: 1,
            background: 'var(--ds-border, #DFE1E6)',
            margin: '4px 0',
          }}
        />

        <MenuItem
          iconBefore={
            sort.field ? (
              sort.dir === 'asc' ? (
                <ArrowUp size={14} color="var(--cp-primary-60, #0052CC)" />
              ) : (
                <ArrowDown size={14} color="var(--cp-primary-60, #0052CC)" />
              )
            ) : null
          }
          iconAfter={
            <ChevronRight
              size={14}
              color="var(--ds-text-subtlest, #6B778C)"
            />
          }
          onClick={(e) => {
            sortAnchorRef.current = e.currentTarget;
            setSortOpen((v) => !v);
          }}
        >
          Sort
        </MenuItem>

        <div
          style={{
            height: 1,
            background: 'var(--ds-border, #DFE1E6)',
            margin: '4px 0',
          }}
        />

        <MenuItem
          disabled={bulkEditMode}
          iconBefore={<Edit3 size={14} color="var(--cp-text-secondary, #44546F)" />}
          onClick={() => {
            onEnterBulkEdit();
            setOpen(false);
          }}
        >
          Bulk edit
        </MenuItem>

        <MenuItem
          iconBefore={<Search size={14} color="var(--cp-text-secondary, #44546F)" />}
          onClick={() => {
            onViewInSearch();
            setOpen(false);
          }}
        >
          View in search
        </MenuItem>
      </div>,
      document.body,
    );
  };

  const renderSort = () => {
    if (!sortOpen || !sortAnchorRef.current) return null;
    const rect = sortAnchorRef.current.getBoundingClientRect();
    return createPortal(
      <div
        ref={sortMenuRef}
        role="menu"
        aria-label="Sort by"
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.right + 4,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6,
          boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
          padding: '4px 0',
          minWidth: 220,
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {SORT_FIELDS.map(({ field, label }) => {
          const active = sort.field === field;
          const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
          return (
            <MenuItem
              key={field}
              iconAfter={
                active ? (
                  <Arrow size={14} color="var(--cp-primary-60, #0052CC)" />
                ) : null
              }
              onClick={() => onCycleSort(field)}
            >
              {label}
            </MenuItem>
          );
        })}
        {sort.field && (
          <>
            <div
              style={{
                height: 1,
                background: 'var(--ds-border, #DFE1E6)',
                margin: '4px 0',
              }}
            />
            <div
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: 'var(--ds-text-subtlest, #6B778C)',
              }}
            >
              Click again to flip direction or clear.
            </div>
          </>
        )}
      </div>,
      document.body,
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sp-icon-btn"
        aria-label="Subtasks actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setSortOpen(false);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {renderMain()}
      {renderSort()}
    </>
  );
}

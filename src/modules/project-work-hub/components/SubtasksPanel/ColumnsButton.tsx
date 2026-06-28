/**
 * ColumnsButton — portal-rendered column-picker menu.
 *
 * Reason for portal: CLAUDE.md 2026-06-13 — @atlaskit/dropdown-menu inside
 * any overflow:hidden ancestor renders at (0,0). Subtasks panel sits inside
 * the detail-view body which has overflow:hidden, so we use createPortal +
 * getBoundingClientRect for pixel-accurate placement.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, Check } from '@/lib/atlaskit-icons';

type ColumnKey = 'work' | 'priority' | 'assignee' | 'status';

interface ColumnDef {
  key: ColumnKey;
  label: string;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'work', label: 'Work' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
];

interface ColumnsButtonProps {
  columns: Record<ColumnKey, boolean>;
  onChange: (next: Record<ColumnKey, boolean>) => void;
}

export function ColumnsButton({ columns, onChange }: ColumnsButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const toggle = (key: ColumnKey) => {
    const next = { ...columns, [key]: !columns[key] };
    // Keep at least one column visible.
    if (!Object.values(next).some(Boolean)) return;
    onChange(next);
  };

  const renderMenu = () => {
    if (!open || !triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const visibleCount = Object.values(columns).filter(Boolean).length;
    return createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label="Toggle columns"
        style={{
          position: 'fixed',
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
          background: 'var(--ds-surface-overlay)',
          border: '1px solid var(--ds-border)',
          borderRadius: 6,
          boxShadow: '0 8px 28px var(--ds-shadow-raised, rgba(9,30,66,0.25))',
          padding: '4px 0',
          minWidth: 220,
          zIndex: 9999,
        }}
      >
        {COLUMN_DEFS.map((c) => {
          const checked = columns[c.key];
          const disabled = checked && visibleCount === 1;
          return (
            <button
              key={c.key}
              type="button"
              role="menuitemcheckbox"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => toggle(c.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '4px 12px',
                background: 'transparent',
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 'var(--ds-font-size-400)',
                color: 'var(--ds-text)',
                textAlign: 'left',
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
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: checked
                    ? '1px solid var(--cp-primary-60)'
                    : '1px solid var(--ds-border)',
                  background: checked
                    ? 'var(--cp-primary-60)'
                    : 'transparent',
                  color: 'var(--ds-text-inverse)',
                  flexShrink: 0,
                }}
              >
                {checked && <Check size={12} color="currentColor" />}
              </span>
              <span>{c.label}</span>
            </button>
          );
        })}
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
        aria-label="Toggle columns"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Columns"
        onClick={() => setOpen((v) => !v)}
      >
        <Columns3 size={16} />
      </button>
      {renderMenu()}
    </>
  );
}

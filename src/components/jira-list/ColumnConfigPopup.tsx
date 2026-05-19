import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import type { VisibleColumnKey } from './jira-list.types';

const COLUMN_OPTIONS: { key: VisibleColumnKey; label: string; alwaysVisible?: boolean }[] = [
  { key: 'checkbox', label: 'Checkbox', alwaysVisible: true },
  { key: 'work', label: 'Work', alwaysVisible: true },
  { key: 'parent', label: 'Parent' },
  { key: 'status', label: 'Status', alwaysVisible: true },
  { key: 'columnConfig', label: 'Column settings', alwaysVisible: true },
];

interface ColumnConfigPopupProps {
  visibleColumns: VisibleColumnKey[];
  onChange: (cols: VisibleColumnKey[]) => void;
}

/** Column visibility picker — self-rolled portal, same pattern as StatusDropdownCell. */
export function ColumnConfigPopup({ visibleColumns, onChange }: ColumnConfigPopupProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const openPopup = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 200 });
    setOpen(true);
  };

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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (key: VisibleColumnKey) => {
    const opt = COLUMN_OPTIONS.find((o) => o.key === key);
    if (opt?.alwaysVisible) return;
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((k) => k !== key)
      : [...visibleColumns, key];
    onChange(next);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="catalyst-column-config-btn"
        onClick={openPopup}
        aria-label="Configure columns"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SettingsIcon label="Configure columns" size="small" />
      </button>

      {open && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: 'var(--ds-surface-overlay, #ffffff)',
            border: '1px solid var(--ds-border, #dfe1e6)',
            borderRadius: 3,
            boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.25))',
            padding: '8px 0',
            minWidth: 200,
          }}
          role="dialog"
          aria-label="Column visibility"
          data-filter-portal="true"
        >
          <div style={{ padding: '4px 16px 8px', fontSize: 12, fontWeight: 653, color: 'var(--ds-text-subtlest, #626f86)' }}>
            Columns
          </div>
          {COLUMN_OPTIONS.map(({ key, label, alwaysVisible }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 16px',
                cursor: alwaysVisible ? 'default' : 'pointer',
                opacity: alwaysVisible ? 0.5 : 1,
                fontSize: 14,
                color: 'var(--ds-text, #172b4d)',
              }}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(key)}
                disabled={alwaysVisible}
                onChange={() => toggle(key)}
                aria-label={`Toggle ${label} column`}
              />
              {label}
            </label>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

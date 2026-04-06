/**
 * ColumnManager — Show/hide columns dropdown + column config types
 * F12: Column management with localStorage persistence
 */

import { useState, useEffect, useRef } from 'react';
import { Settings, GripVertical, Check } from 'lucide-react';

export interface ColumnDef {
  id: string;
  label: string;
  width: number;
  minWidth?: number;
  defaultVisible: boolean;
  alwaysVisible?: boolean; // Can't be hidden (e.g. Work)
}

export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'work',        label: 'Work',         width: 0,   defaultVisible: true,  alwaysVisible: true }, // flex
  { id: 'status',      label: 'Status',       width: 150, defaultVisible: true },
  { id: 'parent',      label: 'Parent',       width: 220, defaultVisible: true },
  { id: 'assignee',    label: 'Assignee',     width: 160, defaultVisible: true },
  { id: 'created',     label: 'Created',      width: 150, defaultVisible: true },
  { id: 'fixVersion',  label: 'Fix Versions', width: 140, defaultVisible: false },
  { id: 'labels',      label: 'Labels',       width: 160, defaultVisible: false },
  { id: 'storyPoints', label: 'Estimate',     width: 80,  defaultVisible: false },
  { id: 'dueDate',     label: 'Due Date',     width: 120, defaultVisible: false },
  { id: 'reporter',    label: 'Reporter',     width: 140, defaultVisible: false },
  { id: 'updated',     label: 'Updated',      width: 150, defaultVisible: false },
  { id: 'priority',    label: 'Priority',     width: 90,  defaultVisible: false },
  { id: 'type',        label: 'Type',         width: 100, defaultVisible: false },
];

const STORAGE_KEY = 'hi-visible-columns';

export function getInitialVisibleColumns(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
}

export function saveVisibleColumns(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface ColumnManagerProps {
  visibleColumns: string[];
  onChange: (columns: string[]) => void;
}

export function ColumnManagerDropdown({ visibleColumns, onChange }: ColumnManagerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleColumn = (id: string) => {
    const col = ALL_COLUMNS.find(c => c.id === id);
    if (col?.alwaysVisible) return;
    const next = visibleColumns.includes(id)
      ? visibleColumns.filter(c => c !== id)
      : [...visibleColumns, id];
    onChange(next);
    saveVisibleColumns(next);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4,
        }}
        title="Manage columns"
      >
        <Settings size={14} color="var(--fg-3)" />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 220,
          background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 100, padding: '8px 0',
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ padding: '4px 12px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em' }}>
            Columns
          </div>
          {ALL_COLUMNS.map(col => {
            const isVisible = visibleColumns.includes(col.id);
            return (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                disabled={col.alwaysVisible}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', fontSize: 13, color: col.alwaysVisible ? 'rgba(237,237,237,0.40)' : 'rgba(237,237,237,0.53)',
                  background: 'none', border: 'none', cursor: col.alwaysVisible ? 'default' : 'pointer',
                  textAlign: 'left', opacity: col.alwaysVisible ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!col.alwaysVisible) e.currentTarget.style.background = 'var(--bg-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: isVisible ? '1px solid var(--cp-blue)' : '1px solid rgba(237,237,237,0.53)',
                  background: isVisible ? 'var(--cp-blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {isVisible && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                </div>
                {col.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

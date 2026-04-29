/**
 * InlineCellEditor — In-place cell editing for the Request Table
 * Catalyst V5 Design System — Uses real profile data
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { RequestStatus } from '@/types/request';
import { STATUS_DISPLAY } from '@/types/request';
import { useProfileOptions } from '@/hooks/useRequestLookups';

type EditorType = 'text' | 'status' | 'assignee' | 'quarter' | 'date' | 'number';

interface InlineCellEditorProps {
  type: EditorType;
  value: string | number | null;
  cellRect: DOMRect;
  onSave: (value: string | number | null) => void;
  onCancel: () => void;
  onTab?: (direction: 'next' | 'prev') => void;
}

const ALL_STATUSES = Object.keys(STATUS_DISPLAY) as RequestStatus[];

function generateQuarters(): string[] {
  const quarters: string[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y <= currentYear + 2; y++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${y}`);
    }
  }
  return quarters;
}

const editorStyles: React.CSSProperties = {
  border: '1.5px solid #2563eb',
  borderRadius: 4,
  boxShadow: '0 0 0 3px rgba(37,99,235,0.15)',
  outline: 'none',
  fontFamily: 'var(--cp-font-body)',
  fontSize: 13,
  color: '#18181b',
  background: '#ffffff',
};

export function InlineCellEditor({ type, value, cellRect, onSave, onCancel, onTab }: InlineCellEditorProps) {
  const [localValue, setLocalValue] = useState<string>(value?.toString() ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const { data: profileOptions } = useProfileOptions();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current instanceof HTMLInputElement && type === 'text') {
        inputRef.current.select();
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [type]);

  const save = useCallback(() => {
    if (type === 'number') {
      const num = parseInt(localValue, 10);
      onSave(isNaN(num) ? 0 : Math.min(100, Math.max(0, num)));
    } else if (localValue === '') {
      onSave(null);
    } else {
      onSave(localValue);
    }
  }, [localValue, type, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      save();
      onTab?.(e.shiftKey ? 'prev' : 'next');
    }
  }, [save, onCancel, onTab]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        save();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [save]);

  const portalStyle: React.CSSProperties = {
    position: 'fixed',
    top: cellRect.top,
    left: cellRect.left,
    width: cellRect.width,
    height: cellRect.height,
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
  };

  if (type === 'status' || type === 'assignee' || type === 'quarter') {
    const QUARTERS = generateQuarters();
    const options = type === 'status'
      ? ALL_STATUSES.map(s => ({ value: s, label: STATUS_DISPLAY[s].label }))
      : type === 'assignee'
        ? (profileOptions || []).map(p => ({ value: p.value, label: p.label }))
        : QUARTERS.map(q => ({ value: q, label: q }));

    return createPortal(
      <div style={portalStyle}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={localValue}
          onChange={(e) => { setLocalValue(e.target.value); }}
          onBlur={save}
          onKeyDown={handleKeyDown}
          style={{ ...editorStyles, width: '100%', height: cellRect.height - 4, padding: '0 4px', cursor: 'pointer' }}
        >
          <option value="">—</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>,
      document.body
    );
  }

  if (type === 'date') {
    return createPortal(
      <div style={portalStyle}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="date"
          value={localValue ? localValue.slice(0, 10) : ''}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...editorStyles, width: '100%', height: cellRect.height - 4, padding: '0 4px' }}
        />
      </div>,
      document.body
    );
  }

  if (type === 'number') {
    return createPortal(
      <div style={portalStyle}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="number"
          min={0}
          max={100}
          step={1}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...editorStyles, width: 60, height: cellRect.height - 4, padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}
        />
      </div>,
      document.body
    );
  }

  // text
  return createPortal(
    <div style={portalStyle}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ ...editorStyles, width: '100%', height: cellRect.height - 4, padding: '0 8px' }}
      />
    </div>,
    document.body
  );
}

/** Map column IDs to editor types */
export const EDITABLE_COLUMNS: Record<string, EditorType> = {
  title: 'text',
  status: 'status',
  assignee: 'assignee',
  quarter: 'quarter',
  kickoff: 'date',
  target: 'date',
  progress: 'number',
};

/** Map column IDs to Request field keys for Supabase updates */
export const COLUMN_TO_FIELD: Record<string, string> = {
  title: 'title',
  status: 'status',
  assignee: 'assignee_id',
  quarter: 'target_quarter',
  kickoff: 'kickoff_date',
  target: 'target_complete',
  progress: 'progress',
};

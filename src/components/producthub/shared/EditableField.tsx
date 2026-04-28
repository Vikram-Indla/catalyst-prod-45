/**
 * EditableField — Reusable inline-editable field for the detail panel.
 * Shows read-only text by default; transforms to input in edit mode.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequestStatus } from '@/types/request';
import { STATUS_DISPLAY } from '@/types/request';

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  isEditing: boolean;
  type: 'text' | 'textarea' | 'select' | 'date' | 'range';
  options?: { value: string; label: string; color?: string }[];
  onChange: (value: any) => void;
  onQuickEdit?: (value: any) => void;
  readOnly?: boolean;
  tooltip?: string;
  placeholder?: string;
  required?: boolean;
}

export function EditableField({
  label,
  value,
  isEditing,
  type,
  options,
  onChange,
  onQuickEdit,
  readOnly,
  tooltip,
  placeholder,
  required,
}: EditableFieldProps) {
  const [quickEditing, setQuickEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (quickEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [quickEditing]);

  const handleQuickSave = () => {
    setQuickEditing(false);
    if (onQuickEdit) onQuickEdit(value);
  };

  const displayValue = (() => {
    if (value === null || value === undefined || value === '') return placeholder || '—';
    if (type === 'select' && options) {
      const opt = options.find(o => o.value === String(value));
      return opt?.label || String(value);
    }
    if (type === 'date' && value) {
      try {
        return new Date(String(value)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return String(value); }
    }
    if (type === 'range') return `${value}%`;
    return String(value);
  })();

  const isActive = isEditing || quickEditing;

  if (readOnly) {
    return (
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5" title={tooltip}>
          {label}
        </div>
        <div className="text-[13px] text-zinc-500 italic px-2 py-1.5 -mx-2">{displayValue}</div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="group/field">
        <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
        <div
          className="text-[13px] text-zinc-900 hover:bg-zinc-50 rounded px-2 py-1.5 -mx-2 cursor-pointer flex items-center justify-between transition-colors"
          onClick={() => onQuickEdit && setQuickEditing(true)}
        >
          <span className={cn(!value && 'text-zinc-400 italic')}>{displayValue}</span>
          {onQuickEdit && (
            <Pencil className="w-3 h-3 text-zinc-300 opacity-0 group-hover/field:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  const inputClasses = "w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white outline-none transition-shadow";

  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-zinc-400 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {type === 'text' && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={quickEditing ? handleQuickSave : undefined}
          onKeyDown={e => { if (e.key === 'Enter' && quickEditing) handleQuickSave(); if (e.key === 'Escape') setQuickEditing(false); }}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
      {type === 'textarea' && (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={quickEditing ? handleQuickSave : undefined}
          rows={4}
          placeholder={placeholder}
          className={cn(inputClasses, 'resize-y')}
        />
      )}
      {type === 'select' && (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={value ?? ''}
          onChange={e => { onChange(e.target.value); if (quickEditing) { setQuickEditing(false); onQuickEdit?.(e.target.value); } }}
          className={inputClasses}
        >
          <option value="">Select…</option>
          {options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
      {type === 'date' && (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="date"
          value={value ? String(value).slice(0, 10) : ''}
          onChange={e => onChange(e.target.value || null)}
          onBlur={quickEditing ? handleQuickSave : undefined}
          className={inputClasses}
        />
      )}
      {type === 'range' && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={Number(value) || 0}
            onChange={e => onChange(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-medium text-zinc-700 tabular-nums w-10 text-right">{value ?? 0}%</span>
        </div>
      )}
    </div>
  );
}

export default EditableField;

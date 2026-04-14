/**
 * EditableLineItemsTable — Jira subtask-style inline-editable table
 *
 * Features:
 * - Inline editable cells (name, quantity, unit, description)
 * - Add (+) row button
 * - Remove row via trash action
 * - Keyboard: Enter saves, Escape reverts, Tab moves to next field
 * - Empty state
 * - Prefilled row indicator
 *
 * Uses native HTML <table> with border-collapse:separate (Jira parity)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trash2, MoreHorizontal, Check, X, Pencil, Copy,
} from 'lucide-react';
import type { LineItem, LineItemKind } from '@/lib/editable-list-provider';
import { UNITS } from '@/lib/editable-list-provider';

// ── Types ──

interface EditableLineItemsTableProps {
  items: LineItem[];
  kind: LineItemKind;
  onAddRow: () => void;
  onUpdateRow: (clientId: string, patch: Partial<LineItem>) => void;
  onRemoveRow: (clientId: string) => void;
}

// ── Inline cell: Text ──

function InlineTextCell({
  value,
  placeholder,
  onCommit,
  mono,
}: {
  value: string;
  placeholder: string;
  onCommit: (val: string) => void;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onCommit(draft.trim());
  };

  const revert = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className="elt-cell-text"
        onClick={() => setEditing(true)}
        title="Click to edit"
        style={mono ? { fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } : undefined}
      >
        {value || <span className="elt-placeholder">{placeholder}</span>}
        <Pencil className="elt-edit-icon" size={11} />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      className="elt-cell-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); revert(); }
      }}
      placeholder={placeholder}
      maxLength={255}
      style={mono ? { fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } : undefined}
    />
  );
}

// ── Inline cell: Number ──

function InlineNumberCell({
  value,
  placeholder,
  onCommit,
}: {
  value: number | undefined;
  placeholder: string;
  onCommit: (val: number | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value?.toString() ?? ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = draft.trim() ? Number(draft.trim()) : undefined;
    if (num !== value) onCommit(isNaN(num as number) ? undefined : num);
  };

  const revert = () => {
    setDraft(value?.toString() ?? '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className="elt-cell-text elt-cell-number"
        onClick={() => setEditing(true)}
        title="Click to edit"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
      >
        {value != null ? value.toLocaleString() : <span className="elt-placeholder">{placeholder}</span>}
        <Pencil className="elt-edit-icon" size={11} />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      className="elt-cell-input"
      type="number"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); revert(); }
      }}
      placeholder={placeholder}
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, width: '100%' }}
    />
  );
}

// ── Inline cell: Select (unit) ──

function InlineSelectCell({
  value,
  options,
  onCommit,
}: {
  value: string | undefined;
  options: string[];
  onCommit: (val: string) => void;
}) {
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="elt-select-btn"
        onClick={() => setOpen(o => !o)}
      >
        <span>{value || 'Select'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2.5 3.5L5 6.5L7.5 3.5" />
        </svg>
      </button>
      {open && (
        <div className="elt-select-dropdown">
          {options.map(opt => (
            <div
              key={opt}
              className={`elt-select-option ${opt === value ? 'elt-select-option--active' : ''}`}
              onClick={() => { onCommit(opt); setOpen(false); }}
            >
              {opt}
              {opt === value && <Check size={12} color="#0052CC" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row action menu ──

function RowActions({ onRemove, isPrefilled }: { onRemove: () => void; isPrefilled: boolean }) {
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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="elt-row-action-btn"
        onClick={() => setOpen(o => !o)}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="elt-row-menu">
          <button
            className="elt-row-menu-item elt-row-menu-item--danger"
            onClick={() => { onRemove(); setOpen(false); }}
          >
            <Trash2 size={12} />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Table ──

export function EditableLineItemsTable({
  items,
  kind,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: EditableLineItemsTableProps) {
  const visibleItems = items.filter(i => !i.isDeleted);

  if (visibleItems.length === 0) {
    return (
      <div className="elt-empty">
        <div className="elt-empty-text">
          No {kind === 'product' ? 'products' : 'raw materials'} yet
        </div>
        <button type="button" className="elt-empty-cta" onClick={onAddRow}>
          + Add {kind === 'product' ? 'product' : 'raw material'}
        </button>
      </div>
    );
  }

  return (
    <div className="elt-scroll">
      <table className="elt-table">
        <thead>
          <tr>
            <th className="elt-th" style={{ width: 28 }}>#</th>
            <th className="elt-th elt-th--name">NAME</th>
            <th className="elt-th elt-th--qty">QTY</th>
            <th className="elt-th elt-th--unit">UNIT</th>
            <th className="elt-th elt-th--desc">DESCRIPTION</th>
            <th className="elt-th elt-th--actions" style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, idx) => (
            <tr
              key={item.clientId}
              className={`elt-row ${item.isPrefilled && !item.isDirty ? 'elt-row--prefilled' : ''}`}
            >
              <td className="elt-td elt-td--idx">
                <span className="elt-idx">{idx + 1}</span>
                {item.isPrefilled && !item.isDirty && (
                  <Copy size={10} className="elt-cloned-icon" />
                )}
              </td>
              <td className="elt-td">
                <InlineTextCell
                  value={item.name}
                  placeholder="Enter name..."
                  onCommit={val => onUpdateRow(item.clientId, { name: val, isDirty: true })}
                />
              </td>
              <td className="elt-td">
                <InlineNumberCell
                  value={item.quantity}
                  placeholder="0"
                  onCommit={val => onUpdateRow(item.clientId, { quantity: val, isDirty: true })}
                />
              </td>
              <td className="elt-td">
                <InlineSelectCell
                  value={item.unit}
                  options={UNITS}
                  onCommit={val => onUpdateRow(item.clientId, { unit: val, isDirty: true })}
                />
              </td>
              <td className="elt-td">
                <InlineTextCell
                  value={item.description ?? ''}
                  placeholder="Add description..."
                  onCommit={val => onUpdateRow(item.clientId, { description: val, isDirty: true })}
                />
              </td>
              <td className="elt-td elt-td--actions">
                <RowActions
                  onRemove={() => onRemoveRow(item.clientId)}
                  isPrefilled={item.isPrefilled}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

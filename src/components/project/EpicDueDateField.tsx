/**
 * EpicDueDateField — Inline due date editor for Epic detail panel.
 *
 * View modes:
 *   - Empty: dashed pill "None — click to set"
 *   - Set:   coloured pill (green / amber / red) based on RAG
 * Edit mode:
 *   - Native HTML date input (en-GB display via locale on the system)
 *   - ✓ confirm / ✕ cancel buttons; Enter = confirm; Escape = cancel
 *
 * Save: optimistic; reverts on error via parent onSave throwing.
 * Clearing: pressing ✓ on a blank input → onSave(null).
 */
import React, { useEffect, useRef, useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

interface Props {
  issueId: string;
  dueDate: string | null;     // YYYY-MM-DD or null
  isEpic: boolean;
  onSave: (date: string | null) => Promise<void>;
}

type RagState = 'overdue' | 'at_risk' | 'on_track';

function ragStateFor(daysLeft: number): RagState {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 7) return 'at_risk';
  return 'on_track';
}

const RAG_STYLES: Record<RagState, { bg: string; border: string; color: string }> = {
  overdue:  { bg: '#FFECEB', border: '#FF5630', color: '#AE2A19' },
  at_risk:  { bg: '#FFF7D6', border: '#F5CD47', color: '#7F5F01' },
  on_track: { bg: '#DCFFF1', border: '#4BCE97', color: '#216E4E' },
};

function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v6M12 16.5v.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EpicDueDateField({ issueId, dueDate, isEpic, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(dueDate ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // keep draft in sync when prop changes (after parent refetch)
  useEffect(() => { setDraft(dueDate ?? ''); }, [dueDate]);

  // focus input on entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // outside click → cancel
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setEditing(false);
        setDraft(dueDate ?? '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing, dueDate]);

  if (!isEpic) return null;

  const handleConfirm = async () => {
    const next = draft || null;
    if (next === (dueDate ?? null)) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // parent surfaces toast; revert draft
      setDraft(dueDate ?? '');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(dueDate ?? '');
    setEditing(false);
  };

  // ── EDIT MODE ──
  if (editing) {
    return (
      <div ref={wrapRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          ref={inputRef}
          type="date"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
            if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
          }}
          disabled={saving}
          style={{
            border: '2px solid #388BFF', borderRadius: 3,
            boxShadow: '0 0 0 2px rgba(56,139,255,0.3)',
            padding: '5px 10px', fontSize: 14, fontFamily: 'inherit',
            color: '#172B4D', background: '#FFFFFF', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          aria-label="Confirm"
          style={{
            width: 24, height: 24, borderRadius: 3, border: 'none',
            background: '#0C66E4', color: '#FFFFFF', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}
        >✓</button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          aria-label="Cancel"
          style={{
            width: 24, height: 24, borderRadius: 3, border: 'none',
            background: '#F1F2F4', color: '#44546F', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}
        >✕</button>
      </div>
    );
  }

  // ── VIEW MODE ──
  if (!dueDate) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: '1px dashed #8590A2', background: '#F7F8F9', color: '#626F86',
          borderRadius: 3, padding: '4px 10px', fontSize: 13, fontFamily: 'inherit',
          cursor: 'pointer', lineHeight: 1.4,
        }}
      >None — click to set</button>
    );
  }

  const parsed = parseISO(dueDate);
  const daysLeft = differenceInCalendarDays(parsed, new Date());
  const rag = ragStateFor(daysLeft);
  const palette = RAG_STYLES[rag];
  const dateLabel = format(parsed, 'dd MMM yyyy');
  const daysLabel =
    rag === 'overdue' ? `+${Math.abs(daysLeft)}d overdue`
    : daysLeft === 0  ? 'due today'
    : `${daysLeft}d left`;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        border: `1px solid ${palette.border}`, background: palette.bg, color: palette.color,
        borderRadius: 3, padding: '4px 10px', fontSize: 13, fontFamily: 'inherit',
        cursor: 'pointer', lineHeight: 1.4,
      }}
    >
      {rag === 'overdue' ? <WarningIcon color={palette.color} /> : <CalendarIcon color={palette.color} />}
      <span>{dateLabel}</span>
      <span style={{ fontWeight: 700 }}>{daysLabel}</span>
    </button>
  );
}

export default EpicDueDateField;

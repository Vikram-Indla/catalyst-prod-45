/**
 * CatalystDueDateField — Canonical due date inline-edit field for Catalyst.
 *
 * Spec: Jira Due Date Field spec (2026-05-20).
 * Replaces EpicDueDateField across all surfaces.
 *
 * Behaviour:
 *   - View mode:  shows formatted date ("20 May 2026") or "None" in gray.
 *                 Overdue dates render in red (var(--ds-text-danger)).
 *   - Edit mode:  @atlaskit/datetime-picker DatePicker — text input + calendar
 *                 popup with full Atlaskit styling.
 *   - Auto-save on blur or calendar selection.
 *   - Cancel on Escape → reverts to previous value.
 *
 * Canonical usage:
 *   <CatalystDueDateField
 *     value={issue.due_date ?? null}
 *     onSave={async (iso) => { ... }}
 *   />
 *
 * Props:
 *   value     — ISO 8601 date string "YYYY-MM-DD" or null.
 *   onSave    — async callback; receives "YYYY-MM-DD" | null.
 *   disabled  — renders view-only with no edit affordance.
 *   locale    — BCP 47 tag (default "en-GB" → DD/MM/YYYY).
 *   weekStartDay — 0=Sun (default, Saudi locale), 1=Mon.
 *
 * ADS tokens used (all via var()):
 *   --ds-text-danger        — overdue date
 *   --ds-text-subtlest      — "None" placeholder
 *   --ds-text               — standard date value
 *   --ds-border-focused     — 2px blue on focused input (via DatePicker)
 *   --ds-background-neutral — hover tint in view mode
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DatePicker } from '@atlaskit/datetime-picker';
import WarningIcon from '@atlaskit/icon/glyph/warning';

export interface CatalystDueDateFieldProps {
  value: string | null;
  onSave: (iso: string | null) => Promise<void>;
  disabled?: boolean;
  locale?: string;
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return d < today;
}

function formatDisplay(iso: string, locale: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CatalystDueDateField({
  value,
  onSave,
  disabled = false,
  locale = 'en-GB',
  weekStartDay = 0,
}: CatalystDueDateFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [saving, setSaving] = useState(false);
  const prevValue = useRef<string | null>(value);

  // Sync when parent refetches
  useEffect(() => {
    if (!editing) {
      setDraft(value ?? '');
      prevValue.current = value;
    }
  }, [value, editing]);

  const commit = useCallback(async (next: string | null) => {
    const prev = prevValue.current;
    if (next === prev) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      prevValue.current = next;
    } catch {
      // Parent surfaces toast; revert
      setDraft(prev ?? '');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [onSave]);

  const handleChange = useCallback((newDate: string) => {
    // DatePicker calls onChange on every selection and on clear ('').
    const next = newDate || null;
    setDraft(newDate);
    // Auto-save immediately when date is picked from the calendar.
    commit(next);
  }, [commit]);

  const handleBlur = useCallback(() => {
    // Blur without a calendar selection — save whatever is in the draft.
    const next = draft || null;
    commit(next);
  }, [draft, commit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDraft(prevValue.current ?? '');
      setEditing(false);
    }
  }, []);

  if (editing && !disabled) {
    return (
      <div
        style={{ width: '100%', maxWidth: 220, opacity: saving ? 0.6 : 1 }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        // Prevent blur from firing when clicking within the calendar popup
        // (the popup is portalled — onBlur would fire on the container div
        //  before the calendar click registers).
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DatePicker
          value={draft}
          onChange={handleChange}
          shouldShowCalendarButton
          autoFocus
          clearControlLabel="Clear due date"
          openCalendarLabel="Open due date calendar"
          weekStartDay={weekStartDay}
          locale={locale}
          placeholder={locale === 'en-US' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}
        />
      </div>
    );
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────
  const overdue = isOverdue(value);
  const displayText = value ? formatDisplay(value, locale) : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setEditing(true)}
      aria-label={displayText
        ? `Due date: ${displayText}${overdue ? ' (overdue)' : ''}. Click to edit.`
        : 'Due date: not set. Click to add.'}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: 32,
        // Jira probe: outer inline-edit wrapper uses 0px vertical, 6px horizontal padding
        padding: '0px 6px',
        border: '2px solid transparent',
        borderRadius: 3,
        background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        outline: 'none',
        font: 'inherit',
        textAlign: 'left',
        boxSizing: 'border-box',
        transition: 'background 100ms ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-input-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {displayText ? (
        // Jira probe: date shown as compact content-width pill.
        // Overdue: red border (rgb(226,72,61)) + warning icon + red text.
        // Non-overdue: transparent border, standard text color.
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '0px 4px',
          borderRadius: 3,
          border: overdue
            ? '1px solid var(--ds-border-danger, rgb(226,72,61))'
            : '1px solid transparent',
          color: overdue ? 'var(--ds-text-danger, #AE2E24)' : 'var(--ds-text, #172B4D)',
          fontSize: 14,
          fontWeight: 400,
          lineHeight: '20px',
        }}>
          {overdue && (
            <WarningIcon
              label=""
              size="small"
              primaryColor="var(--ds-icon-danger, #AE2E24)"
            />
          )}
          {displayText}
        </span>
      ) : (
        <span style={{
          fontSize: 14,
          fontWeight: 400,
          lineHeight: '20px',
          color: 'var(--ds-text-subtlest, #626F86)',
        }}>
          None
        </span>
      )}
    </button>
  );
}

export default CatalystDueDateField;

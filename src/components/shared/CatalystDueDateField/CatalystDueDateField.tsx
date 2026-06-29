/**
 * CatalystDueDateField — Canonical due date inline-edit field for Catalyst.
 *
 * Spec: Jira Due Date Field spec (2026-05-20).
 * Replaces EpicDueDateField across all surfaces.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { DatePicker } from "@atlaskit/datetime-picker";
import WarningIcon from "@atlaskit/icon/glyph/warning";

const STYLE_ID = "cv-duedate-styles";
if (typeof document !== "undefined") {
  [
    "cv-duedate-styles-v1",
    "cv-duedate-styles-v2",
    "cv-duedate-styles-v3",
    STYLE_ID,
  ].forEach((id) => document.getElementById(id)?.remove());
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .cv-duedate { width: 100%; }
    
    /* 1. FORCE EVERY SINGLE CONTAINER LEVEL TO BE TRANSPARENT */
    .cv-duedate .cv-duedate-select__control,
    .cv-duedate .cv-duedate-select__control--is-focused,
    .cv-duedate .cv-duedate-select__value-container,
    .cv-duedate .cv-duedate-select__input-container,
    .cv-duedate .cv-duedate-select__input-container * {
      background: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    .cv-duedate .cv-duedate-select__control {
      min-height: 24px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      padding: 0 26px 0 0 !important;
      margin: 0 !important;
      position: relative !important;
    }
    .cv-duedate .cv-duedate-select__value-container {
      min-height: 24px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      padding: 0 6px !important;
      margin: 0 !important;
    }
    .cv-duedate .cv-duedate-select__indicators,
    .cv-duedate .cv-duedate-select__indicators * {
      padding: 0 !important;
      margin: 0 !important;
      width: auto !important;
      min-width: 0 !important;
    }
    .cv-duedate .cv-duedate-select__indicators {
      position: absolute !important;
      right: 6px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      height: auto !important;
      display: flex !important;
      align-items: center !important;
    }
    .cv-duedate .cv-duedate-select__dropdown-indicator {
      width: 16px !important;
      height: 16px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 16px !important;
    }
    .cv-duedate .cv-duedate-select__input-container {
      margin: 0 !important;
      padding: 0 !important;
    }
    .cv-duedate .cv-duedate-select__placeholder,
    .cv-duedate .cv-duedate-select__single-value,
    .cv-duedate .cv-duedate-select__input {
      font-size: 12px !important;
      line-height: 16px !important;
      margin: 0 !important;
      color: var(--ds-text) !important;
    }
    
    /* 2. NUCLEAR OPTION FOR JAVASCRIPT INLINE-STYLE INJECTIONS 
       This kills the hidden autogrow element's black background color dead in its tracks. */
    .cv-duedate div[style*="background"],
    .cv-duedate div[style*="background-color"],
    .cv-duedate .cv-duedate-select__input-container div[style] {
      background: transparent !important;
      background-color: transparent !important;
    }
    
    /* 3. INPUT RESET & CURSOR RECOVERY */
    .cv-duedate input,
    .cv-duedate .cv-duedate-select__input input,
    .cv-duedate .cv-duedate-select__control input {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      
      /* Keeps your blinking cursor visible while cleaning the layout */
      caret-color: var(--ds-text) !important; 
      color: var(--ds-text) !important;
      
      appearance: none !important;
      -webkit-appearance: none !important;
    }
    
    .cv-duedate .cv-duedate-select__clear-indicator,
    .cv-duedate .cv-duedate-select__indicator-separator { display: none !important; }
    .cv-duedate .cv-duedate-select__dropdown-indicator svg { width: 14px !important; height: 14px !important; display: block !important; }
    
    /* Keep focus styling restricted to the neat external visual border */
    .cv-duedate .cv-duedate-select__control--is-focused {
      border-radius: 3px !important;
      outline: 1px solid var(--ds-border-focused) !important;
      outline-offset: -1px !important;
    }
    /* When the calendar popup is open, render a neutral gray outline regardless of focus state */
    .cv-duedate .cv-duedate-select__control--menu-is-open {
      outline: 1px solid var(--ds-border) !important;
      outline-offset: -1px !important;
      border-radius: 3px !important;
    }
    /* Remove the Atlaskit IconButton hover background on the calendar icon */
    .cv-duedate button,
    .cv-duedate button:hover,
    .cv-duedate button:focus,
    .cv-duedate button:active {
      background: transparent !important;
      background-color: transparent !important;
    }
    /* Dark mode: index.css applies .dark [role="row"]:hover globally, which highlights
       the entire week row in the Atlaskit calendar. Restrict hover to the date cell only. */
    .dark [role="grid"] [role="row"]:hover,
    [data-theme="dark"] [role="grid"] [role="row"]:hover {
      background-color: transparent !important;
    }
    /* Per-cell hover (light mode default — Atlaskit's token renders too subtle). */
    [role="grid"] [role="gridcell"] button:not([data-selected]):not([data-disabled]):hover {
      background-color: var(--ds-background-neutral-subtle-pressed, rgba(9, 30, 66, 0.08)) !important;
    }
    /* Per-cell hover (dark mode override). */
    .dark [role="grid"] [role="gridcell"] button:not([data-selected]):not([data-disabled]):hover,
    [data-theme="dark"] [role="grid"] [role="gridcell"] button:not([data-selected]):not([data-disabled]):hover {
      background-color: var(--ds-surface, rgba(255, 255, 255, 0.08)) !important;
    }
  `;
  document.head.appendChild(s);
}

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
  const d = new Date(iso + "T00:00:00");
  return d < today;
}

function formatDisplay(iso: string, locale: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayPlaceholder(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CatalystDueDateField({
  value,
  onSave,
  disabled = false,
  locale = "en-GB",
  weekStartDay = 0,
}: CatalystDueDateFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? "");
  const [saving, setSaving] = useState(false);
  const prevValue = useRef<string | null>(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? "");
      prevValue.current = value;
    }
  }, [value, editing]);

  const commit = useCallback(
    async (next: string | null) => {
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
        setDraft(prev ?? "");
      } finally {
        setSaving(false);
        setEditing(false);
      }
    },
    [onSave],
  );

  const handleChange = useCallback(
    (newDate: string) => {
      const next = newDate || null;
      setDraft(newDate);
      commit(next);
    },
    [commit],
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const active = document.activeElement;
      if (active && wrapperRef.current?.contains(active)) return;
      if (
        active instanceof HTMLElement &&
        active.closest('[class*="atlaskit-calendar"], [data-testid*="calendar"]')
      ) return;
      const next = draft || null;
      commit(next);
    }, 0);
  }, [draft, commit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraft(prevValue.current ?? "");
      setEditing(false);
    }
  }, []);

  if (editing && !disabled) {
    return (
      <div
        ref={wrapperRef}
        className="cv-duedate"
        style={{ width: "100%", opacity: saving ? 0.6 : 1 }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DatePicker
          value={draft}
          onChange={handleChange}
          shouldShowCalendarButton
          autoFocus
          spacing="compact"
          clearControlLabel="Clear due date"
          openCalendarLabel="Open due date calendar"
          weekStartDay={weekStartDay}
          locale={locale}
          placeholder={todayPlaceholder(locale)}
          selectProps={{
            classNamePrefix: "cv-duedate-select",
            openMenuOnClick: false,
            openMenuOnFocus: false,
          }}
        />
      </div>
    );
  }

  const overdue = isOverdue(value);
  const displayText = value ? formatDisplay(value, locale) : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setEditing(true)}
      aria-label={
        displayText
          ? `Due date: ${displayText}${overdue ? " (overdue)" : ""}. Click to edit.`
          : "Due date: not set. Click to add."
      }
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: 32,
        padding: "0px 8px",
        border: "none",
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
        outline: "none",
        font: "inherit",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      {displayText ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: overdue
              ? "var(--ds-text-danger)"
              : "var(--ds-text)",
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 400,
            lineHeight: "20px",
          }}
        >
          {overdue && (
            <WarningIcon
              label=""
              size="small"
              primaryColor="var(--ds-icon-danger)"
            />
          )}
          {displayText}
        </span>
      ) : (
        <span
          style={{
            fontSize: 'var(--ds-font-size-400)',
            fontWeight: 400,
            lineHeight: "20px",
            color: "var(--ds-text-subtlest)",
          }}
        >
          None
        </span>
      )}
    </button>
  );
}

export default CatalystDueDateField;

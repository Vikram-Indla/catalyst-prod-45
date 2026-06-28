/**
 * ProductEditDatesModal — Jira-parity Edit Dates modal for the product
 * hub timeline three-dots menu. Mounted when SidebarRow's menuVariant is
 * `product-jira`.
 *
 * Layout (Image #24/25):
 *   ┌──────────────────────────────────────┐
 *   │ Edit Dates                       (×) │
 *   │ Leave the date fields blank to       │
 *   │ infer dates from the issue's         │
 *   │ sprint assignment.                   │
 *   │                                      │
 *   │ ┌──────────────────────────────────┐ │
 *   │ │ [icon] KEY-N  Summary            │ │
 *   │ │ Start date         Due date       │ │
 *   │ │ None → 6/17/2026   None           │ │
 *   │ └──────────────────────────────────┘ │
 *   │                                      │
 *   │ Start date          Due date         │
 *   │ [6/17/2026  📅] ✗   [None       📅]  │
 *   │                                      │
 *   │                  Cancel  [Confirm]   │
 *   └──────────────────────────────────────┘
 *
 * Behaviour:
 *   - Clicking the Start input opens a calendar below it. Picking a date
 *     fills the field. The Due calendar then disables all days BEFORE that
 *     start (greys them out, blocks clicks).
 *   - When both are set, the calendar paints the days in between with a
 *     subtle range fill so the user can see the span.
 *   - The summary chip shows a diff: None → newValue (strike on old when
 *     overwriting).
 *   - Confirm is enabled only when the pending pair differs from the
 *     stored pair AND start ≤ due (or one side blank).
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Calendar as CalendarIcon } from '@/lib/atlaskit-icons';
import type { TimelineIssue } from './types';

/* ─────────────────────────── date helpers ───────────────────────── */

function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHuman(iso: string | null): string {
  const d = parseIso(iso);
  if (!d) return 'None';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ─────────────────────────── range calendar ─────────────────────── */

interface RangeCalendarProps {
  /** ISO of the selection target on this calendar instance. */
  pickedFor: 'start' | 'due';
  startIso: string | null;
  dueIso: string | null;
  /** Days strictly before this ISO are disabled (used for Due when Start
   *  is set; null for Start). */
  minDate: string | null;
  onPick: (iso: string) => void;
}

function RangeCalendar({ pickedFor, startIso, dueIso, minDate, onPick }: RangeCalendarProps) {
  const today = new Date();
  const startD = parseIso(startIso);
  const dueD = parseIso(dueIso);
  const minD = parseIso(minDate);

  /* Default the visible month to the value being edited if set, else today. */
  const seedDate = pickedFor === 'start'
    ? (startD ?? dueD ?? today)
    : (dueD ?? startD ?? today);
  const [view, setView] = useState({ year: seedDate.getFullYear(), month: seedDate.getMonth() });

  /* Build a 6-row × 7-col grid of cells. Each cell is a Date so cross-month
     days render correctly (preceding/following month greyed). */
  const grid = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const firstDow = first.getDay(); // 0 = Sun
    const start = new Date(view.year, view.month, 1 - firstDow);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === view.month });
    }
    return cells;
  }, [view.year, view.month]);

  const stepMonth = (delta: number) => {
    setView(v => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };
  const stepYear = (delta: number) => {
    setView(v => ({ year: v.year + delta, month: v.month }));
  };

  return (
    <div
      style={{
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))',
        padding: 12,
        fontFamily: 'var(--ds-font-family-body)',
        userSelect: 'none',
      }}
    >
      {/* nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <NavBtn label="Previous year" onClick={() => stepYear(-1)}>«</NavBtn>
          <NavBtn label="Previous month" onClick={() => stepMonth(-1)}>‹</NavBtn>
        </div>
        <div style={{ fontSize: 14, fontWeight: 653, color: 'var(--ds-text, #172B4D)' }}>
          {MONTHS_LONG[view.month]} {view.year}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <NavBtn label="Next month" onClick={() => stepMonth(1)}>›</NavBtn>
          <NavBtn label="Next year" onClick={() => stepYear(1)}>»</NavBtn>
        </div>
      </div>

      {/* dow header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 32px)', gap: 4, marginBottom: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{
            fontSize: 11, fontWeight: 500, textAlign: 'center',
            color: 'var(--ds-text-subtle, #44546F)', padding: '4px 0',
          }}>{d}</div>
        ))}
      </div>

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 32px)', gap: 4 }}>
        {grid.map(({ date, inMonth }) => {
          const isToday = sameDay(date, today);
          const beforeMin = !!minD && date < minD;
          const disabled = beforeMin;
          const isStart = !!startD && sameDay(date, startD);
          const isDue = !!dueD && sameDay(date, dueD);
          /* In-range: between start and due, exclusive of endpoints. Range
             paints regardless of which picker is open. */
          const inRange = !!startD && !!dueD && date > startD && date < dueD;
          const selected = isStart || isDue;
          return (
            <DayCell
              key={date.toISOString()}
              date={date}
              isToday={isToday}
              inMonth={inMonth}
              disabled={disabled}
              isStart={isStart}
              isDue={isDue}
              inRange={inRange}
              selected={selected}
              onPick={() => !disabled && onPick(isoOf(date))}
            />
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 24, height: 24, borderRadius: 4, padding: 0,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--ds-text-subtle, #44546F)', fontSize: 14, lineHeight: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function DayCell({
  date, isToday, inMonth, disabled, isStart, isDue, inRange, selected, onPick,
}: {
  date: Date; isToday: boolean; inMonth: boolean; disabled: boolean;
  isStart: boolean; isDue: boolean; inRange: boolean; selected: boolean;
  onPick: () => void;
}) {
  const [hover, setHover] = useState(false);
  let bg = 'transparent';
  let color: string = inMonth ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-disabled, #A5ADBA)';
  if (disabled) color = 'var(--ds-text-disabled, #A5ADBA)';
  if (inRange) bg = 'var(--ds-background-selected, #E9F2FE)';
  if (selected) { bg = 'var(--ds-background-selected-bold, var(--ds-link, #0C66E4))'; color = 'var(--ds-text-inverse, #FFFFFF)'; }
  if (hover && !disabled && !selected) bg = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={isoOf(date)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32,
        background: bg, color,
        border: 'none',
        borderRadius: isStart || isDue ? '50%' : 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        fontFamily: 'var(--ds-font-family-body)',
        fontWeight: selected ? 600 : 400,
        padding: 0,
        textDecoration: isToday && !selected ? 'underline' : 'none',
        textUnderlineOffset: 2,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {date.getDate()}
    </button>
  );
}

/* ─────────────────────── date input field ───────────────────────── */

function DateInputField({
  value, placeholder, focused, onFocus, onClear, label,
}: {
  value: string | null;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onClear?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onFocus}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: 40, padding: '0 8px', boxSizing: 'border-box',
        border: `1px solid ${focused ? 'var(--ds-border-focused, #388BFF)' : 'var(--ds-border-input, #DFE1E6)'}`,
        borderRadius: 3,
        background: 'var(--ds-background-input, #FFFFFF)',
        cursor: 'pointer',
        fontFamily: 'var(--ds-font-family-body)',
        textAlign: 'left',
      }}
    >
      <span style={{
        fontSize: 14,
        color: value ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-subtlest, #626F86)',
      }}>
        {value ? formatHuman(value) : placeholder}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {value && onClear && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            onClick={e => { e.stopPropagation(); onClear(); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onClear(); } }}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--ds-background-neutral, #DDDEE1)',
              color: 'var(--ds-text-subtle, #44546F)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 11, lineHeight: 1,
            }}
          >
            ×
          </span>
        )}
        <span style={{ color: 'var(--ds-text-subtle, #42526E)', lineHeight: 0 }}>
          <CalendarIcon size={16} />
        </span>
      </span>
    </button>
  );
}

/* ─────────────────────── diff renderer ──────────────────────────── */

function DiffValue({ original, pending }: { original: string | null; pending: string | null }) {
  const orig = formatHuman(original);
  const next = formatHuman(pending);
  if (orig === next) {
    return (
      <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)' }}>
        {orig}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ds-font-family-body)', fontSize: 14 }}>
      <span style={{ color: 'var(--ds-text-subtle, #44546F)', textDecoration: 'line-through' }}>{orig}</span>
      <span style={{ color: 'var(--ds-text-subtle, #44546F)' }}>→</span>
      <span style={{ color: 'var(--ds-text, #172B4D)' }}>{next}</span>
    </span>
  );
}

/* ─────────────────────────── modal ──────────────────────────────── */

export function ProductEditDatesModal({
  issue, onClose, onSave,
}: {
  issue: TimelineIssue;
  onClose: () => void;
  onSave: (startDate: string | null, dueDate: string | null) => Promise<void>;
}) {
  const [startIso, setStartIso] = useState<string | null>(issue.startDate);
  const [dueIso, setDueIso] = useState<string | null>(issue.dueDate);
  const [focused, setFocused] = useState<'start' | 'due' | null>(null);
  const [saving, setSaving] = useState(false);

  const startBtnRef = useRef<HTMLDivElement>(null);
  const dueBtnRef = useRef<HTMLDivElement>(null);

  /* Close calendar when clicking outside both inputs + portal. */
  useEffect(() => {
    if (focused === null) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t) return;
      if (t.closest('[data-pedm-calendar="true"]')) return;
      if (startBtnRef.current?.contains(t as Node)) return;
      if (dueBtnRef.current?.contains(t as Node)) return;
      setFocused(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [focused]);

  const pickStart = useCallback((iso: string) => {
    setStartIso(iso);
    /* If new start is after the current due, push due to null so the user
       re-picks. Prevents an invalid range from existing for any frame. */
    if (dueIso && parseIso(iso)! > parseIso(dueIso)!) setDueIso(null);
    setFocused(null);
  }, [dueIso]);

  const pickDue = useCallback((iso: string) => {
    setDueIso(iso);
    setFocused(null);
  }, []);

  const changed = startIso !== issue.startDate || dueIso !== issue.dueDate;
  const invalid = !!startIso && !!dueIso && parseIso(startIso)! > parseIso(dueIso)!;

  const handleSave = async () => {
    if (!changed || invalid) return;
    setSaving(true);
    try { await onSave(startIso, dueIso); }
    catch (err) { console.warn('save dates failed:', err); }
    finally { setSaving(false); onClose(); }
  };

  const calendarFor = (which: 'start' | 'due', anchor: React.RefObject<HTMLDivElement | null>) => {
    if (focused !== which || !anchor.current) return null;
    const rect = anchor.current.getBoundingClientRect();
    return createPortal(
      <div
        data-pedm-calendar="true"
        style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, zIndex: 10001 }}
      >
        <RangeCalendar
          pickedFor={which}
          startIso={startIso}
          dueIso={dueIso}
          minDate={which === 'due' ? startIso : null}
          onPick={which === 'start' ? pickStart : pickDue}
        />
      </div>,
      document.body,
    );
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader>
          <ModalTitle>Edit Dates</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{
            fontSize: 14,
            color: 'var(--ds-text, #172B4D)',
            fontFamily: 'var(--ds-font-family-body)',
            marginBottom: 16,
          }}>
            Leave the date fields blank to{' '}
            <span style={{ color: 'var(--ds-link, #0052CC)', textDecoration: 'underline' }}>
              infer dates from the issue's sprint assignment.
            </span>
          </div>

          {/* summary card with diff */}
          <div style={{
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6, padding: 16, marginBottom: 16,
            fontFamily: 'var(--ds-font-family-body)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <JiraIssueTypeIcon type={issue.issueType} size={16} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                {issue.issueKey}
              </span>
              <span style={{
                fontSize: 14, color: 'var(--ds-text, #172B4D)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {issue.summary}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 }}>
                  Start date
                </div>
                <DiffValue original={issue.startDate} pending={startIso} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 }}>
                  Due date
                </div>
                <DiffValue original={issue.dueDate} pending={dueIso} />
              </div>
            </div>
          </div>

          {/* editable inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div ref={startBtnRef}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4,
                fontFamily: 'var(--ds-font-family-body)',
              }}>Start date</label>
              <DateInputField
                value={startIso}
                placeholder="None"
                focused={focused === 'start'}
                onFocus={() => setFocused(f => f === 'start' ? null : 'start')}
                onClear={() => setStartIso(null)}
                label="Start date"
              />
            </div>
            <div ref={dueBtnRef}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4,
                fontFamily: 'var(--ds-font-family-body)',
              }}>Due date</label>
              <DateInputField
                value={dueIso}
                placeholder="None"
                focused={focused === 'due'}
                onFocus={() => setFocused(f => f === 'due' ? null : 'due')}
                onClear={() => setDueIso(null)}
                label="Due date"
              />
            </div>
          </div>

          {invalid && (
            <div style={{
              marginTop: 8, fontSize: 12,
              color: 'var(--ds-text-danger, #AE2A19)',
              fontFamily: 'var(--ds-font-family-body)',
            }}>
              Due date must be on or after start date.
            </div>
          )}

          {calendarFor('start', startBtnRef)}
          {calendarFor('due', dueBtnRef)}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose} isDisabled={saving}>Cancel</Button>
          <Button appearance="primary" onClick={handleSave} isDisabled={!changed || invalid || saving}>
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}

export default ProductEditDatesModal;

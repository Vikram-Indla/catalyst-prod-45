/**
 * CreateReminderModal — "+ Add reminder" modal from Later header.
 * Same When/Time pickers as ReminderModal + a Description editor toolbar.
 * Save disabled until description is non-empty.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BoldIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronLeftDoubleIcon,
  ChevronRightIcon,
  ChevronRightDoubleIcon,
  ClockIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  ListOrderedIcon,
  QuoteIcon,
  StrikethroughIcon,
  UnderlineIcon,
  XIcon,
} from '../shared/Icon';
import {
  buildMonthGrid,
  buildTimeSlots,
  formatRelativeDate,
  isFutureOrSameDay,
  isSameDay,
  MONTH_LABELS,
  WEEKDAY_LABELS,
} from '../Schedule/scheduleHelpers';

interface CreateReminderModalProps {
  onCancel: () => void;
  onSave: (input: { reminderText: string; remindAtIso: string }) => void;
}

const TIME_SLOTS = buildTimeSlots();

function findClosestSlot(now: Date): string {
  const total = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil((total + 15) / 15) * 15;
  const h = Math.floor((rounded % (24 * 60)) / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function CreateReminderModal({ onCancel, onSave }: CreateReminderModalProps) {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [time, setTime] = useState<string>(() => findClosestSlot(now));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [text, setText] = useState('');
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const canSave = text.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const [h, m] = time.split(':').map(Number);
    const final = new Date(selectedDate);
    final.setHours(h, m, 0, 0);
    onSave({ reminderText: text.trim(), remindAtIso: final.toISOString() });
  };

  const fmt = (cmd: string) => {
    document.execCommand(cmd, false);
    if (textRef.current) setText(textRef.current.innerText);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add reminder"
      data-cv2-reminder-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cv2-bg-overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 'var(--cv2-modal-z, 1000)' as any,
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 600,
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 'var(--ds-font-size-700)', fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
            Reminder
          </div>
          <button type="button" onClick={onCancel} aria-label="Close" style={closeBtnStyle()}>
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>
          <Field label="When">
            <PickerButton
              icon={<CalendarIcon size={15} />}
              label={formatRelativeDate(selectedDate, now)}
              active={showCalendar}
              onClick={() => { setShowCalendar(v => !v); setShowTime(false); }}
            />
            {showCalendar && (
              <CalendarPopover
                selected={selectedDate}
                today={now}
                onSelect={d => { setSelectedDate(d); setShowCalendar(false); }}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </Field>
          <Field label="Time">
            <PickerButton
              icon={<ClockIcon size={15} />}
              label={TIME_SLOTS.find(s => s.value === time)?.label ?? time}
              active={showTime}
              onClick={() => { setShowTime(v => !v); setShowCalendar(false); }}
            />
            {showTime && (
              <TimeDropdown
                value={time}
                onSelect={v => { setTime(v); setShowTime(false); }}
                onClose={() => setShowTime(false)}
              />
            )}
          </Field>
        </div>

        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 700,
              color: 'var(--cv2-text-strong)',
              marginBottom: 6,
            }}
          >
            Description
          </div>
          <div
            style={{
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-sm)',
              background: 'var(--cv2-bg-input)',
              overflow: 'hidden',
            }}
          >
            <div
              role="toolbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '6px 8px',
                borderBottom: '1px solid var(--cv2-border)',
              }}
            >
              <FmtBtn label="Bold" onClick={() => fmt('bold')}><BoldIcon size={14} /></FmtBtn>
              <FmtBtn label="Italic" onClick={() => fmt('italic')}><ItalicIcon size={14} /></FmtBtn>
              <FmtBtn label="Underline" onClick={() => fmt('underline')}><UnderlineIcon size={14} /></FmtBtn>
              <FmtBtn label="Strikethrough" onClick={() => fmt('strikeThrough')}><StrikethroughIcon size={14} /></FmtBtn>
              <Divider />
              <FmtBtn label="Link" onClick={() => {
                const url = prompt('Link URL');
                if (url) document.execCommand('createLink', false, url);
                if (textRef.current) setText(textRef.current.innerText);
              }}><LinkIcon size={14} /></FmtBtn>
              <FmtBtn label="Ordered list" onClick={() => fmt('insertOrderedList')}><ListOrderedIcon size={14} /></FmtBtn>
              <FmtBtn label="Bullet list" onClick={() => fmt('insertUnorderedList')}><ListBulletIcon size={14} /></FmtBtn>
              <FmtBtn label="Quote" onClick={() => fmt('formatBlock')}><QuoteIcon size={14} /></FmtBtn>
              <FmtBtn label="Code" onClick={() => document.execCommand('formatBlock', false, 'pre')}><CodeIcon size={14} /></FmtBtn>
            </div>
            <div
              ref={textRef}
              role="textbox"
              aria-label="Reminder description"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Remind me to…"
              onInput={e => setText((e.currentTarget as HTMLDivElement).innerText)}
              style={{
                minHeight: 80,
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: 'var(--ds-font-size-400)',
                color: 'var(--cv2-text)',
                outline: 'none',
              }}
            />
          </div>
          <style>{`
            [data-placeholder]:empty::before {
              content: attr(data-placeholder);
              color: var(--cv2-text-muted);
              pointer-events: none;
            }
          `}</style>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handleSave} disabled={!canSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FmtBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" style={{ width: 1, height: 16, background: 'var(--cv2-divider)', margin: '0 4px' }} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--cv2-text-strong)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function PickerButton({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
        height: 40,
        padding: '0 12px',
        background: 'var(--cv2-bg-input)',
        color: 'var(--cv2-text)',
        border: active ? '1px solid var(--cv2-accent)' : '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--cv2-text-subtle)' }}>{icon}</span>
        <span>{label}</span>
      </span>
      <ChevronDownIcon size={12} style={{ color: 'var(--cv2-text-subtle)' }} />
    </button>
  );
}

function CalendarPopover({
  selected, today, onSelect, onClose,
}: {
  selected: Date; today: Date; onSelect: (d: Date) => void; onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const grid = buildMonthGrid(viewYear, viewMonth);

  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Pick a date"
      style={{
        position: 'absolute',
        top: 78,
        left: 0,
        width: 280,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: 12,
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <NavBtn label="Previous year" onClick={() => setViewYear(y => y - 1)}>
            <ChevronLeftDoubleIcon size={14} />
          </NavBtn>
          <NavBtn label="Previous month" onClick={() => {
            let m = viewMonth - 1; let y = viewYear;
            if (m < 0) { m = 11; y -= 1; }
            setViewMonth(m); setViewYear(y);
          }}>
            <ChevronLeftIcon size={14} />
          </NavBtn>
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
          {MONTH_LABELS[viewMonth]} {viewYear}
        </div>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <NavBtn label="Next month" onClick={() => {
            let m = viewMonth + 1; let y = viewYear;
            if (m > 11) { m = 0; y += 1; }
            setViewMonth(m); setViewYear(y);
          }}>
            <ChevronRightIcon size={14} />
          </NavBtn>
          <NavBtn label="Next year" onClick={() => setViewYear(y => y + 1)}>
            <ChevronRightDoubleIcon size={14} />
          </NavBtn>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 'var(--ds-font-size-100)', color: 'var(--cv2-text-muted)', fontWeight: 600, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {grid.map((cell, idx) => {
          if (!cell.date) return <div key={idx} style={{ aspectRatio: '1 / 1' }} />;
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          const leftNeighborEmpty = col === 0 ? true : !grid[idx - 1]?.date;
          const upNeighborEmpty = row === 0 ? true : !grid[idx - 7]?.date;
          const isSel = isSameDay(cell.date, selected);
          const allowed = isFutureOrSameDay(cell.date, today);
          const isToday = isSameDay(cell.date, today);
          return (
            <div
              key={idx}
              style={{
                aspectRatio: '1 / 1',
                position: 'relative',
                borderRight: '1px solid var(--cv2-border)',
                borderBottom: '1px solid var(--cv2-border)',
                borderTop: upNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
                borderLeft: leftNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
              }}
            >
              <button
                type="button"
                disabled={!allowed}
                onClick={() => onSelect(cell.date!)}
                aria-pressed={isSel}
                style={{
                  position: 'absolute',
                  inset: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSel ? 'var(--ds-link)' : 'transparent',
                  color: !allowed
                    ? 'var(--cv2-text-muted)'
                    : isSel
                      ? 'var(--ds-surface)'
                      : isToday
                        ? 'var(--cv2-accent)'
                        : 'var(--cv2-text)',
                  border: isSel
                    ? '2px solid var(--cv2-accent)'
                    : isToday
                      ? '2px solid var(--cv2-accent)'
                      : '2px solid transparent',
                  borderRadius: isSel ? 6 : isToday ? '50%' : 6,
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: isSel || isToday ? 700 : 400,
                  cursor: allowed ? 'pointer' : 'not-allowed',
                  transition: 'background var(--cv2-transition-fast)',
                }}
                onMouseEnter={e => {
                  if (allowed && !isSel && !isToday) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSel && !isToday) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                {cell.date.getDate()}
              </button>
            </div>
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
      onClick={onClick}
      aria-label={label}
      style={{
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function TimeDropdown({ value, onSelect, onClose }: { value: string; onSelect: (v: string) => void; onClose: () => void }) {
  const popRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  useEffect(() => { selectedRef.current?.scrollIntoView({ block: 'center' }); }, []);

  return (
    <div
      ref={popRef}
      role="listbox"
      aria-label="Pick a time"
      style={{
        position: 'absolute',
        top: 78,
        left: 0,
        right: 0,
        maxHeight: 260,
        overflowY: 'auto',
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: '4px 0',
        zIndex: 'var(--cv2-popover-z, 1100)' as any,
      }}
    >
      {TIME_SLOTS.map(s => {
        const sel = s.value === value;
        return (
          <button
            key={s.value}
            ref={sel ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={sel}
            onClick={() => onSelect(s.value)}
            onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
            onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '6px 16px',
              background: sel ? 'var(--cv2-accent)' : 'transparent',
              color: sel ? 'var(--ds-text-inverse)' : 'var(--cv2-text)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'var(--ds-font-size-300)',
            }}
          >
            {sel && '✓ '}{s.label}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 36,
        padding: '0 18px',
        background: disabled ? 'var(--cv2-bg-row-hover)' : 'var(--cv2-success)',
        color: disabled ? 'var(--cv2-text-muted)' : 'var(--ds-text-inverse)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 18px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function closeBtnStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--cv2-text-subtle)',
    border: 'none',
    borderRadius: 'var(--cv2-radius-sm)',
    cursor: 'pointer',
  };
}

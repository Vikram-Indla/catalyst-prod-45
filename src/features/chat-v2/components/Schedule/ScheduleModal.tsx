import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronLeftDoubleIcon,
  ChevronRightIcon,
  ChevronRightDoubleIcon,
  ClockIcon,
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
} from './scheduleHelpers';

interface ScheduleModalProps {
  onCancel: () => void;
  onConfirm: (iso: string) => void;
}

const TIME_SLOTS = buildTimeSlots();

export function ScheduleModal({ onCancel, onConfirm }: ScheduleModalProps) {
  const initialNow = new Date();
  const default9am = new Date(initialNow);
  default9am.setHours(9, 0, 0, 0);
  if (default9am.getTime() <= initialNow.getTime()) {
    default9am.setDate(default9am.getDate() + 1);
  }

  const [selectedDate, setSelectedDate] = useState<Date>(default9am);
  const [time, setTime] = useState<string>('09:00');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const handleConfirm = () => {
    const [h, m] = time.split(':').map(Number);
    const final = new Date(selectedDate);
    final.setHours(h, m, 0, 0);
    onConfirm(final.toISOString());
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Schedule message"
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
          width: 520,
          background: 'var(--cv2-bg-modal)',
          border: '1px solid var(--cv2-border-strong)',
          borderRadius: 'var(--cv2-radius-lg)',
          boxShadow: 'var(--cv2-shadow-modal)',
          fontFamily: 'var(--cv2-font)',
          color: 'var(--cv2-text)',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
              Schedule message
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--cv2-text-muted)' }}>
              Time zone: {tz}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
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
          >
            <XIcon size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <PickerButton
              icon={<CalendarIcon size={15} />}
              label={formatRelativeDate(selectedDate, initialNow)}
              active={showCalendar}
              onClick={() => { setShowCalendar(v => !v); setShowTimeDropdown(false); }}
            />
            {showCalendar && (
              <CalendarPopover
                selected={selectedDate}
                today={initialNow}
                onSelect={d => { setSelectedDate(d); setShowCalendar(false); }}
                onClose={() => setShowCalendar(false)}
              />
            )}
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <PickerButton
              icon={<ClockIcon size={15} />}
              label={TIME_SLOTS.find(s => s.value === time)?.label ?? time}
              active={showTimeDropdown}
              onClick={() => { setShowTimeDropdown(v => !v); setShowCalendar(false); }}
            />
            {showTimeDropdown && (
              <TimeDropdown
                value={time}
                onSelect={v => { setTime(v); setShowTimeDropdown(false); }}
                onClose={() => setShowTimeDropdown(false)}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={handleConfirm}>Schedule Message</PrimaryBtn>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PickerButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
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
        height: 38,
        padding: '0 12px',
        background: 'var(--cv2-bg-input)',
        color: 'var(--cv2-text)',
        border: active ? '1px solid var(--cv2-accent)' : '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
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
  selected,
  today,
  onSelect,
  onClose,
}: {
  selected: Date;
  today: Date;
  onSelect: (d: Date) => void;
  onClose: () => void;
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
        top: 44,
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
      <CalendarHeader
        year={viewYear}
        month={viewMonth}
        onShift={(dy, dm) => {
          let y = viewYear + dy;
          let m = viewMonth + dm;
          if (m < 0) { m = 11; y -= 1; }
          if (m > 11) { m = 0; y += 1; }
          setViewYear(y);
          setViewMonth(m);
        }}
      />
      <CalendarGrid
        grid={grid}
        selected={selected}
        today={today}
        onSelect={onSelect}
      />
    </div>
  );
}

function CalendarHeader({
  year,
  month,
  onShift,
}: {
  year: number;
  month: number;
  onShift: (dy: number, dm: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'inline-flex', gap: 4 }}>
        <NavBtn label="Previous year" onClick={() => onShift(-1, 0)}>
          <ChevronLeftDoubleIcon size={14} />
        </NavBtn>
        <NavBtn label="Previous month" onClick={() => onShift(0, -1)}>
          <ChevronLeftIcon size={14} />
        </NavBtn>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cv2-text-strong)' }}>
        {MONTH_LABELS[month]} {year}
      </div>
      <div style={{ display: 'inline-flex', gap: 4 }}>
        <NavBtn label="Next month" onClick={() => onShift(0, 1)}>
          <ChevronRightIcon size={14} />
        </NavBtn>
        <NavBtn label="Next year" onClick={() => onShift(1, 0)}>
          <ChevronRightDoubleIcon size={14} />
        </NavBtn>
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

function CalendarGrid({
  grid,
  selected,
  today,
  onSelect,
  futureOnly = true,
}: {
  grid: ReturnType<typeof buildMonthGrid>;
  selected: Date;
  today: Date;
  onSelect: (d: Date) => void;
  futureOnly?: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map(d => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--cv2-text-muted)',
              fontWeight: 600,
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {grid.map((cell, idx) => {
          if (!cell.date) return <div key={idx} />;
          const isSel = isSameDay(cell.date, selected);
          const allowed = futureOnly ? isFutureOrSameDay(cell.date, today) : true;
          const isToday = isSameDay(cell.date, today);
          return (
            <button
              key={idx}
              type="button"
              disabled={!allowed}
              onClick={() => onSelect(cell.date!)}
              aria-pressed={isSel}
              aria-label={cell.date.toDateString()}
              style={{
                aspectRatio: '1 / 1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSel ? 'var(--cv2-accent)' : 'transparent',
                color: !allowed
                  ? 'var(--cv2-text-muted)'
                  : isSel
                    ? 'var(--ds-surface, #FFFFFF)'
                    : 'var(--cv2-text)',
                border: isToday && !isSel ? '1px solid var(--cv2-accent)' : 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: isSel ? 700 : 400,
                cursor: allowed ? 'pointer' : 'not-allowed',
                transition: 'background var(--cv2-transition-fast)',
              }}
              onMouseEnter={e => {
                if (allowed && !isSel) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
              }}
              onMouseLeave={e => {
                if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeDropdown({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div
      ref={popRef}
      role="listbox"
      aria-label="Pick a time"
      style={{
        position: 'absolute',
        top: 44,
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
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '6px 16px',
              background: sel ? 'var(--cv2-accent)' : 'transparent',
              color: sel ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cv2-text)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
            onMouseEnter={e => {
              if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
            }}
            onMouseLeave={e => {
              if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {sel && '✓ '}{s.label}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 16px',
        background: 'var(--cv2-success)',
        color: 'var(--ds-text-inverse, #FFFFFF)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
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
        padding: '0 16px',
        background: 'transparent',
        color: 'var(--cv2-text)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-sm)',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

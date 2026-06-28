/**
 * CustomDateRangeDialog — modal for picking a custom summarize date range.
 * Two side-by-side calendar months (current + next), start/end inputs,
 * future dates disabled. Mirrors Slack AI's range picker (images #207-208).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from '../shared/Icon';

interface CustomDateRangeDialogProps {
  onClose: () => void;
  onSubmit: (range: { start: string; end: string }) => void;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseISO(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CustomDateRangeDialog({ onClose, onSubmit }: CustomDateRangeDialogProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayPlaceholder = useMemo(() => toISO(today), [today]);
  // Anchor month for the LEFT calendar. Default to the current month so the
  // right calendar shows the next month.
  const [anchor, setAnchor] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const [startInput, setStartInput] = useState<string>('');
  const [endInput, setEndInput] = useState<string>('');

  // Sync free-text inputs <-> selected dates.
  useEffect(() => { setStartInput(start ? toISO(start) : ''); }, [start]);
  useEffect(() => { setEndInput(end ? toISO(end) : ''); }, [end]);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const handleDayClick = (d: Date) => {
    if (d.getTime() > today.getTime()) return; // future blocked
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
      return;
    }
    // start exists, end null
    if (d.getTime() < start.getTime()) {
      // user picked an earlier date — flip
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
  };

  const handleClear = () => {
    setStart(null);
    setEnd(null);
    setStartInput('');
    setEndInput('');
  };

  const canSubmit = !!start && !!end;
  const rightAnchor = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);

  const canGoForward =
    rightAnchor.getFullYear() < today.getFullYear() ||
    (rightAnchor.getFullYear() === today.getFullYear() && rightAnchor.getMonth() < today.getMonth());

  return createPortal(
    <div
      role="presentation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8, 9, 12, 0.55)', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Summarize custom date range"
        style={{
          width: 'min(940px, 100%)',
          background: 'var(--cv2-bg-panel)',
          color: 'var(--cv2-text)',
          borderRadius: 12,
          boxShadow: '0 24px 60px var(--ds-shadow-raised, rgba(0,0,0,0.45))',
          fontFamily: 'var(--cv2-font)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
          }}
        >
          <div style={{ fontSize: 'var(--ds-font-size-800)', fontWeight: 800, color: 'var(--cv2-text-strong)' }}>
            Summarize custom date range
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--cv2-radius-sm)',
              color: 'var(--cv2-text-subtle)',
              cursor: 'pointer',
            }}
          >
            <XIcon size={18} />
          </button>
        </header>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '0 24px 12px' }}>
          <DateInput
            label="Start date"
            placeholder={`Start date (ex. ${todayPlaceholder})`}
            value={startInput}
            onChange={setStartInput}
            onCommit={() => {
              const d = parseISO(startInput);
              if (d && d.getTime() <= today.getTime()) {
                setStart(d);
                if (end && d.getTime() > end.getTime()) setEnd(null);
              } else {
                setStartInput(start ? toISO(start) : '');
              }
            }}
            focused={!start}
          />
          <DateInput
            label="End date"
            placeholder={`End date (ex. ${todayPlaceholder})`}
            value={endInput}
            onChange={setEndInput}
            onCommit={() => {
              const d = parseISO(endInput);
              if (d && d.getTime() <= today.getTime() && (!start || d.getTime() >= start.getTime())) {
                setEnd(d);
              } else {
                setEndInput(end ? toISO(end) : '');
              }
            }}
          />
        </div>

        {/* Calendars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            padding: '8px 24px 16px',
            position: 'relative',
          }}
        >
          <CalendarNavButton
            side="left"
            onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth() - 1, 1))}
          />
          <CalendarMonth
            anchor={anchor}
            today={today}
            start={start}
            end={end}
            hover={hover}
            onPick={handleDayClick}
            onHover={setHover}
          />
          <CalendarMonth
            anchor={rightAnchor}
            today={today}
            start={start}
            end={end}
            hover={hover}
            onPick={handleDayClick}
            onHover={setHover}
          />
          {canGoForward && (
            <CalendarNavButton
              side="right"
              onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth() + 1, 1))}
            />
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px 20px',
            borderTop: '1px solid var(--cv2-divider)',
          }}
        >
          <button
            type="button"
            onClick={handleClear}
            disabled={!start && !end}
            style={{
              background: 'transparent',
              border: 'none',
              color: !start && !end ? 'var(--cv2-text-muted)' : 'var(--ds-link, #0C66E4)',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 600,
              cursor: !start && !end ? 'default' : 'pointer',
            }}
          >
            Clear selection
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                color: 'var(--cv2-text-strong)',
                border: '1px solid var(--cv2-border-strong)',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => {
                if (start && end) onSubmit({ start: toISO(start), end: toISO(end) });
              }}
              style={{
                background: canSubmit ? '#007A5A' : 'var(--ds-surface, rgba(255,255,255,0.08))',
                color: canSubmit ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--cv2-text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'default',
              }}
            >
              Summarize
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function DateInput({
  label,
  placeholder,
  value,
  onChange,
  onCommit,
  focused,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  focused?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const showRing = isFocused || (focused && !value);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '0 12px',
        border: `1px solid ${showRing ? 'var(--ds-link, #0C66E4)' : 'var(--cv2-border-strong)'}`,
        borderRadius: 6,
        background: 'transparent',
      }}
    >
      <CalendarIcon size={16} />
      <input
        aria-label={label}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => { setIsFocused(false); onCommit(); }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--cv2-text)',
          fontSize: 'var(--ds-font-size-400)',
          fontFamily: 'var(--cv2-font)',
        }}
      />
    </div>
  );
}

function CalendarNavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous month' : 'Next month'}
      style={{
        position: 'absolute',
        top: 6,
        [side]: 24,
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        color: 'var(--cv2-text-subtle)',
        cursor: 'pointer',
      } as React.CSSProperties}
    >
      {side === 'left' ? <ChevronLeftIcon size={18} /> : <ChevronRightIcon size={18} />}
    </button>
  );
}

function CalendarMonth({
  anchor,
  today,
  start,
  end,
  hover,
  onPick,
  onHover,
}: {
  anchor: Date;
  today: Date;
  start: Date | null;
  end: Date | null;
  hover: Date | null;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
}) {
  const monthLabel = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  // Build a grid where blanks for days outside the month are not rendered
  // as cells (no border, no hover) — only weekday alignment is preserved.
  const firstDow = anchor.getDay();
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div onMouseLeave={() => onHover(null)}>
      <div
        style={{
          textAlign: 'center',
          fontSize: 'var(--ds-font-size-500)',
          fontWeight: 700,
          padding: '6px 0 10px',
          color: 'var(--cv2-text-strong)',
        }}
      >
        {monthLabel}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0,
          paddingBottom: 6,
          color: 'var(--cv2-text-muted)',
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        {WEEKDAYS.map(w => <div key={w} style={{ padding: '4px 0' }}>{w}</div>)}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0,
        }}
      >
        {cells.map((d, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const leftNeighborEmpty = col === 0 ? true : !cells[i - 1];
          const upNeighborEmpty = row === 0 ? true : !cells[i - 7];
          return (
            <DayCell
              key={i}
              date={d}
              today={today}
              start={start}
              end={end}
              hover={hover}
              leftNeighborEmpty={leftNeighborEmpty}
              upNeighborEmpty={upNeighborEmpty}
              onPick={onPick}
              onHover={onHover}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  date,
  today,
  start,
  end,
  hover,
  leftNeighborEmpty,
  upNeighborEmpty,
  onPick,
  onHover,
}: {
  date: Date | null;
  today: Date;
  start: Date | null;
  end: Date | null;
  hover: Date | null;
  leftNeighborEmpty: boolean;
  upNeighborEmpty: boolean;
  onPick: (d: Date) => void;
  onHover: (d: Date | null) => void;
}) {
  // Blank slot for days outside the month — no border, no interaction.
  if (!date) return <div style={{ aspectRatio: '1 / 1' }} />;

  const isFuture = date.getTime() > today.getTime();
  const isStart = !!start && sameDay(date, start);
  const isEnd = !!end && sameDay(date, end);
  const isToday = sameDay(date, today);

  // Confirmed range (start + end both set).
  const inConfirmedRange =
    !!start && !!end && date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  // Preview range while picking the end date (start set, end null, hovering).
  const inPreviewRange =
    !!start &&
    !end &&
    !!hover &&
    !isFuture &&
    ((date.getTime() >= start.getTime() && date.getTime() <= hover.getTime()) ||
      (date.getTime() <= start.getTime() && date.getTime() >= hover.getTime()));
  const isHoverEnd = !!start && !end && !!hover && sameDay(date, hover) && !isFuture;
  const isEndpoint = isStart || isEnd || isHoverEnd;
  const isInRange = inConfirmedRange || inPreviewRange;

  // Slack-style: each rendered day cell carries a faint grid border. Blanks
  // skip rendering entirely so months don't show ghost cells.
  const cellWrapper: React.CSSProperties = {
    aspectRatio: '1 / 1',
    position: 'relative',
    borderRight: '1px solid var(--cv2-border)',
    borderBottom: '1px solid var(--cv2-border)',
    borderTop: upNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
    borderLeft: leftNeighborEmpty ? '1px solid var(--cv2-border)' : 'none',
  };

  // Cell-filling background for range / hover-range cells.
  let cellFill = 'transparent';
  if (isInRange && !isEndpoint) cellFill = 'rgba(29, 155, 209, 0.18)'; // ads-scanner:ignore-line — intentional design color, no ADS token equivalent

  // Inner button: round endpoints (covers full cell when selected),
  // circle for today indicator, otherwise plain text.
  let buttonBackground = 'transparent';
  let buttonColor: string = 'var(--cv2-text)';
  let buttonBorder = '2px solid transparent';
  let buttonRadius: string | number = 6;

  if (isEndpoint) {
    buttonBackground = 'var(--ds-link, #0065FF)';
    buttonColor = 'var(--ds-surface, #FFFFFF)';
    buttonBorder = '2px solid var(--ds-link, #0C66E4)';
    buttonRadius = 6;
  } else if (isToday) {
    buttonBorder = '2px solid var(--ds-link, #0C66E4)';
    buttonColor = 'var(--ds-link, #0C66E4)';
    buttonRadius = '50%';
  } else if (isInRange) {
    buttonColor = 'var(--cv2-text-strong)';
  }

  if (isFuture) {
    buttonColor = 'var(--cv2-text-muted)';
    buttonBackground = 'transparent';
    cellFill = 'transparent';
  }

  return (
    <div
      style={{ ...cellWrapper, background: cellFill }}
      onMouseEnter={() => { if (!isFuture) onHover(date); }}
    >
      <button
        type="button"
        disabled={isFuture}
        onClick={() => onPick(date)}
        aria-label={`${date.toDateString()}${isFuture ? ' (future, disabled)' : ''}`}
        style={{
          position: 'absolute',
          inset: 3,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: buttonBackground,
          color: buttonColor,
          border: buttonBorder,
          borderRadius: buttonRadius,
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: isEndpoint || isToday ? 700 : 500,
          cursor: isFuture ? 'not-allowed' : 'pointer',
          opacity: isFuture ? 0.45 : 1,
          transition: 'background var(--cv2-transition-fast)',
        }}
        onMouseEnter={e => {
          if (!isEndpoint && !isFuture && !isInRange && !isToday) {
            (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          }
        }}
        onMouseLeave={e => {
          if (!isEndpoint && !isFuture && !isInRange && !isToday) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }
        }}
      >
        {date.getDate()}
      </button>
    </div>
  );
}

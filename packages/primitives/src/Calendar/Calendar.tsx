import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "@catylast/icons";

import { cx } from "../utils/classNames";
import * as styles from "./Calendar.css";
import {
  addDays,
  addMonths,
  buildGrid,
  compareDays,
  formatISO,
  getDayAriaLabel,
  getDayLabels,
  getMonthLabel,
  getToday,
  isInRange,
  isSameDay,
  parseISO,
  type CalendarCell,
  type Ymd,
} from "./dateUtils";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type CalendarSize = "small" | "medium" | "large";

export type CalendarSelectEvent = {
  /** ISO date string (YYYY-MM-DD). */
  iso: string;
  year: number;
  /** Zero-indexed (Jan = 0). */
  month: number;
  day: number;
};

export type CalendarChangeEvent = CalendarSelectEvent & {
  type: "navigate" | "focus";
};

export type CalendarProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onSelect" | "onChange" | "onFocus" | "onBlur"
> & {
  // ---------- position (controlled) ----------
  /** Visible month — controlled. Pair with `year`. Zero-indexed. */
  month?: number;
  /** Visible year — controlled. Pair with `month`. */
  year?: number;
  /** Initially-focused day (1-31). Defaults to today's day if today is in view, else 1. */
  day?: number;
  /** Default month (uncontrolled). */
  defaultMonth?: number;
  /** Default year (uncontrolled). */
  defaultYear?: number;
  /** Default focused day (uncontrolled). */
  defaultDay?: number;

  // ---------- selection ----------
  /** Array of ISO date strings to highlight as selected. */
  selected?: string[];
  /** Array of ISO date strings shown as previously-selected (muted dot). */
  previouslySelected?: string[];
  /** Array of ISO date strings to render as disabled / unselectable. */
  disabled?: string[];

  // ---------- range constraints ----------
  /** Earliest selectable date (ISO). */
  minDate?: string;
  /** Latest selectable date (ISO). */
  maxDate?: string;

  // ---------- locale & layout ----------
  /** 0 = Sunday, 1 = Monday, …, 6 = Saturday. @default 0 */
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** BCP-47 locale tag. @default "en-US" */
  locale?: string;
  /** Override "today" — useful for tests / time-travel demos. ISO date. */
  today?: string;

  // ---------- visual ----------
  /** Size scale. @default "medium" */
  size?: CalendarSize;

  // ---------- callbacks ----------
  /** Called when the user picks a date (click or Enter). */
  onSelect?: (event: CalendarSelectEvent) => void;
  /** Called whenever the focused / visible date changes (nav, arrow keys). */
  onChange?: (event: CalendarChangeEvent) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;

  /** Replace the default ⟨ / ⟩ navigation glyphs. */
  prevMonthIcon?: ReactNode;
  nextMonthIcon?: ReactNode;
  /** Custom labels for the prev/next month buttons (becomes `aria-label`). */
  prevMonthLabel?: string;
  nextMonthLabel?: string;
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function setHas(set: Set<string>, ymd: Ymd): boolean {
  return set.has(formatISO(ymd));
}

/** Clamp a date to [min, max] inclusive. */
function clampDate(d: Ymd, min: Ymd | null, max: Ymd | null): Ymd {
  if (min && compareDays(d, min) < 0) return min;
  if (max && compareDays(d, max) > 0) return max;
  return d;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  function Calendar(
    {
      month,
      year,
      day,
      defaultMonth,
      defaultYear,
      defaultDay,
      selected,
      previouslySelected,
      disabled,
      minDate,
      maxDate,
      weekStartDay = 0,
      locale = "en-US",
      today: todayProp,
      size = "medium",
      onSelect,
      onChange,
      onFocus,
      onBlur,
      prevMonthIcon,
      nextMonthIcon,
      prevMonthLabel,
      nextMonthLabel,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    // ---------- "today" ----------
    const today = useMemo<Ymd>(() => {
      if (todayProp) {
        const parsed = parseISO(todayProp);
        if (parsed) return parsed;
      }
      return getToday();
    }, [todayProp]);

    // ---------- focused date (the cell that has tabindex=0) ----------
    const isControlled =
      month !== undefined && year !== undefined && day !== undefined;
    const [internalFocus, setInternalFocus] = useState<Ymd>(() => ({
      year: defaultYear ?? today.year,
      month: defaultMonth ?? today.month,
      day: defaultDay ?? today.day,
    }));
    const focused: Ymd = isControlled
      ? { year: year as number, month: month as number, day: day as number }
      : internalFocus;

    // ---------- ISO sets for fast lookup ----------
    const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);
    const previousSet = useMemo(
      () => new Set(previouslySelected ?? []),
      [previouslySelected],
    );
    const disabledSet = useMemo(() => new Set(disabled ?? []), [disabled]);

    const minYmd = useMemo(() => (minDate ? parseISO(minDate) : null), [minDate]);
    const maxYmd = useMemo(() => (maxDate ? parseISO(maxDate) : null), [maxDate]);

    // ---------- grid for the visible month ----------
    const grid = useMemo<CalendarCell[]>(
      () => buildGrid(focused.year, focused.month, weekStartDay),
      [focused.year, focused.month, weekStartDay],
    );

    const dayLabelsNarrow = useMemo(
      () => getDayLabels(weekStartDay, locale, "narrow"),
      [weekStartDay, locale],
    );
    const dayLabelsLong = useMemo(
      () => getDayLabels(weekStartDay, locale, "long"),
      [weekStartDay, locale],
    );

    const monthLabelText = useMemo(
      () => getMonthLabel(focused.year, focused.month, locale),
      [focused.year, focused.month, locale],
    );

    // ---------- navigation handlers ----------
    const focusedRef = useRef<HTMLButtonElement | null>(null);
    const lastInteractionRef = useRef<"keyboard" | "pointer" | null>(null);
    const wasFocusedRef = useRef(false);

    /** Move the focused day. Triggers `onChange(type)` and updates state. */
    const moveFocus = useCallback(
      (next: Ymd, type: "navigate" | "focus") => {
        const clamped = clampDate(next, minYmd, maxYmd);
        if (!isControlled) setInternalFocus(clamped);
        onChange?.({
          iso: formatISO(clamped),
          year: clamped.year,
          month: clamped.month,
          day: clamped.day,
          type,
        });
      },
      [isControlled, minYmd, maxYmd, onChange],
    );

    const goToPrevMonth = useCallback(() => {
      const next = addMonths(focused.year, focused.month, -1);
      moveFocus({ ...next, day: 1 }, "navigate");
    }, [focused.year, focused.month, moveFocus]);

    const goToNextMonth = useCallback(() => {
      const next = addMonths(focused.year, focused.month, 1);
      moveFocus({ ...next, day: 1 }, "navigate");
    }, [focused.year, focused.month, moveFocus]);

    /** Pick a date — fires `onSelect` if the date is enabled. */
    const pickDate = useCallback(
      (target: Ymd) => {
        if (!isInRange(target, minYmd, maxYmd)) return;
        if (setHas(disabledSet, target)) return;
        moveFocus(target, "focus");
        onSelect?.({
          iso: formatISO(target),
          year: target.year,
          month: target.month,
          day: target.day,
        });
      },
      [minYmd, maxYmd, disabledSet, moveFocus, onSelect],
    );

    // ---------- keyboard ----------
    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        lastInteractionRef.current = "keyboard";
        const k = event.key;
        switch (k) {
          case "ArrowLeft":
            event.preventDefault();
            moveFocus(addDays(focused, -1), "focus");
            break;
          case "ArrowRight":
            event.preventDefault();
            moveFocus(addDays(focused, 1), "focus");
            break;
          case "ArrowUp":
            event.preventDefault();
            moveFocus(addDays(focused, -7), "focus");
            break;
          case "ArrowDown":
            event.preventDefault();
            moveFocus(addDays(focused, 7), "focus");
            break;
          case "PageUp":
            event.preventDefault();
            if (event.shiftKey) {
              moveFocus(
                { year: focused.year - 1, month: focused.month, day: focused.day },
                "navigate",
              );
            } else {
              const next = addMonths(focused.year, focused.month, -1);
              moveFocus(
                { ...next, day: Math.min(focused.day, 28) },
                "navigate",
              );
            }
            break;
          case "PageDown":
            event.preventDefault();
            if (event.shiftKey) {
              moveFocus(
                { year: focused.year + 1, month: focused.month, day: focused.day },
                "navigate",
              );
            } else {
              const next = addMonths(focused.year, focused.month, 1);
              moveFocus(
                { ...next, day: Math.min(focused.day, 28) },
                "navigate",
              );
            }
            break;
          case "Home": {
            event.preventDefault();
            const dayOfWeek = new Date(
              focused.year,
              focused.month,
              focused.day,
            ).getDay();
            const offset = (dayOfWeek - weekStartDay + 7) % 7;
            moveFocus(addDays(focused, -offset), "focus");
            break;
          }
          case "End": {
            event.preventDefault();
            const dayOfWeek = new Date(
              focused.year,
              focused.month,
              focused.day,
            ).getDay();
            const offset = (weekStartDay + 6 - dayOfWeek + 7) % 7;
            moveFocus(addDays(focused, offset), "focus");
            break;
          }
          case "Enter":
          case " ":
            event.preventDefault();
            pickDate(focused);
            break;
          case "Escape":
            event.preventDefault();
            (event.currentTarget as HTMLDivElement).blur();
            break;
          default:
            break;
        }
      },
      [focused, moveFocus, pickDate, weekStartDay],
    );

    // ---------- programmatic focus management ----------
    // After the focused date moves via keyboard, refocus the inner button so
    // the screen reader follows along. We *don't* refocus on pointer
    // interactions to avoid stealing focus mid-click.
    useEffect(() => {
      if (
        wasFocusedRef.current &&
        lastInteractionRef.current === "keyboard" &&
        focusedRef.current
      ) {
        focusedRef.current.focus({ preventScroll: false });
      }
    }, [focused.year, focused.month, focused.day]);

    const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
      wasFocusedRef.current = true;
      onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
      // The grid stays "focused" while a child button is focused — only
      // unset the flag when focus leaves the calendar root entirely.
      if (
        !event.currentTarget.contains(event.relatedTarget as Node | null)
      ) {
        wasFocusedRef.current = false;
        lastInteractionRef.current = null;
      }
      onBlur?.(event);
    };

    // ---------- nav button disabled state ----------
    const prevDisabled = useMemo(() => {
      if (!minYmd) return false;
      const lastOfPrev = (() => {
        const { year: y, month: m } = addMonths(
          focused.year,
          focused.month,
          -1,
        );
        return { year: y, month: m, day: 28 };
      })();
      return compareDays(lastOfPrev, minYmd) < 0;
    }, [minYmd, focused.year, focused.month]);

    const nextDisabled = useMemo(() => {
      if (!maxYmd) return false;
      const firstOfNext = (() => {
        const { year: y, month: m } = addMonths(focused.year, focused.month, 1);
        return { year: y, month: m, day: 1 };
      })();
      return compareDays(firstOfNext, maxYmd) > 0;
    }, [maxYmd, focused.year, focused.month]);

    // ---------- render ----------
    return (
      <div
        ref={ref}
        role="grid"
        aria-label={monthLabelText}
        tabIndex={-1}
        className={cx(styles.root, styles.size[size], className)}
        style={style as CSSProperties}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPointerDownCapture={() => {
          lastInteractionRef.current = "pointer";
        }}
        {...rest}
      >
        <div className={styles.header}>
          <button
            type="button"
            aria-label={prevMonthLabel ?? "Previous month"}
            className={styles.navButton}
            onClick={goToPrevMonth}
            disabled={prevDisabled}
          >
            {prevMonthIcon ?? <Icon name="chevron-left" size={16} />}
          </button>
          <h2 className={styles.monthLabel}>{monthLabelText}</h2>
          <button
            type="button"
            aria-label={nextMonthLabel ?? "Next month"}
            className={styles.navButton}
            onClick={goToNextMonth}
            disabled={nextDisabled}
          >
            {nextMonthIcon ?? <Icon name="chevron-right" size={16} />}
          </button>
        </div>

        <div role="row" className={styles.weekdayRow}>
          {dayLabelsNarrow.map((label, idx) => (
            <span
              key={`${label}-${idx}`}
              role="columnheader"
              aria-label={dayLabelsLong[idx]}
              className={styles.weekdayCell}
            >
              {label}
            </span>
          ))}
        </div>

        <div>
          {Array.from({ length: 6 }, (_, weekIdx) => (
            <div role="row" key={weekIdx} className={styles.grid}>
              {grid.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell) => {
                const inMonth = cell.inCurrentMonth;
                const inRange = isInRange(cell, minYmd, maxYmd);
                const isCellDisabled =
                  !inRange || setHas(disabledSet, cell);
                const isCellSelected = setHas(selectedSet, cell);
                const isCellPrevious = setHas(previousSet, cell);
                const isCellToday = isSameDay(cell, today);
                const isCellFocused = isSameDay(cell, focused);
                const iso = formatISO(cell);
                return (
                  <span key={iso} className={styles.dayCellWrap}>
                    <button
                      type="button"
                      ref={isCellFocused ? focusedRef : undefined}
                      role="gridcell"
                      className={styles.dayCell}
                      tabIndex={isCellFocused ? 0 : -1}
                      aria-selected={isCellSelected || undefined}
                      aria-disabled={isCellDisabled || undefined}
                      aria-current={isCellToday ? "date" : undefined}
                      aria-label={getDayAriaLabel(cell, locale)}
                      data-outside={!inMonth || undefined}
                      data-today={isCellToday || undefined}
                      data-selected={isCellSelected || undefined}
                      data-disabled={isCellDisabled || undefined}
                      disabled={isCellDisabled}
                      onClick={() => pickDate(cell)}
                      onFocus={() => {
                        if (lastInteractionRef.current !== "keyboard") {
                          moveFocus(cell, "focus");
                        }
                      }}
                    >
                      {cell.day}
                      {isCellPrevious && (
                        <span
                          className={styles.previousMarker}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

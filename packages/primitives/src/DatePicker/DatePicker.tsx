"use client";
import * as RadixPopover from "@radix-ui/react-popover";
import { Icon } from "@catylast/icons";
import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cx } from "../utils/classNames";
import { Calendar } from "../Calendar/Calendar";
import type { CalendarSelectEvent } from "../Calendar/Calendar";
import * as styles from "./DatePicker.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type DatePickerSize = "small" | "medium" | "large";

export type DatePickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children"
> & {
  /** Controlled value (ISO YYYY-MM-DD). Empty string means "no date". */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fired with the new ISO date when the user picks one (or clears). */
  onChange?: (iso: string) => void;
  /** Placeholder text in the input. @default formatted date format pattern */
  placeholder?: string;
  /**
   * Display format for the input. Tokens: `YYYY` (year), `MM`
   * (zero-padded month), `M` (month), `DD` (day), `D` (day, no pad).
   * @default "YYYY-MM-DD"
   */
  dateFormat?: string;
  /**
   * Override how the input string is parsed back into an ISO date. By
   * default the component understands the configured `dateFormat` and
   * falls back to native `Date.parse`.
   */
  parseInputValue?: (input: string, dateFormat: string) => string | null;
  /** Override how a picked ISO date is rendered into the input. */
  formatDisplayLabel?: (iso: string, dateFormat: string) => string;
  /** Earliest selectable date (ISO). Forwarded to the underlying Calendar. */
  minDate?: string;
  /** Latest selectable date (ISO). Forwarded to the underlying Calendar. */
  maxDate?: string;
  /** Disabled dates (array of ISO strings). Forwarded to Calendar. */
  disabledDates?: string[];
  /** First column of the day grid (0 = Sun, 1 = Mon, …, 6 = Sat). */
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** BCP-47 locale tag for month / weekday labels. @default "en-US" */
  locale?: string;
  /** Override "today" — useful for tests / time-travel demos. ISO date. */
  today?: string;
  /** Disable the picker. */
  isDisabled?: boolean;
  /** Error state — red border + `aria-invalid`. */
  isInvalid?: boolean;
  /** Show a clear button when the picker has a value. @default true */
  isClearable?: boolean;
  /** Replace the trailing icon (default: a calendar glyph). */
  triggerIcon?: ReactNode;
  /** Visual scale. @default "medium" */
  size?: DatePickerSize;
  /** `name` attribute on the inner input — useful for native form submission. */
  name?: string;
  /** `aria-label` for the picker root, when no visible label is present. */
  "aria-label"?: string;
};

// ----------------------------------------------------------------------------
// Format / parse helpers
// ----------------------------------------------------------------------------

const DEFAULT_FORMAT = "YYYY-MM-DD";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Render an ISO date through a token format pattern. */
function formatIso(iso: string, fmt: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const [, y, mo, d] = m;
  return fmt
    .replace(/YYYY/g, y!)
    .replace(/MM/g, mo!)
    .replace(/M(?!M)/g, String(Number(mo)))
    .replace(/DD/g, d!)
    .replace(/D(?!D)/g, String(Number(d)));
}

/**
 * Parse a user-typed string back into ISO. Tries the format pattern
 * first (so `15/05/2026` parses correctly even though the native Date
 * parser would reject it), then falls back to `Date.parse`.
 */
function parseInput(input: string, fmt: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = ["YYYY", "MM", "M", "DD", "D"];
  let regex = "";
  const groups: string[] = [];
  let i = 0;
  while (i < fmt.length) {
    let matched = false;
    for (const tk of tokens) {
      if (fmt.startsWith(tk, i)) {
        regex += `(\\d{${tk === "M" || tk === "D" ? "1,2" : tk.length}})`;
        groups.push(tk);
        i += tk.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const c = fmt[i] ?? "";
      regex += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  const m = new RegExp(`^${regex}$`).exec(trimmed);
  if (m) {
    let year = 0;
    let month = 0;
    let day = 0;
    groups.forEach((g, idx) => {
      const v = Number(m[idx + 1]);
      if (g.startsWith("Y")) year = v;
      else if (g.startsWith("M")) month = v;
      else if (g.startsWith("D")) day = v;
    });
    if (
      year > 0 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const t = Date.parse(trimmed);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      defaultValue,
      onChange,
      placeholder,
      dateFormat = DEFAULT_FORMAT,
      parseInputValue,
      formatDisplayLabel,
      minDate,
      maxDate,
      disabledDates,
      weekStartDay = 0,
      locale = "en-US",
      today,
      isDisabled = false,
      isInvalid = false,
      isClearable = true,
      triggerIcon,
      size = "medium",
      name,
      className,
      style,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const iso = isControlled ? (value ?? "") : internalValue;

    const [draft, setDraft] = useState(() =>
      iso ? (formatDisplayLabel?.(iso, dateFormat) ?? formatIso(iso, dateFormat)) : "",
    );
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useId();

    // Keep the draft synced with `iso` whenever an outside change updates
    // the value (controlled flow) or the user picks from the calendar.
    const lastIsoRef = useRef(iso);
    if (lastIsoRef.current !== iso) {
      lastIsoRef.current = iso;
      setDraft(
        iso
          ? (formatDisplayLabel?.(iso, dateFormat) ?? formatIso(iso, dateFormat))
          : "",
      );
    }

    const commit = useCallback(
      (next: string) => {
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
    };

    const handleInputBlur = () => {
      setFocused(false);
      const parsed = parseInputValue
        ? parseInputValue(draft, dateFormat)
        : parseInput(draft, dateFormat);
      if (parsed === null) {
        if (draft.trim() === "") commit("");
        else
          setDraft(
            iso
              ? (formatDisplayLabel?.(iso, dateFormat) ??
                 formatIso(iso, dateFormat))
              : "",
          );
      } else if (parsed !== iso) {
        commit(parsed);
      }
    };

    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
      } else if (e.key === "ArrowDown" && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleCalendarSelect = (event: CalendarSelectEvent) => {
      commit(event.iso);
      setOpen(false);
      // Return focus to the input so keyboard users continue without losing
      // their place.
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleClear = () => {
      commit("");
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    const calendarPosition = useMemo(() => {
      if (!iso) return undefined;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      if (!m) return undefined;
      return {
        year: Number(m[1]),
        month: Number(m[2]) - 1,
        day: Number(m[3]),
      };
    }, [iso]);

    return (
      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <div
          ref={ref}
          className={cx(styles.size[size], className)}
          style={style as CSSProperties}
          {...rest}
        >
          <RadixPopover.Anchor asChild>
            <div
              role="group"
              aria-label={ariaLabel}
              data-disabled={isDisabled || undefined}
              data-invalid={isInvalid || undefined}
              data-focused={focused || open || undefined}
              className={styles.trigger}
              onClick={(e) => {
                if (isDisabled) return;
                if (e.target === e.currentTarget) {
                  inputRef.current?.focus();
                }
              }}
            >
              <input
                ref={inputRef}
                id={generatedId}
                type="text"
                inputMode="numeric"
                role="combobox"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={`${generatedId}-popover`}
                aria-invalid={isInvalid || undefined}
                name={name}
                disabled={isDisabled}
                placeholder={placeholder ?? dateFormat}
                value={draft}
                className={styles.input}
                onChange={handleInputChange}
                onFocus={() => setFocused(true)}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
              />
              {isClearable && iso && !isDisabled && (
                <button
                  type="button"
                  aria-label="Clear date"
                  className={styles.clearButton}
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
              <RadixPopover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open calendar"
                  className={styles.triggerIcon}
                  disabled={isDisabled}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {triggerIcon ?? <Icon name="calendar" size={16} />}
                </button>
              </RadixPopover.Trigger>
            </div>
          </RadixPopover.Anchor>
          <RadixPopover.Portal>
            <RadixPopover.Content
              id={`${generatedId}-popover`}
              align="start"
              sideOffset={4}
              className={styles.popoverContent}
              onOpenAutoFocus={(e) => {
                // Keep the focus on the input so keyboard typing still flows
                // through. The Calendar still receives keyboard events via
                // the parent listener once the user steps into the grid.
                e.preventDefault();
              }}
            >
              <Calendar
                {...(calendarPosition
                  ? {
                      year: calendarPosition.year,
                      month: calendarPosition.month,
                      day: calendarPosition.day,
                    }
                  : {})}
                selected={iso ? [iso] : []}
                weekStartDay={weekStartDay}
                locale={locale}
                {...(today ? { today } : {})}
                {...(minDate ? { minDate } : {})}
                {...(maxDate ? { maxDate } : {})}
                {...(disabledDates ? { disabled: disabledDates } : {})}
                onSelect={handleCalendarSelect}
              />
            </RadixPopover.Content>
          </RadixPopover.Portal>
        </div>
      </RadixPopover.Root>
    );
  },
);

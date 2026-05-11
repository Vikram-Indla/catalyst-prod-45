"use client";
import * as RadixPopover from "@radix-ui/react-popover";
import { Icon } from "@catylast/icons";
import {
  forwardRef,
  useCallback,
  useEffect,
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
import * as styles from "./TimePicker.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type TimePickerSize = "small" | "medium" | "large";

export type TimePickerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue" | "children"
> & {
  /** Controlled value — 24h `HH:mm` (e.g. "14:30"). Empty string = no time. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Fired when the user picks (or clears) a time. */
  onChange?: (value: string) => void;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /**
   * Pre-defined time options shown in the popover. Pass 24h `HH:mm`
   * strings. @default 30-minute increments from "00:00" → "23:30"
   */
  times?: string[];
  /**
   * Display format. `"HH:mm"` for 24h, `"hh:mm A"` for 12h with AM/PM
   * suffix. The `value` prop and `times` prop are always 24h —
   * formatting is purely a display concern. @default "HH:mm"
   */
  timeFormat?: "HH:mm" | "hh:mm A" | (string & {});
  /** Override how the input string is parsed back into 24h `HH:mm`. */
  parseInputValue?: (input: string, timeFormat: string) => string | null;
  /** Override how a picked 24h time is rendered into the input. */
  formatDisplayLabel?: (value: string, timeFormat: string) => string;
  /** Disable the picker. */
  isDisabled?: boolean;
  /** Error state — red border + `aria-invalid`. */
  isInvalid?: boolean;
  /** Show a clear button when the picker has a value. @default true */
  isClearable?: boolean;
  /** Replace the trailing icon (default: a clock glyph). */
  triggerIcon?: ReactNode;
  /** Visual scale. @default "medium" */
  size?: TimePickerSize;
  /** `name` attribute on the inner input — useful for native form submission. */
  name?: string;
  /** `aria-label` for the picker root, when no visible label is present. */
  "aria-label"?: string;
};

// ----------------------------------------------------------------------------
// Default option set & format helpers
// ----------------------------------------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 30-minute increments across the 24-hour clock. */
function buildDefaultTimes(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${pad2(h)}:00`);
    out.push(`${pad2(h)}:30`);
  }
  return out;
}

const DEFAULT_TIMES = buildDefaultTimes();
const DEFAULT_FORMAT = "HH:mm";

/** Render a 24h `HH:mm` value through the format pattern. */
function formatTime(value: string, fmt: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return "";
  const h24 = Number(m[1]);
  const min = Number(m[2]);
  const isPm = h24 >= 12;
  const h12 = ((h24 + 11) % 12) + 1;
  return fmt
    .replace(/HH/g, pad2(h24))
    .replace(/H(?!H)/g, String(h24))
    .replace(/hh/g, pad2(h12))
    .replace(/h(?!h)/g, String(h12))
    .replace(/mm/g, pad2(min))
    .replace(/A/g, isPm ? "PM" : "AM")
    .replace(/a/g, isPm ? "pm" : "am");
}

/**
 * Parse user-typed strings ("3pm", "15", "9:5", "9:05 am", "21:30") into
 * canonical 24h `HH:mm`. Returns null if the input doesn't look like a
 * time at all.
 */
function parseInput(input: string, _fmt: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m =
    /^(\d{1,2})(?::(\d{1,2}))?\s*([ap]m?)?$/i.exec(trimmed) ??
    /^(\d{1,2})(\d{2})\s*([ap]m?)?$/i.exec(trimmed);
  if (!m) return null;
  let h = Number(m[1]);
  let mins = m[2] === undefined ? 0 : Number(m[2]);
  const meridiem = m[3]?.toLowerCase();
  if (Number.isNaN(h) || Number.isNaN(mins)) return null;
  if (mins < 0 || mins > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem.startsWith("p") && h !== 12) h += 12;
    if (meridiem.startsWith("a") && h === 12) h = 0;
  }
  if (h < 0 || h > 23) return null;
  return `${pad2(h)}:${pad2(mins)}`;
}

/** Filter the option list to the entries that "start with" the typed text. */
function filterTimes(times: string[], input: string, fmt: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return times;
  const lower = trimmed.toLowerCase();
  return times.filter((t) => {
    const display = formatTime(t, fmt).toLowerCase();
    return display.startsWith(lower) || t.toLowerCase().startsWith(lower);
  });
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(
    {
      value,
      defaultValue,
      onChange,
      placeholder,
      times = DEFAULT_TIMES,
      timeFormat = DEFAULT_FORMAT,
      parseInputValue,
      formatDisplayLabel,
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
    const current = isControlled ? (value ?? "") : internalValue;

    const renderDisplay = useCallback(
      (v: string) =>
        v
          ? (formatDisplayLabel?.(v, timeFormat) ?? formatTime(v, timeFormat))
          : "",
      [formatDisplayLabel, timeFormat],
    );

    const [draft, setDraft] = useState(() => renderDisplay(current));
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const generatedId = useId();

    // Sync the draft with the canonical value whenever it changes from
    // outside (controlled flow) or from a list selection.
    const lastValueRef = useRef(current);
    if (lastValueRef.current !== current) {
      lastValueRef.current = current;
      setDraft(renderDisplay(current));
    }

    const filtered = useMemo(
      () => filterTimes(times, draft, timeFormat),
      [times, draft, timeFormat],
    );

    // When the popover opens, scroll the currently-selected time into view.
    useEffect(() => {
      if (!open) {
        setActiveIndex(-1);
        return;
      }
      const idx = filtered.findIndex((t) => t === current);
      setActiveIndex(idx >= 0 ? idx : -1);
      requestAnimationFrame(() => {
        const list = listRef.current;
        if (!list) return;
        const items = list.querySelectorAll<HTMLLIElement>("[data-time]");
        const target =
          idx >= 0 ? items[idx] : items[Math.min(items.length - 1, 8)];
        target?.scrollIntoView({ block: "nearest" });
      });
    }, [open, current, filtered]);

    const commit = useCallback(
      (next: string) => {
        if (!isControlled) setInternalValue(next);
        onChange?.(next);
      },
      [isControlled, onChange],
    );

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      if (!open) setOpen(true);
      setActiveIndex(-1);
    };

    const handleInputBlur = () => {
      setFocused(false);
      const parsed = parseInputValue
        ? parseInputValue(draft, timeFormat)
        : parseInput(draft, timeFormat);
      if (parsed === null) {
        if (draft.trim() === "") commit("");
        else setDraft(renderDisplay(current));
      } else if (parsed !== current) {
        commit(parsed);
      }
    };

    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((idx) =>
          filtered.length === 0 ? -1 : (idx + 1) % filtered.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        setActiveIndex((idx) =>
          filtered.length === 0
            ? -1
            : (idx - 1 + filtered.length) % filtered.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (open && activeIndex >= 0 && filtered[activeIndex]) {
          commit(filtered[activeIndex]);
          setOpen(false);
          return;
        }
        // Nothing highlighted — try to parse what's in the input.
        const parsed = parseInputValue
          ? parseInputValue(draft, timeFormat)
          : parseInput(draft, timeFormat);
        if (parsed !== null) {
          commit(parsed);
          setOpen(false);
        }
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    const handleClear = () => {
      commit("");
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

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
                  setOpen(true);
                }
              }}
            >
              <input
                ref={inputRef}
                id={generatedId}
                type="text"
                inputMode="numeric"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={`${generatedId}-listbox`}
                aria-activedescendant={
                  open && activeIndex >= 0
                    ? `${generatedId}-opt-${activeIndex}`
                    : undefined
                }
                aria-invalid={isInvalid || undefined}
                name={name}
                disabled={isDisabled}
                placeholder={placeholder ?? timeFormat}
                value={draft}
                className={styles.input}
                onChange={handleInputChange}
                onFocus={() => {
                  setFocused(true);
                  setOpen(true);
                }}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
              />
              {isClearable && current && !isDisabled && (
                <button
                  type="button"
                  aria-label="Clear time"
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
                  aria-label="Open time list"
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
                  {triggerIcon ?? <Icon name="clock" size={16} />}
                </button>
              </RadixPopover.Trigger>
            </div>
          </RadixPopover.Anchor>
          <RadixPopover.Portal>
            <RadixPopover.Content
              align="start"
              sideOffset={4}
              className={styles.popoverContent}
              onOpenAutoFocus={(e) => {
                // Keep focus on the input so typing keeps filtering.
                e.preventDefault();
              }}
            >
              <ul
                ref={listRef}
                id={`${generatedId}-listbox`}
                role="listbox"
                className={styles.list}
              >
                {filtered.length === 0 ? (
                  <li className={styles.emptyState} role="presentation">
                    No matching times
                  </li>
                ) : (
                  filtered.map((t, idx) => {
                    const isSelected = t === current;
                    const isActive = idx === activeIndex;
                    return (
                      <li
                        key={t}
                        id={`${generatedId}-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        data-time={t}
                        data-selected={isSelected || undefined}
                        data-highlighted={isActive || undefined}
                        className={styles.listItem}
                        onClick={() => {
                          commit(t);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        {formatTime(t, timeFormat)}
                      </li>
                    );
                  })
                )}
              </ul>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        </div>
      </RadixPopover.Root>
    );
  },
);

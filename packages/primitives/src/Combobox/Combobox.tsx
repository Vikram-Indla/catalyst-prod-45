import { Command } from "cmdk";
import { Icon } from "@catylast/icons";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../Popover/Popover";
import { cx } from "../utils/classNames";
import * as styles from "./Combobox.css";

/**
 * Bare searchable list. Use this when you want the picker UI without the
 * surrounding trigger + popover (for example, embedding the list inside a
 * menu submenu, a drawer, or a dialog).
 */
export type ComboboxListProps<T> = {
  options: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Custom rendering for each option. Defaults to `getLabel(item)`. */
  renderOption?: (item: T) => ReactNode;
  /** Currently selected item. Used to render a check indicator. */
  value?: T | null;
  /** Fires when an item is picked. */
  onSelect: (item: T) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Show a "Clear selection" item that calls `onClear`. */
  clearable?: boolean;
  onClear?: () => void;
  /** Auto-focus the search input when mounted. Default `true`. */
  autoFocusSearch?: boolean;
  className?: string;
};

export function ComboboxList<T>({
  options,
  getKey,
  getLabel,
  renderOption,
  value,
  onSelect,
  searchPlaceholder = "Search…",
  emptyText = "No results",
  clearable,
  onClear,
  autoFocusSearch = true,
  className,
}: ComboboxListProps<T>) {
  const selectedKey = value ? getKey(value) : null;
  const showClear = Boolean(clearable && value && onClear);
  return (
    <Command className={cx(styles.commandRoot, className)} loop>
      <div className={styles.inputWrapper}>
        <span className={styles.inputIcon}>
          <Icon name="search" size={14} />
        </span>
        <Command.Input
          autoFocus={autoFocusSearch}
          placeholder={searchPlaceholder}
          className={styles.input}
        />
      </div>
      <Command.List className={styles.list}>
        <Command.Empty className={styles.empty}>{emptyText}</Command.Empty>
        {options.map((item) => {
          const key = getKey(item);
          const label = getLabel(item);
          const selected = selectedKey === key;
          return (
            <Command.Item
              key={key}
              value={key}
              keywords={[label]}
              className={styles.item}
              onSelect={() => onSelect(item)}
            >
              <span className={styles.itemContent}>
                {renderOption ? renderOption(item) : label}
              </span>
              {selected && (
                <span className={styles.itemIndicator}>
                  <Icon name="check" size={14} />
                </span>
              )}
            </Command.Item>
          );
        })}
        {showClear && (
          <Command.Item
            value="__catylast_clear__"
            keywords={["clear", "remove", "none"]}
            className={cx(styles.item, styles.clearItem)}
            onSelect={() => onClear?.()}
          >
            Clear selection
          </Command.Item>
        )}
      </Command.List>
    </Command>
  );
}

/**
 * Searchable single-select. Renders a button that opens a popover with a
 * search-as-you-type list of `options`.
 */
export type ComboboxProps<T> = ComboboxListProps<T> & {
  /** Trigger placeholder when no value selected. */
  placeholder?: string;
  /** Custom rendering inside the trigger when a value is selected. Defaults to `getLabel(value)`. */
  renderTrigger?: (item: T) => ReactNode;
  size?: "sm" | "md";
  variant?: "default" | "ghost";
  disabled?: boolean;
  triggerClassName?: string;
};

export function Combobox<T>(props: ComboboxProps<T>) {
  const {
    placeholder = "Select…",
    renderTrigger,
    size = "md",
    variant = "default",
    disabled,
    triggerClassName,
    onSelect,
    ...listProps
  } = props;
  const [open, setOpen] = useState(false);
  const value = listProps.value;

  const handleSelect = (item: T) => {
    onSelect(item);
    setOpen(false);
  };

  const handleClear = listProps.onClear
    ? () => {
        listProps.onClear?.();
        setOpen(false);
      }
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cx(
            styles.trigger,
            styles.triggerSize[size],
            styles.triggerVariant[variant],
            triggerClassName,
          )}
          disabled={disabled}
        >
          <span className={styles.triggerLabel}>
            {value ? (
              renderTrigger ? (
                renderTrigger(value)
              ) : (
                listProps.getLabel(value)
              )
            ) : (
              <span className={styles.placeholder}>{placeholder}</span>
            )}
          </span>
          <span className={styles.triggerIcon}>
            <Icon name="chevron-down" size={14} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={styles.popoverContent} align="start">
        <ComboboxList
          {...listProps}
          onSelect={handleSelect}
          {...(handleClear ? { onClear: handleClear } : {})}
        />
      </PopoverContent>
    </Popover>
  );
}

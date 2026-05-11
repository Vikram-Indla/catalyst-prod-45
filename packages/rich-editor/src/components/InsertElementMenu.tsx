import type { Editor } from "@tiptap/react";
import { Icon } from "@catylast/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@catylast/primitives";
import { useEffect, useMemo, useRef, useState } from "react";

import * as styles from "../Editor.css";
import type { InsertElement } from "../types";

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

const matchesQuery = (item: InsertElement, q: string): boolean => {
  if (!q) return true;
  const haystack = [item.label, item.description, ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

export type InsertElementMenuProps = {
  editor: Editor;
  items: InsertElement[];
  onBrowseAll: () => void;
};

const QUICK_PICK_LIMIT = 6;

export function InsertElementMenu({
  editor,
  items,
  onBrowseAll,
}: InsertElementMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const all = items.filter((it) => matchesQuery(it, query));
    return query ? all : all.slice(0, QUICK_PICK_LIMIT);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const handleRun = (item: InsertElement) => {
    setOpen(false);
    setQuery("");
    item.run({ editor });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) handleRun(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cx(styles.toolbarButton, open && styles.toolbarButtonActive)}
          aria-label="Insert element"
          title="Insert element"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Icon name="plus" size={16} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={styles.insertMenu}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={styles.insertSearchRow}>
          <Icon
            name="search"
            size={14}
            className={styles.insertSearchIcon}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search elements"
            className={styles.insertSearchInput}
            aria-label="Search insertable elements"
          />
        </div>
        {filtered.length === 0 ? (
          <div className={styles.insertEmpty}>
            No elements match &ldquo;{query}&rdquo;
          </div>
        ) : (
          <ul className={styles.insertItemList} role="listbox">
            {filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cx(
                    styles.insertItem,
                    i === activeIndex && styles.insertItemActive,
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleRun(item)}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <span
                    className={styles.insertItemIcon}
                    style={
                      item.iconTint ? { background: item.iconTint } : undefined
                    }
                  >
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className={styles.insertItemText}>
                    <span className={styles.insertItemLabel}>{item.label}</span>
                    <span className={styles.insertItemDescription}>
                      {item.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.insertFooter}>
          <button
            type="button"
            className={styles.insertFooterButton}
            onClick={() => {
              setOpen(false);
              setQuery("");
              onBrowseAll();
            }}
          >
            <Icon name="layout-grid" size={14} />
            Browse all elements
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

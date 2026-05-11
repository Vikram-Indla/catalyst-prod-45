import type { Editor } from "@tiptap/react";
import { Icon } from "@catylast/icons";
import { Button } from "@catylast/primitives";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import * as styles from "../Editor.css";
import type { InsertElement, InsertElementCategory } from "../types";

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

type SidebarKey = "all" | InsertElementCategory;

const SIDEBAR_LABELS: Record<SidebarKey, string> = {
  all: "All",
  content: "Content",
  workspace: "Workspace content",
  external: "External content",
  development: "Development",
};

const SIDEBAR_ORDER: SidebarKey[] = [
  "all",
  "content",
  "workspace",
  "external",
  "development",
];

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

export type InsertElementModalProps = {
  open: boolean;
  editor: Editor;
  items: InsertElement[];
  onClose: () => void;
};

export function InsertElementModal({
  open,
  editor,
  items,
  onClose,
}: InsertElementModalProps) {
  const [sidebar, setSidebar] = useState<SidebarKey>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    return items
      .filter((it) => sidebar === "all" || it.category === sidebar)
      .filter((it) => matchesQuery(it, query));
  }, [items, sidebar, query]);

  useEffect(() => {
    if (!open) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [open, sidebar, query, visible]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSidebar("all");
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const selected = visible.find((it) => it.id === selectedId) ?? null;

  const insert = (item: InsertElement | null) => {
    if (!item) return;
    onClose();
    item.run({ editor });
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      insert(selected);
    }
  };

  return createPortal(
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Browse elements"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalSurface}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Browse</h2>
          <button
            type="button"
            className={styles.modalCloseTopButton}
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <aside className={styles.modalSidebar} aria-label="Categories">
            {SIDEBAR_ORDER.map((key) => {
              const count =
                key === "all"
                  ? items.length
                  : items.filter((it) => it.category === key).length;
              if (key !== "all" && count === 0) return null;
              const active = sidebar === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    styles.modalSidebarItem,
                    active && styles.modalSidebarItemActive,
                  )}
                  onClick={() => setSidebar(key)}
                  aria-pressed={active}
                >
                  {SIDEBAR_LABELS[key]}
                </button>
              );
            })}
          </aside>

          <section className={styles.modalContent}>
            <div className={styles.modalSearchRow}>
              <Icon
                name="search"
                size={16}
                className={styles.modalSearchIcon}
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search"
                className={styles.modalSearchInput}
                aria-label="Search elements"
              />
              <span className={styles.modalSearchHint}>
                <Icon name="arrow-right" size={12} />
                Enter
              </span>
            </div>

            {visible.length === 0 ? (
              <div className={styles.modalEmpty}>
                No elements match &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className={styles.modalGrid}>
                {visible.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx(
                        styles.modalCard,
                        active && styles.modalCardActive,
                      )}
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => insert(item)}
                      aria-pressed={active}
                    >
                      <span
                        className={styles.modalCardIcon}
                        style={
                          item.iconTint
                            ? { background: item.iconTint }
                            : undefined
                        }
                      >
                        <Icon name={item.icon} size={20} />
                      </span>
                      <span className={styles.modalCardText}>
                        <span className={styles.modalCardLabel}>
                          {item.label}
                        </span>
                        <span className={styles.modalCardDescription}>
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <footer className={styles.modalFooter}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!selected}
            onClick={() => insert(selected)}
          >
            Insert
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

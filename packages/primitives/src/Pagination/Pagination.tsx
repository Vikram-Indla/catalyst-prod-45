import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

import { Icon } from "@catylast/icons";
import { cx } from "../utils/classNames";
import * as styles from "./Pagination.css";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PaginationSize = "small" | "medium" | "large";

export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  /** Total number of pages. Pages are 1-indexed (first page is `1`). */
  pageCount: number;
  /**
   * Controlled current page (1-indexed). Pair with `onPageChange`. Omit
   * both for uncontrolled mode where the component tracks page internally.
   */
  page?: number;
  /** Initial page for uncontrolled mode. Ignored when `page` is supplied. @default 1 */
  defaultPage?: number;
  /** Called when the user picks a different page. */
  onPageChange?: (page: number) => void;
  /**
   * How many sibling pages to show on each side of the current page.
   * @default 1 — produces `1 ... 4 [5] 6 ... 10` patterns.
   */
  siblingCount?: number;
  /**
   * How many pages to show pinned at the start and end of the range.
   * @default 1 — produces `1 ... 4 5 6 ... 10`. Set higher to expose
   * more boundary pages: `1 2 ... 5 [6] 7 ... 9 10`.
   */
  boundaryCount?: number;
  /** Visual scale. @default "medium" */
  size?: PaginationSize;
  /**
   * Hide the component entirely when there's only one page (or zero).
   * Off by default so consumers see consistent chrome; flip on for
   * tables / lists where a single page renders no useful chrome.
   * @default false
   */
  hideOnSinglePage?: boolean;
  /** Accessible label for the `<nav>` landmark. @default "Pagination" */
  ariaLabel?: string;
};

// ---------------------------------------------------------------------------
// Item-list builder — returns the sequence of page numbers and ellipses
// that should be rendered between the prev / next buttons.
// ---------------------------------------------------------------------------

type Item = number | "start-ellipsis" | "end-ellipsis";

function buildItems(
  page: number,
  pageCount: number,
  siblingCount: number,
  boundaryCount: number,
): Item[] {
  if (pageCount <= 0) return [];

  // Start / end boundary ranges. `1..boundaryCount` and
  // `pageCount-boundaryCount+1..pageCount`.
  const startPages = range(1, Math.min(boundaryCount, pageCount));
  const endPages = range(
    Math.max(pageCount - boundaryCount + 1, boundaryCount + 1),
    pageCount,
  );

  // Sibling range around the current page, clamped so it doesn't
  // overlap the boundary ranges.
  const siblingsStart = Math.max(
    Math.min(
      page - siblingCount,
      pageCount - boundaryCount - siblingCount * 2 - 1,
    ),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : pageCount - 1,
  );

  const items: Item[] = [
    ...startPages,
    // Start ellipsis (or a single missing number if the gap is exactly 1).
    ...(siblingsStart > boundaryCount + 2
      ? (["start-ellipsis"] as const)
      : boundaryCount + 1 < pageCount - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    // End ellipsis (or a single missing number).
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? (["end-ellipsis"] as const)
      : pageCount - boundaryCount > boundaryCount
        ? [pageCount - boundaryCount]
        : []),
    ...endPages,
  ];

  // Dedupe while preserving order — boundary and sibling ranges can
  // overlap for small pageCount values.
  const seen = new Set<Item>();
  const out: Item[] = [];
  for (const i of items) {
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(i);
  }
  return out;
}

function range(start: number, end: number): number[] {
  if (end < start) return [];
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      pageCount,
      page: pageProp,
      defaultPage = 1,
      onPageChange,
      siblingCount = 1,
      boundaryCount = 1,
      size = "medium",
      hideOnSinglePage = false,
      ariaLabel = "Pagination",
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const [internalPage, setInternalPage] = useState(defaultPage);
    const isControlled = pageProp !== undefined;
    const page = isControlled ? pageProp : internalPage;

    const setPage = useCallback(
      (next: number) => {
        const clamped = Math.max(1, Math.min(pageCount, next));
        if (clamped === page) return;
        if (!isControlled) setInternalPage(clamped);
        onPageChange?.(clamped);
      },
      [page, pageCount, isControlled, onPageChange],
    );

    const items = useMemo(
      () => buildItems(page, pageCount, siblingCount, boundaryCount),
      [page, pageCount, siblingCount, boundaryCount],
    );

    if (hideOnSinglePage && pageCount <= 1) return null;

    const isFirst = page <= 1;
    const isLast = page >= pageCount;

    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cx(styles.root, styles.size[size], className)}
        style={style as CSSProperties}
        {...rest}
      >
        <button
          type="button"
          aria-label="Previous page"
          data-disabled={isFirst}
          className={styles.item}
          onClick={() => setPage(page - 1)}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        {items.map((item, idx) => {
          if (item === "start-ellipsis" || item === "end-ellipsis") {
            return (
              <span
                key={`${item}-${idx}`}
                aria-hidden="true"
                className={styles.ellipsis}
              >
                …
              </span>
            );
          }
          const isActive = item === page;
          return (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={isActive ? "page" : undefined}
              data-active={isActive ? "true" : undefined}
              className={styles.item}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Next page"
          data-disabled={isLast}
          className={styles.item}
          onClick={() => setPage(page + 1)}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </nav>
    );
  },
);

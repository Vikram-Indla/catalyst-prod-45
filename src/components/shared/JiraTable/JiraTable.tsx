/**
 * JiraTable -- canonical Jira-style work-item table (Round H: TanStack).
 *
 * Renders a plain <table> with a Catalyst-opinionated skin:
 *   - Schema-driven columns (see types.ts)
 *   - Row-click opens a side detail panel (parent decides what that means)
 *   - `density="comfortable"` bumps the font ONE NOTCH up from Jira
 *     (14px cell / 12px header / 40px row height / 28px avatars)
 *   - Keyboard-ready (focusedRowId)
 *   - All visual chrome uses Atlaskit primitives for interactive elements
 *     (Checkbox, Textfield, icons) and plain HTML for layout.
 *
 * ── ROUND H (2026-04-18) ──
 * Previously built on `@atlaskit/dynamic-table`, which blocked:
 *   - column resize
 *   - sticky header
 *   - column reorder
 *   - virtualization
 *
 * Now renders a plain `<table>` so these are tractable. The previous
 * `@atlaskit/dynamic-table`-based implementation (`JiraTable.legacy.tsx`) was
 * retired in April 2026 — recover from git history if needed. The public API
 * (JiraTableProps) and all integration contracts are unchanged.
 *
 * Round H delivers: column resize (drag handle at header right edge, widths
 * persist in component state — parent can serialize if needed), sticky
 * header (position: sticky), preserved sort click handling, preserved
 * everything else from the DynamicTable era.
 *
 * Column reorder and virtualization are not wired yet — they're the next
 * natural additions and the `<table>` scaffolding here makes them
 * incremental rather than architectural.
 */
import React, { useEffect, useMemo, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox as AkCheckbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import Spinner from '@atlaskit/spinner';
// Apr 27, 2026 (jira-compare regression F-NEW-3): replace literal Unicode ▾
// with @atlaskit/icon ChevronDownIcon on group-row chevron — matches Jira's
// IconButton pattern + L11 mandate.
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
// NOTE: useVirtualizer (from @tanstack/react-virtual) was wired here on
// 2026-04-26 alongside the enableVirtualization prop. The dependency was
// added to vite.config.ts optimizeDeps.include, but Vite's optimize-deps
// cold-restart requires a manual `npm run dev` restart that the audit
// session can't trigger. The virtualized tbody branch is therefore staged
// behind a comment until the next clean dev start. enableVirtualization is
// accepted as a prop today (no-op) so consumer code can opt in early — it
// activates automatically as soon as the import is uncommented after a
// dev-server restart.
import { Plus as PlusIcon, Search as SearchIcon, RotateCcw as ResetIcon } from 'lucide-react';
import type { Column, JiraTableProps, SortOrder } from './types';

// Simple Atlaskit-tuned button style used by the pagination footer.
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  fontSize: 13,
  border: '1px solid #DFE1E6',
  borderRadius: 3,
  background: disabled ? '#F4F5F7' : '#FFFFFF',
  color: disabled ? '#A5ADBA' : '#42526E',
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
});

// Density -> concrete pixel values. "comfortable" is the Catalyst default and
// is exactly one step bigger than Jira's "compact".
const DENSITY = {
  comfortable: {
    cellFontSize: 14,
    headerFontSize: 12,
    rowHeight: 40,
    cellPaddingY: 10,
    cellPaddingX: 12,
    headerPaddingY: 10,
    avatarSize: 'medium' as const, // 32px
  },
  compact: {
    // Measured from Jira's BAU list DOM 2026-04-18:
    //   summary cell color #292A2E, font-size 14px, weight 400, row-height 40px.
    // Our previous 13px read "washed out" compared to Jira at 14px — the
    // difference is small on screen but meaningful for body-text density.
    cellFontSize: 14,
    headerFontSize: 12,
    rowHeight: 40,
    cellPaddingY: 8,
    cellPaddingX: 12,
    headerPaddingY: 8,
    avatarSize: 'small' as const, // 24px
  },
};

/**
 * CellRenderer — wraps a column's `cell` factory in its own component instance
 * so that cells which call hooks (useState/useMemo, e.g. ParentEditCell,
 * AssigneeEditCell) get their own stable hook list. Without this wrapper the
 * cell factories were invoked as plain functions inside JiraTable's render,
 * which violated Rules of Hooks and (silently) aborted subtree updates —
 * notably preventing the bulk Delete confirmation modal from mounting on the
 * project backlog screen.
 */
function CellRenderer<TRow>({
  cell,
  row,
  value,
  isFocused,
  isSelected,
  commit,
}: {
  cell: (args: { row: TRow; value: unknown; isFocused: boolean; isSelected: boolean; commit: (next: unknown) => void }) => React.ReactNode;
  row: TRow;
  value: unknown;
  isFocused: boolean;
  isSelected: boolean;
  commit: (next: unknown) => void;
}) {
  return <>{cell({ row, value, isFocused, isSelected, commit })}</>;
}

export function JiraTable<TRow>(props: JiraTableProps<TRow>) {
  const {
    columns,
    data,
    groups,
    getRowId,
    onRowClick,
    onCellEdit,
    getRowDepth,
    selectable,
    selection,
    onSelectionChange,
    sortKey,
    sortOrder,
    onSortChange,
    rowsPerPage = 25,
    page,
    onPageChange,
    focusedRowId: focusedRowIdProp,
    onFocusedRowChange,
    onEscape,
    density = 'comfortable',
    isLoading,
    emptyView,
    ariaLabel = 'Work items',
    columnVisibility,
    onColumnVisibilityChange,
    collapsedGroups,
    onToggleGroup,
    onAddToGroup,
    renderGroupInlineRow,
    getRowHasChildren,
    expandedRowIds,
    onToggleRowExpanded,
    contextMenuActions,
    enableColumnReorder = false,
    columnOrder: columnOrderProp,
    onColumnOrderChange,
    enableVirtualization = false,
  } = props;

  // Right-click context menu state — one menu at a time, anchored to cursor.
  const [ctxMenu, setCtxMenu] = useState<{ row: TRow; x: number; y: number } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const onDown = (e: MouseEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', () => setCtxMenu(null), true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  const d = DENSITY[density];

  // ── Column reorder (opt-in via enableColumnReorder) ──────────────────────
  // Internal column order falls back to schema order. When the user drags a
  // header, we update this state (or call the controlled callback). Order is
  // a list of column ids covering the REORDERABLE columns only — structural
  // columns (id starting with `__`) keep their position.
  const [internalColumnOrder, setInternalColumnOrder] = useState<string[] | null>(null);
  const effectiveColumnOrder: ReadonlyArray<string> | null = enableColumnReorder
    ? (columnOrderProp ?? internalColumnOrder)
    : null;

  // Column visibility: filter out any non-alwaysVisible column that isn't in
  // the visible set. When no visibility state is provided, show everything.
  // Then, if column reorder is enabled and an effective order exists, apply
  // it (structural columns are pinned in place).
  const visibleColumns: Column<TRow>[] = useMemo(() => {
    const base = columnVisibility
      ? columns.filter((c) => c.alwaysVisible || columnVisibility.has(c.id))
      : columns;
    if (!effectiveColumnOrder || effectiveColumnOrder.length === 0) return base;
    const idx = new Map<string, number>();
    effectiveColumnOrder.forEach((id, i) => idx.set(id, i));
    // Stable reorder: structural columns (__*) keep schema position; others
    // sort by their index in effectiveColumnOrder; unknown ids go to the end.
    return [...base].sort((a, b) => {
      const aS = a.id.startsWith('__');
      const bS = b.id.startsWith('__');
      if (aS && bS) return base.indexOf(a) - base.indexOf(b);
      if (aS) return -1;
      if (bS) return 1;
      const ai = idx.has(a.id) ? idx.get(a.id)! : 999;
      const bi = idx.has(b.id) ? idx.get(b.id)! : 999;
      return ai - bi;
    });
  }, [columns, columnVisibility, effectiveColumnOrder]);

  // Drag-and-drop state for header reorder. `dragId` is the column id being
  // dragged; `dragOverId` is the column the cursor is currently over (used to
  // render the drop indicator on the right edge of that header).
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Compute the next column order after dropping `sourceId` on `targetId`.
  const computeReorder = useCallback((sourceId: string, targetId: string): string[] | null => {
    if (sourceId === targetId) return null;
    if (sourceId.startsWith('__') || targetId.startsWith('__')) return null;
    const reorderable = visibleColumns
      .filter((c) => !c.id.startsWith('__'))
      .map((c) => c.id);
    const fromIdx = reorderable.indexOf(sourceId);
    const toIdx = reorderable.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return null;
    const next = [...reorderable];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, sourceId);
    return next;
  }, [visibleColumns]);

  const commitColumnOrder = useCallback((next: string[]) => {
    if (onColumnOrderChange) onColumnOrderChange(next);
    else setInternalColumnOrder(next);
  }, [onColumnOrderChange]);

  // Whether to render the trailing `+` column-manager header. Only when the
  // parent opted in by providing both props.
  const showColumnManager = !!columnVisibility && !!onColumnVisibilityChange;

  // ── Column sizing ──────────────────────────────────────────────────────
  // Round H: user-resizable columns. Width storage is pixel-based per column
  // id. Initial widths come from the schema (column.width is a fraction out
  // of 100; we map that to pixels using the table's measured width so the
  // initial layout matches the old DynamicTable sizing).
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.max(48, resizing.startWidth + (e.clientX - resizing.startX));
      setColumnWidths((prev) => ({ ...prev, [resizing.id]: next }));
    };
    const onUp = () => setResizing(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizing]);

  // Compute the "natural" (schema-derived) pixel width for a column so we
  // have a sensible starting point before the user resizes anything.
  //   schema.width is a fraction out of 100. We scale to pixels against a
  //   nominal container width of 1200 — the table itself is `width: 100%`
  //   so proportional rendering works for any actual container width as
  //   long as we use percentages by default.
  // Structural columns get fixed pixel widths independent of schema.
  const naturalWidthFor = useCallback((col: Column<TRow>): number => {
    if (col.width != null) return Math.max(48, Math.round(col.width * 12));
    return 140;
  }, []);

  const effectiveWidthFor = useCallback((id: string, fallback: number) => {
    const override = columnWidths[id];
    return override ?? fallback;
  }, [columnWidths]);

  // Keyboard nav — uncontrolled internal state if parent doesn't pass focusedRowId.
  const [internalFocus, setInternalFocus] = useState<string | null>(null);
  const focusedRowId = focusedRowIdProp ?? internalFocus;
  const setFocusedRow = useCallback((id: string | null) => {
    if (onFocusedRowChange) onFocusedRowChange(id);
    else setInternalFocus(id);
  }, [onFocusedRowChange]);

  // Page-sliced data. When grouping is active we don't paginate — groups
  // show their own rows. Otherwise we slice by page × rowsPerPage so the
  // caller can pass the full row array and let us handle paging.
  const pagedData: TRow[] = useMemo(() => {
    if (groups && groups.length) return [];
    if (!data) return [];
    if (!rowsPerPage || rowsPerPage <= 0) return data;
    const start = ((page ?? 1) - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, groups, page, rowsPerPage]);

  // Flat list of rows — what keyboard nav + shift-click range operate on.
  // Mirrors what the user actually SEES (excluding collapsed groups).
  const flatData: TRow[] = useMemo(() => {
    if (groups && groups.length) {
      return groups.flatMap((g) => {
        const collapsed = g.isCollapsed || !!collapsedGroups?.has(g.id);
        return collapsed ? [] : g.rows;
      });
    }
    return pagedData;
  }, [pagedData, groups, collapsedGroups]);

  // ── Keyboard nav (j/k/↑/↓/Enter/Esc) ───────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      // Only react when the table region (or its rows) has focus, OR the
      // user is using j/k while no input is focused.
      const active = document.activeElement as HTMLElement | null;
      const inEditor =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable ||
          !!active.closest('[data-jira-table-editor]'));
      if (inEditor) return;
      // Allow j/k/Enter/Esc when a row is already focused (even if DOM focus
      // moved off the table). Other keys require the table region to own focus.
      const tableFocused = el.contains(active);
      const hasFocusedRow = !!focusedRowId;
      const allowAnywhere = ['j', 'k'].includes(e.key) ||
        (hasFocusedRow && (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown'));
      if (!tableFocused && !allowAnywhere) return;

      const orderedIds = flatData.map((r) => getRowId(r));
      const currentIdx = focusedRowId ? orderedIds.indexOf(focusedRowId) : -1;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': {
          e.preventDefault();
          const next = orderedIds[Math.min(currentIdx + 1, orderedIds.length - 1)];
          if (next) setFocusedRow(next);
          break;
        }
        case 'ArrowUp':
        case 'k': {
          e.preventDefault();
          const next = orderedIds[Math.max(currentIdx - 1, 0)];
          if (next) setFocusedRow(next);
          break;
        }
        case 'Enter': {
          if (currentIdx < 0) return;
          e.preventDefault();
          const row = flatData[currentIdx];
          if (row && onRowClick) onRowClick(row);
          break;
        }
        case 'Escape': {
          if (focusedRowId || onEscape) {
            e.preventDefault();
            setFocusedRow(null);
            onEscape?.();
          }
          break;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [flatData, focusedRowId, getRowId, onEscape, onRowClick, setFocusedRow]);

  // Focus-ring style — injected once, scoped to .jira-table-row-focused.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('jira-table-focus-css')) return;
    const style = document.createElement('style');
    style.id = 'jira-table-focus-css';
    style.textContent = `
      /* Focus ring via blue left bar + subtle bg */
      .jira-table-grid .jira-table-row-focused > td:first-child {
        box-shadow: inset 3px 0 0 #0C66E4;
      }
      .jira-table-grid .jira-table-row-focused > td {
        background-color: #F4F5F7 !important;
      }
      /* Grid lines via box-shadow (immune to Atlaskit's em-based overrides). */
      .jira-table-grid table tbody > tr > td {
        box-shadow: inset 0 -1px 0 0 #DFE1E6 !important;
      }
      /* Apr 27, 2026 (Vikram audit pass 4): Type column is icon-only, so
         the standard 12px L/R cell padding leaves ~14px of dead space
         next to the 16px glyph and pushes Key visibly away from Type.
         Tightening to 4px L / 8px R brings the icon flush against the
         column edge and matches Jira's compact icon-column rhythm.
         Targets BOTH the header cell (col 2 — col 1 is the checkbox)
         and every body cell at the same index. */
      .jira-table-grid table thead > tr > th:nth-child(2),
      .jira-table-grid table tbody > tr > td:nth-child(2) {
        padding-left: 4px !important;
        padding-right: 8px !important;
      }
      .jira-table-grid table thead > tr > th {
        box-shadow: inset 0 -2px 0 0 #C1C7D0 !important;
        background: #F7F8F9 !important;
      }
      /* Focused row overrides the td shadow with its own blue bar */
      .jira-table-grid .jira-table-row-focused > td:first-child {
        box-shadow: inset 3px 0 0 #0C66E4, inset 0 -1px 0 0 #DFE1E6 !important;
      }
      /* Row hover */
      .jira-table-grid table tbody > tr:hover > td {
        background-color: #FAFBFC;
      }
      /* Whole-cell hover tint: when an editor trigger inside a cell is hovered
         OR opened, tint the entire <td> so the affordance reads as
         "this whole cell is editable" — matches Jira list-view behaviour. */
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor]:hover),
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor][aria-expanded="true"]) {
        background-color: #F1F2F4 !important;
      }
      /* Key cell -- clearly clickable */
      [data-jira-table-row-open] {
        cursor: pointer;
        border-radius: 3px;
        transition: background 100ms;
      }
      [data-jira-table-row-open]:hover {
        background: #E9F2FF;
        text-decoration: underline;
      }
      /* Inner trigger buttons no longer self-tint (the whole cell tints).
         Keep a subtle ring for keyboard focus. */
      [data-jira-cell-editor]:focus-visible {
        outline: 2px solid #4C9AFF;
        outline-offset: -2px;
        border-radius: 3px;
      }
      /* Empty-cell ghost affordance (e.g. "Set status" / "Add parent" /
         "Unassigned" placeholder). Faded by default; reads as full text on
         row hover so users discover the cell is editable. */
      [data-jira-cell-ghost] {
        color: #97A0AF;
        font-style: italic;
        transition: color 80ms ease;
      }
      .jira-table-grid table tbody > tr:hover [data-jira-cell-ghost] {
        color: #5E6C84;
      }
      /* ── Round H additions ─────────────────────────────────────────
         Sticky header + resize handle. The scroll container is the table
         viewport (.jira-table-viewport); position: sticky references
         that nearest scrolling ancestor. */
      /* Responsive shell — viewport scrolls horizontally on narrow viewports
         instead of overflowing the page. The colgroup keeps a stable
         minimum total width via min-width on each <col>; the wrapping
         table also pins a min-width so it never collapses below ~800px
         (the point below which Jira itself starts horizontal scrolling). */
      .jira-table-viewport {
        position: relative;
        overflow-x: auto;
        overflow-y: auto;
        max-height: 100%;
        width: 100%;
        /* Smooth horizontal scroll on touchpads / mobile */
        -webkit-overflow-scrolling: touch;
        /* Apr 27, 2026 (audit pass 9): scrollbar-gutter:stable reserves
           a fixed gutter for the vertical scrollbar so layout doesn't
           shift when rows fill / drain. Without this, removing the
           outer-wrapper padding made the right edge "jump" by ~12px
           every time the scrollbar appeared/disappeared. */
        scrollbar-gutter: stable;
      }
      .jira-table-grid table {
        width: 100%;
        /* Apr 27, 2026 (audit pass 9): min-width 1180 → 1100. 1180 was
           ABOVE the table's parent width (~1133–1145px on a 1214 window
           with panel closed), forcing horizontal scroll even at the
           default state — that's the "empty space on the side AND
           crunched dates" perception the user surfaced (dates were
           shown via the scroll-clipped right edge, not because of
           crushing). 1100 lets the table fit fully inside ~1145 of
           parent width on common 13" / 14" displays, then engages
           horizontal scroll only when the right rail opens (parent
           drops to ~750). Each col's allocation at 1100 still meets
           or exceeds natural minimum (type 33 / key 88 / summary 242 /
           status 121 / comments 88 / parent 132 / assignee 121 /
           priority 77 / created 88 / updated 88 / actions 33). */
        min-width: 1100px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }
      /* On very narrow viewports we still keep the natural column floor
         so cells never truncate; .jira-table-viewport's overflow-x:auto
         takes over. */
      @media (max-width: 900px) {
        .jira-table-grid table { min-width: 1100px; }
      }
      .jira-table-grid thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #F7F8F9;
        padding: 8px 12px;
        text-align: left;
        /* Apr 27, 2026 (Vikram audit pass 8): without overflow:hidden +
           text-overflow:ellipsis the header text BLEEDS into the next
           column whenever the rendered column width is narrower than the
           text's natural width. "Comments" at 53px (rendered) needs 66px
           (natural) → "Comm…" overlaps Parent. With these two declarations
           the cell clips cleanly with an ellipsis instead. Body td cells
           already clip via the inner div wrapper at line ~870. */
        overflow: hidden;
        text-overflow: ellipsis;
        /* Re-measured 2026-04-26 from Jira BAU list view header "Summary":
             - 12px / weight 653 (Charlie variable; matched exactly)
             - color #6B6E76 (color.text.subtle — re-probed 2026-04-27 vs
               Jira, was previously written as #505258 from a stale probe)
             - text-transform: none (Title Case — NOT uppercase)
             - letter-spacing: normal (NOT 0.04em)
           Catalyst's previous UPPERCASE / wide-tracked / muted-grey
           treatment was a Catalyst opinion. Matching Jira's actual list
           view here for parity. Apr 27 2026 jira-compare regression
           (D-005 + D-006): fontWeight 700 → 653, color #505258 → #6B6E76. */
        font-size: 12px;
        font-weight: 653;
        color: #6B6E76;
        text-transform: none;
        letter-spacing: normal;
        white-space: nowrap;
        user-select: none;
      }
      .jira-table-grid thead th.jira-th-sortable { cursor: pointer; }
      .jira-table-grid thead th.jira-th-sortable:hover { background: #EBECF0; }
      .jira-table-grid tbody td {
        padding: 0 12px;
        vertical-align: middle;
        background: #FFFFFF;
        /* Apr 27, 2026 (L60): explicit typography baseline per Jira-parity
           spec — 14/20/400 with primary text color. Cells with their own
           cell-renderers (Lozenge, Avatar, dates, etc.) override locally;
           all unstyled text inherits this default so we don't drift.
           Apr 28, 2026 (jira-compare cycle 2 typography RCA): switched
           from legacy hardcoded #172B4D (rgb 23,43,77 — old Atlassian
           Refresh "neutral 800") to the modern --ds-text token (resolves
           to rgb 41,42,46 on Jira /list per live probe of Catalyst H1
           AND Jira BAU body cells). The legacy hex was the cause of the
           washed-out / blue-shifted body text Vikram flagged: every body
           td was rendering #172B4D while headers + H1 used the modern
           token. Token-first ensures dark-mode + Nocturne switch flips
           too. Fallback hex updated to #292A2E to match Jira's resolved
           --ds-text in light theme. */
        font-size: 14px;
        line-height: 20px;
        font-weight: 400;
        color: var(--ds-text, #292A2E);
        font-family: inherit;
      }
      /* Column resize handle — 6px hit area on the right edge of each
         sortable/resizable header. Highlights on hover to advertise. */
      .jira-resize-handle {
        position: absolute;
        top: 0;
        right: -3px;
        height: 100%;
        width: 6px;
        cursor: col-resize;
        user-select: none;
        z-index: 3;
      }
      .jira-resize-handle:hover::after,
      .jira-resize-handle[data-active="true"]::after {
        content: '';
        position: absolute;
        top: 6px;
        right: 2px;
        bottom: 6px;
        width: 2px;
        background: #4C9AFF;
        border-radius: 1px;
      }
      .jira-table-grid tbody tr.jira-table-group-row > td {
        background: #F4F5F7 !important;
      }

      /* ── Apr 27, 2026 (L59): Sticky Key-column prefix ──
         Per Jira parity spec: when horizontal scroll occurs, the row
         identifier (checkbox + type icon + Key) stays anchored on the
         left edge so users never lose track of which row they're
         reading. Implemented as three sticky columns forming a frozen
         prefix. Hardcoded left offsets are approximations of
         checkbox=48px and type=48px column widths — refine if column
         widths drift. z-index stack:
           - body sticky cells: z-index 1
           - header sticky cells: z-index 3 (above body sticky)
           - top-left intersection: z-index 4 (handled via thead overrides)

         References:
           https://atlassian.design/foundations/tokens (border + surface)
      */
      /* Apr 27, 2026 (Vikram audit pass 5): frozen-prefix sticky
         positioning REMOVED. The previous version pinned cells 1-3
         (select / type / key) with hardcoded left offsets
         (0 / 48px / 151px) that assumed Type col was 103px wide.
         When Type was tightened to ~43px (icon-only column), col 3
         (Key) still tried to float at left:151px while col 2 ended
         at x ~ 91px, leaving a 60px hole between every Type icon and
         the Key text. The DOM probe caught this exactly. Frozen
         columns are valuable on Jira narrow-viewport list views
         but Catalyst rarely horizontal-scrolls on a 1214px+ viewport
         (with the 1040px min-width); the cost (alignment bugs every
         time anyone resizes a column) outweighs the benefit. Re-add
         later with dynamic offsets if needed. */
      .jira-table-grid thead th:nth-child(1),
      .jira-table-grid thead th:nth-child(2),
      .jira-table-grid thead th:nth-child(3) {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #F7F8F9;
      }
      /* Header z-index for non-sticky-left case — no left-pin, just
         keep header floating above body on vertical scroll. */
      .jira-table-grid tbody td:nth-child(3) {
        box-shadow: none;
      }
      /* Group rows (collapsed/group headers) need to keep their
         lighter bg even on sticky cells — override the default white. */
      .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(1),
      .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(2),
      .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(3) {
        background: #F4F5F7 !important;
      }
      /* ── Critique fixes (2026-04) — ported from the retired legacy table ──
         Center the selection checkbox in its column.
         AkCheckbox renders a hidden <input> inside a <label> that normally
         takes left-side layout, pushing the visible SVG 6px right of centre.
         We collapse the label paddings and absolute-position the input so
         the SVG alone is the laid-out child. */
      .jira-table-grid table thead > tr > th:first-child,
      .jira-table-grid table tbody > tr > td:first-child {
        text-align: center;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .jira-table-grid table thead > tr > th:first-child > span,
      .jira-table-grid table tbody > tr > td:first-child > [data-jira-table-editor],
      .jira-table-grid table tbody > tr > td:first-child > div {
        display: flex !important;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .jira-table-grid table > * tr > *:first-child label {
        /* CRITICAL — containment for the 100%×100% absolute input below.
           Without this, every row's invisible checkbox input escapes up the
           DOM to the nearest positioned ancestor (often the viewport), stacks
           on top of every other row's input, and real mouse clicks always
           hit the last-rendered input — i.e. clicking row 1 toggles some
           other row's checkbox. (RCA 2026-04-18, task #64.) */
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
        gap: 0 !important;
        display: inline-flex !important;
        justify-content: center !important;
        align-items: center !important;
      }
      .jira-table-grid table > * tr > *:first-child label > span:not([role]):not([data-jira-table-editor]) {
        display: none !important;
      }
      .jira-table-grid table > * tr > *:first-child label > input[type="checkbox"] {
        position: absolute !important;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
      }
      /* Strengthen grid lines to match the legacy renderer + critique-fix tone. */
      .jira-table-grid table tbody > tr > td {
        box-shadow: inset 0 -1px 0 0 #E4E6EA !important;
      }
      /* Row hover tint matches Jira's list view. */
      .jira-table-grid table tbody > tr:hover > td {
        background-color: #F7F8F9 !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Selection helpers
  const selectedSet = selection ?? new Set<string>();
  const allSelected =
    flatData.length > 0 &&
    flatData.every((row) => selectedSet.has(getRowId(row)));

  // Shift-click range anchor — the id of the LAST checkbox the user clicked
  // without shift held. A subsequent shift-click selects everything between
  // anchor and the new target in the currently-visible order.
  const lastSelectedIdRef = useRef<string | null>(null);
  const toggleRow = useCallback(
    (id: string, next: boolean, withShift: boolean = false) => {
      if (!onSelectionChange) return;
      const clone = new Set(selectedSet);

      if (withShift && lastSelectedIdRef.current && lastSelectedIdRef.current !== id) {
        // Range select between anchor and current, using flatData order.
        const ordered = flatData.map((r) => getRowId(r));
        const anchorIdx = ordered.indexOf(lastSelectedIdRef.current);
        const curIdx = ordered.indexOf(id);
        if (anchorIdx >= 0 && curIdx >= 0) {
          const [lo, hi] = anchorIdx < curIdx ? [anchorIdx, curIdx] : [curIdx, anchorIdx];
          for (let i = lo; i <= hi; i += 1) {
            if (next) clone.add(ordered[i]); else clone.delete(ordered[i]);
          }
          onSelectionChange(clone);
          // Do NOT reset the anchor on shift-click so the user can expand
          // the range further with additional shift-clicks.
          return;
        }
      }

      if (next) clone.add(id);
      else clone.delete(id);
      lastSelectedIdRef.current = id;
      onSelectionChange(clone);
    },
    [flatData, getRowId, onSelectionChange, selectedSet],
  );

  const toggleAll = useCallback(
    (next: boolean) => {
      if (!onSelectionChange) return;
      const clone = new Set(selectedSet);
      if (next) flatData.forEach((r) => clone.add(getRowId(r)));
      else flatData.forEach((r) => clone.delete(getRowId(r)));
      onSelectionChange(clone);
    },
    [flatData, getRowId, onSelectionChange, selectedSet],
  );

  // ── Build @atlaskit/dynamic-table head ────────────────────────────────────
  const head = useMemo(() => {
    const cells: Array<{
      key: string;
      content: React.ReactNode;
      isSortable?: boolean;
      width?: number;
    }> = [];

    if (selectable) {
      cells.push({
        key: '__select',
        content: (
          <AkCheckbox
            isChecked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            label=""
          />
        ),
        width: 3,
      });
    }

    for (const col of visibleColumns) {
      cells.push({
        key: col.id,
        content: (
          <span
            // Header label — Jira parity (2026-04-26 re-probe from
            // BAU list view "Summary"): 12px / 700 / #505258 /
            // textTransform none / letterSpacing normal. NO uppercase.
            style={{
              fontSize: d.headerFontSize,
              fontWeight: 700,
              color: '#505258',
              textTransform: 'none',
              letterSpacing: 'normal',
              whiteSpace: 'nowrap',
            }}
          >
            {col.label}
          </span>
        ),
        isSortable: !!col.sortable,
        width: col.width,
      });
    }

    // Trailing `+` column manager header.
    if (showColumnManager) {
      cells.push({
        key: '__column-manager',
        content: (
          <ColumnManagerTrigger
            columns={columns}
            visibility={columnVisibility!}
            onChange={onColumnVisibilityChange!}
          />
        ),
        width: 3,
      });
    }

    return { cells };
  }, [allSelected, visibleColumns, columns, columnVisibility, onColumnVisibilityChange, showColumnManager, d.headerFontSize, selectable, toggleAll]);

  // ── Build @atlaskit/dynamic-table rows ────────────────────────────────────
  // If grouped, insert group-header pseudo-rows between groups.
  const rows = useMemo(() => {
    const out: Array<{
      key: string;
      onClick?: (e: React.MouseEvent) => void;
      cells: Array<{ key: string; content: React.ReactNode; colSpan?: number }>;
    }> = [];

    const renderDataRow = (row: TRow) => {
      const id = getRowId(row);
      const isSelected = selectedSet.has(id);
      const isFocused = focusedRowId === id;

      const rowCells: Array<{ key: string; content: React.ReactNode; colSpan?: number }> = [];

      if (selectable) {
        rowCells.push({
          key: `${id}-select`,
          content: (
            <span
              data-jira-table-editor // marker: click shouldn't trigger row navigation
              onClick={(e) => e.stopPropagation()}
            >
              <AkCheckbox
                isChecked={isSelected}
                onChange={(e) => {
                  // Support shift-click range select (catalog 047). Atlaskit's
                  // Checkbox forwards the native event; we inspect its shiftKey.
                  const shift = !!(e.nativeEvent as MouseEvent)?.shiftKey;
                  toggleRow(id, e.target.checked, shift);
                }}
                label=""
              />
            </span>
          ),
        });
      }

      // Depth-based hierarchy indent (Jira matches at 16px per depth level).
      // Applied as left padding on the FIRST data column so child rows visually
      // nest under their parent without affecting selection / icon columns.
      const depth = getRowDepth?.(row) ?? 0;
      const indentPx = Math.max(0, depth) * 16;
      let firstDataColIdx = -1; // index in `columns` array of the first column that should carry the indent

      visibleColumns.forEach((col, colIdx) => {
        const accessor = col.accessor ?? ((r: TRow) => (r as any)[col.id]);
        const value = accessor(row);

        // The first column that's NOT a checkbox/caret/icon-only marker gets
        // the depth indent. We treat any column whose id starts with `__` as
        // structural and skip it — except for `__caret`, which is the natural
        // anchor for the indent (so the caret column still renders to the
        // RIGHT of the indent margin and lines up correctly on the second
        // hierarchy level).
        if (firstDataColIdx === -1 && col.id !== '__select') {
          firstDataColIdx = colIdx;
        }
        const isFirstDataCol = colIdx === firstDataColIdx;

        rowCells.push({
          key: `${id}-${col.id}`,
          content: (
            <div
              style={{
                fontSize: d.cellFontSize,
                color: '#292A2E',
                paddingTop: d.cellPaddingY - 4,
                paddingBottom: d.cellPaddingY - 4,
                paddingLeft: isFirstDataCol && indentPx > 0 ? indentPx : undefined,
                minHeight: d.rowHeight - 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  col.align === 'end'
                    ? 'flex-end'
                    : col.align === 'center'
                    ? 'center'
                    : 'flex-start',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Apr 27 2026 (jira-compare regression F-NEW-3 — issue half
                  + functional fill): uniform 24×24 chevron slot at the
                  START of the first data column on EVERY issue row.
                  Matches Jira parity probe testid
                  `business-list.ui.list-view.base-table.expand-icon.expand-button`.
                  When `getRowHasChildren` returns true for the row, the
                  slot renders an interactive ChevronRight/Down button
                  that toggles `expandedRowIds` via `onToggleRowExpanded`.
                  Rows without children get an empty 24×24 placeholder
                  so column geometry stays uniform. */}
              {isFirstDataCol && (() => {
                const rowHasChildren = !!getRowHasChildren?.(row);
                const isExpanded = !!expandedRowIds?.has(id);
                if (rowHasChildren && onToggleRowExpanded) {
                  return (
                    <button
                      type="button"
                      data-jira-table-issue-chevron-button
                      data-testid="jira-table.row.expand-button"
                      aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
                      aria-expanded={isExpanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRowExpanded(id);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        marginRight: 4,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        color: '#6B6E76',
                        borderRadius: 3,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDownIcon label="" size="small" />
                      ) : (
                        <ChevronRightIcon label="" size="small" />
                      )}
                    </button>
                  );
                }
                return (
                  <span
                    aria-hidden="true"
                    data-jira-table-issue-chevron-slot
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      marginRight: 4,
                    }}
                  />
                );
              })()}
              <CellRenderer
                cell={col.cell}
                row={row}
                value={value}
                isFocused={isFocused}
                isSelected={isSelected}
                commit={(next) => onCellEdit?.(row, col.id, next)}
              />
            </div>
          ),
        });
      });

      // Match the trailing `+` column-manager header with an empty row cell
      // so row/header widths line up under @atlaskit/dynamic-table's isFixedSize.
      if (showColumnManager) {
        rowCells.push({
          key: `${id}-__column-manager`,
          content: <span aria-hidden="true" />,
        });
      }

      return {
        key: id,
        className: isFocused ? 'jira-table-row-focused' : undefined,
        onClick: (e: React.MouseEvent) => {
          // Jira-style: the ROW itself is not clickable. Only the element
          // marked with data-jira-table-row-open (set by makeKeyCell) opens
          // the detail panel. Everything else falls through to that cell's
          // own editor (or does nothing).
          const target = e.target as HTMLElement;
          const opener = target.closest('[data-jira-table-row-open]');
          if (!opener) return;
          setFocusedRow(id);
          onRowClick?.(row);
        },
        // Right-click → context menu at cursor. Skipped inside form controls
        // and editor buttons so native menus still work there.
        onContextMenu: contextMenuActions && contextMenuActions.length > 0 ? (e: React.MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
          e.preventDefault();
          setFocusedRow(id);
          setCtxMenu({ row, x: e.clientX, y: e.clientY });
        } : undefined,
        cells: rowCells,
      };
    };

    if (groups && groups.length) {
      // Total cell count = selection + visible data columns + trailing manager.
      // We pad the group header cells so DynamicTable's isFixedSize layout
      // doesn't complain about head/row cell-count mismatch — the actual
      // visual "span" is handled by the first cell's absolute width + the
      // trailing cells being empty.
      const totalCellCount =
        (selectable ? 1 : 0) + visibleColumns.length + (showColumnManager ? 1 : 0);

      for (const g of groups) {
        const collapsed = g.isCollapsed || !!collapsedGroups?.has(g.id);
        const groupCells: Array<{ key: string; content: React.ReactNode; colSpan?: number }> = [];

        // Group select-all checkbox (catalog 088) — state mirrors the
        // selection Set. Only rendered when the table is selectable.
        const groupRowIds = g.rows.map((r) => getRowId(r));
        const allSelectedInGroup =
          groupRowIds.length > 0 && groupRowIds.every((rid) => selectedSet.has(rid));
        const someSelectedInGroup =
          !allSelectedInGroup && groupRowIds.some((rid) => selectedSet.has(rid));

        if (selectable) {
          groupCells.push({
            key: `__group-${g.id}-select`,
            content: (
              <span
                data-jira-table-editor
                onClick={(e) => e.stopPropagation()}
              >
                <AkCheckbox
                  isChecked={allSelectedInGroup}
                  isIndeterminate={someSelectedInGroup}
                  onChange={(e) => {
                    if (!onSelectionChange) return;
                    const clone = new Set(selectedSet);
                    if (e.target.checked) {
                      groupRowIds.forEach((rid) => clone.add(rid));
                    } else {
                      groupRowIds.forEach((rid) => clone.delete(rid));
                    }
                    onSelectionChange(clone);
                  }}
                  label={`Select all in ${g.label}`}
                />
              </span>
            ),
          });
        }

        // Apr 27, 2026 (audit pass 9): the original comment said "DynamicTable
        // won't let us colSpan, render label in first cell and leave the
        // rest empty". We're no longer on DynamicTable (Round H switched
        // to a plain <table>), so colSpan IS available. Without it the
        // 12px-padded label cell was being placed in the 43px-wide Type
        // column → "AWAITING" / "BACKLOG" / "BETA READY" / "BLOCKED" /
        // "CLOSED" all clipped to 4 chars (AWAI / BACK / BETA / BLOC /
        // CLOS). We now mark the header cell with `colSpan` covering all
        // remaining columns and stop padding empty trailing cells.
        groupCells.push({
          key: `__group-${g.id}-header`,
          colSpan: totalCellCount - groupCells.length,
          content: (
            <div
              role={onToggleGroup ? 'button' : undefined}
              tabIndex={onToggleGroup ? 0 : undefined}
              aria-expanded={onToggleGroup ? !collapsed : undefined}
              onClick={onToggleGroup ? () => onToggleGroup(g.id) : undefined}
              onKeyDown={onToggleGroup ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleGroup(g.id); }
              } : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                margin: '-10px -12px',  // bleed into the cell padding
                fontSize: 12,
                fontWeight: 700,
                color: '#42526E',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: onToggleGroup ? 'pointer' : 'default',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {onToggleGroup && (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    color: '#6B6E76',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 120ms ease',
                  }}
                >
                  {/* Apr 27 2026 jira-compare regression F-NEW-3: replaced
                      literal Unicode ▾ character with @atlaskit/icon
                      ChevronDownIcon. Sized to 24×24 to match Jira's
                      group-item.expand-icon-wrapper geometry probed at
                      /jira/.../list?groupBy=status. The outer span keeps
                      the rotate-on-collapse animation and click handler
                      (delegated up to the wrapper div). */}
                  <ChevronDownIcon label="" size="small" />
                </span>
              )}
              {onAddToGroup && (
                <button
                  type="button"
                  data-testid="jira-table.group-row.add-issue-button"
                  aria-label={`Add issue to ${g.label}`}
                  onClick={(e) => {
                    // Stop the click bubbling to the wrapper div which
                    // toggles group expand/collapse — we want this button
                    // to be a SEPARATE affordance per Jira parity.
                    e.stopPropagation();
                    onAddToGroup(g.id);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    color: '#6B6E76',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Apr 27 2026 jira-compare regression F-NEW-2 (in-session):
                      per-group "+" affordance matching Jira parity probe
                      `business-list.common.ui.create-issue-plus-button.child-create-button-wrapper`
                      at (203, 328), 24×24, after the chevron and before the
                      group label. Click stops propagation so the group expand
                      doesn't toggle. Consumer (BacklogPage) wires onAddToGroup
                      to its create-flow. */}
                  <PlusIcon size={14} />
                </button>
              )}
              {/* Apr 27, 2026 (audit pass 10): if the consumer provided
                  a labelNode (Lozenge / Avatar+name / PriorityBars+name /
                  IssueIcon+key), render it INSTEAD of the plain
                  uppercase string label. The wrapper still owns the
                  layout so chevron + label + count line up correctly. */}
              {(g as any).labelNode != null ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                  {(g as any).labelNode}
                </span>
              ) : (
                <span>{g.label}</span>
              )}
              <span
                style={{
                  padding: '1px 8px',
                  background: '#DFE1E6',
                  borderRadius: 10,
                  color: '#42526E',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {g.rows.length}
              </span>
              {g.meta && (
                <span style={{ fontWeight: 500, color: '#6B778C', letterSpacing: 0, textTransform: 'none' }}>
                  {g.meta}
                </span>
              )}
            </div>
          ),
        });
        // Pass 9: padding cells removed — the header now uses colSpan
        // to occupy the rest of the row width (see header cell above).

        out.push({
          key: `__group-${g.id}`,
          // `className` lets us tint the whole row.
          // @atlaskit/dynamic-table respects className on row objects.
          cells: groupCells,
        } as any);

        // Apr 27 2026 (jira-compare regression F-NEW-2 functional fill):
        // when consumer provides renderGroupInlineRow and returns non-null
        // for this group's id, push it as an extra row immediately after
        // the group header. The row's content spans the full table width
        // via a single cell with colSpan-equivalent rendering. Used to
        // host the inline create form when "+" was clicked.
        if (!collapsed && renderGroupInlineRow) {
          const inline = renderGroupInlineRow(g.id);
          if (inline != null) {
            const totalCols = (selectable ? 1 : 0) + visibleColumns.length + (showColumnManager ? 1 : 0);
            out.push({
              key: `__group-${g.id}-inline-create`,
              className: 'jira-table-group-inline-create-row',
              cells: [
                {
                  key: `__group-${g.id}-inline-content`,
                  colSpan: totalCols,
                  content: inline,
                },
              ],
            } as any);
          }
        }

        if (!collapsed) for (const row of g.rows) out.push(renderDataRow(row));
      }
    } else {
      for (const row of pagedData) out.push(renderDataRow(row));
    }

    return out;
  }, [
    visibleColumns,
    d.cellFontSize,
    d.cellPaddingY,
    d.rowHeight,
    pagedData,
    focusedRowId,
    getRowDepth,
    getRowId,
    groups,
    collapsedGroups,
    onToggleGroup,
    onAddToGroup,
    renderGroupInlineRow,
    getRowHasChildren,
    expandedRowIds,
    onToggleRowExpanded,
    contextMenuActions,
    onCellEdit,
    onRowClick,
    onSelectionChange,
    selectable,
    selectedSet,
    showColumnManager,
    toggleRow,
  ]);

  // ── Cell-width calculation for THEAD + TBODY ───────────────────────────
  // Each column gets a `colgroup` entry so widths are stable across header
  // AND body cells.
  //
  // Sizing strategy (2026-04-26 update — fixes summary-column truncation
  // observed in narrow viewports):
  //   - Structural columns (__select, __column-manager) → fixed pixel width.
  //   - Data columns the user has resized → pixel width from columnWidths.
  //   - Data columns with a schema `width` (fractional, out of 100) →
  //     percentage width. With table-layout: fixed + width: 100% on the
  //     <table>, percentage <col> elements distribute the available space
  //     proportionally, so the table flexes with viewport changes and the
  //     Summary column expands to fill the row instead of clipping at a
  //     fixed pixel size.
  //   - Data columns without a schema width → fall back to 140px.
  //
  // `width` (number) on each entry is the resolved PIXEL width — used by
  // resize logic. `widthCss` is the CSS value applied to the <col> element
  // (string with `px` or `%`).
  const colWidthEntries: Array<{
    id: string;
    width: number;
    widthCss: string;
    resizable: boolean;
    sortable: boolean;
  }> = [];
  if (selectable) {
    const px = effectiveWidthFor('__select', 40);
    colWidthEntries.push({ id: '__select', width: px, widthCss: `${px}px`, resizable: false, sortable: false });
  }
  for (const col of visibleColumns) {
    const userOverride = columnWidths[col.id];
    const naturalPx = naturalWidthFor(col);
    // When the user has resized this column, lock to pixel. Otherwise
    // prefer percentage so the table flexes with viewport. Data columns
    // without a schema width default to the natural pixel value.
    const widthCss = userOverride != null
      ? `${userOverride}px`
      : col.width != null
        ? `${col.width}%`
        : `${naturalPx}px`;
    colWidthEntries.push({
      id: col.id,
      width: userOverride ?? naturalPx,
      widthCss,
      resizable: !col.id.startsWith('__'),
      sortable: !!col.sortable,
    });
  }
  if (showColumnManager) {
    const px = effectiveWidthFor('__column-manager', 40);
    colWidthEntries.push({ id: '__column-manager', width: px, widthCss: `${px}px`, resizable: false, sortable: false });
  }

  // ── Row virtualization (staged — see import-block comment above) ───────
  // The full @tanstack/react-virtual wiring is staged behind a dev-server
  // restart (vite.config.ts optimizeDeps.include was updated on 2026-04-26
  // but cold-restart needs manual `npm run dev`). For now, the prop is
  // accepted but ignored — every row renders. To activate after a clean
  // dev start: (1) re-add `import { useVirtualizer } from '@tanstack/react-virtual';`
  // at the top of this file, (2) replace this block with the full
  // virtualizer state, (3) re-add the virtualized tbody branch. Diff is
  // preserved in audit history (.catalyst/audits/jira-compare/2026-04-26-bau-backlog/).
  const viewportRef = useRef<HTMLDivElement>(null);
  const useVirtual = false;
  // Reference enableVirtualization so TS doesn't strip it as unused before
  // the wiring is restored. (Effectively a no-op today.)
  if (enableVirtualization && useVirtual) { /* placeholder */ }

  const handleHeaderClick = (colId: string, sortableLocal: boolean) => {
    if (!sortableLocal) return;
    if (colId.startsWith('__')) return;
    if (!onSortChange) return;
    // Tri-state: ASC → DESC → clear
    if (sortKey !== colId) onSortChange(colId, 'ASC');
    else if (sortOrder === 'ASC') onSortChange(colId, 'DESC');
    else onSortChange('', 'ASC'); // parent interprets empty key as cleared
  };

  return (
    <div
      ref={containerRef}
      className="jira-table-grid"
      aria-label={ariaLabel}
      tabIndex={0}
      style={{
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
        fontSize: d.cellFontSize,
        color: '#292A2E',
        outline: 'none',
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        // Apr 27, 2026 — jira-compare audit P2 #10: Jira's outer table
        // card uses 8px border-radius; Catalyst was 6px. Bumped to
        // match — minor token drift, single-line change.
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 120,
      }}
    >
      <div className="jira-table-viewport" ref={viewportRef}>
        <table role="grid">
          <colgroup>
            {colWidthEntries.map((e) => (
              <col key={e.id} style={{ width: e.widthCss, minWidth: 48 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {head.cells.map((cell, idx) => {
                const meta = colWidthEntries[idx];
                const isSorted = meta && sortKey === meta.id;
                const isStructural = !!meta && meta.id.startsWith('__');
                const isReorderable = enableColumnReorder && !!meta && !isStructural;
                // Apr 27 2026 (jira-compare regression F-NEW-3 issue half):
                // first non-structural column header gets a 24×24 placeholder
                // BEFORE the label content so the column-grid alignment
                // matches body rows (which prepend a chevron slot via
                // `data-jira-table-issue-chevron-slot`). Without this, the
                // header text would float at the unindented column origin
                // while body cells start +28px right of it.
                const firstDataColKey =
                  head.cells.find((c) => !c.key.startsWith('__'))?.key;
                const isFirstDataColHeader =
                  !isStructural && cell.key === firstDataColKey;
                const isDraggingThis = isReorderable && dragId === meta!.id;
                const isDragOverThis = isReorderable && dragOverId === meta!.id && dragId && dragId !== meta!.id;
                return (
                  <th
                    key={cell.key}
                    className={meta?.sortable ? 'jira-th-sortable' : undefined}
                    aria-sort={isSorted ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => meta && handleHeaderClick(meta.id, meta.sortable)}
                    // ── Column reorder (HTML5 native DnD; opt-in) ──────────
                    // Only reorderable columns become draggable. Structural
                    // columns (__select, __column-manager) ignore drag events.
                    draggable={isReorderable}
                    onDragStart={isReorderable ? (e) => {
                      // Don't fire from inside the resize handle.
                      const t = e.target as HTMLElement;
                      if (t.classList?.contains('jira-resize-handle')) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.effectAllowed = 'move';
                      try { e.dataTransfer.setData('text/plain', meta!.id); } catch { /* some browsers */ }
                      setDragId(meta!.id);
                    } : undefined}
                    onDragOver={isReorderable ? (e) => {
                      if (!dragId || dragId === meta!.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverId !== meta!.id) setDragOverId(meta!.id);
                    } : undefined}
                    onDragLeave={isReorderable ? () => {
                      if (dragOverId === meta!.id) setDragOverId(null);
                    } : undefined}
                    onDrop={isReorderable ? (e) => {
                      e.preventDefault();
                      const sourceId = (e.dataTransfer.getData('text/plain') || dragId) as string;
                      if (!sourceId) { setDragId(null); setDragOverId(null); return; }
                      const next = computeReorder(sourceId, meta!.id);
                      if (next) commitColumnOrder(next);
                      setDragId(null);
                      setDragOverId(null);
                    } : undefined}
                    onDragEnd={isReorderable ? () => {
                      setDragId(null);
                      setDragOverId(null);
                    } : undefined}
                    style={{
                      position: 'sticky',
                      top: 0,
                      boxShadow: isDragOverThis
                        ? 'inset -2px 0 0 0 #0C66E4, inset 0 -2px 0 0 #C1C7D0'
                        : 'inset 0 -2px 0 0 #C1C7D0',
                      cursor: isReorderable ? (isDraggingThis ? 'grabbing' : 'grab') : undefined,
                      opacity: isDraggingThis ? 0.55 : 1,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {/* F-NEW-3 chevron-slot placeholder in the header,
                          mirrors body-row slot at `data-jira-table-issue-chevron-slot`. */}
                      {isFirstDataColHeader && (
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-block',
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            marginRight: 4,
                          }}
                        />
                      )}
                      {cell.content}
                      {meta?.sortable && isSorted && (
                        <span aria-hidden="true" style={{ color: '#6B778C' }}>
                          {sortOrder === 'ASC' ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                    {meta?.resizable && (
                      <span
                        className="jira-resize-handle"
                        data-active={resizing?.id === meta.id ? 'true' : 'false'}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize column"
                        // Don't initiate column reorder from the resize handle.
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizing({ id: meta.id, startX: e.clientX, startWidth: meta.width });
                        }}
                        // Double-click to auto-reset this column to its
                        // schema-derived natural width — matches common
                        // spreadsheet / Jira behaviour.
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setColumnWidths((prev) => {
                            const next = { ...prev };
                            delete next[meta.id];
                            return next;
                          });
                        }}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={colWidthEntries.length} style={{ padding: '32px 12px', textAlign: 'center' }}>
                  <Spinner size="large" label="Loading" />
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && emptyView && (
              <tr>
                <td colSpan={colWidthEntries.length} style={{ padding: '32px 12px' }}>
                  {emptyView}
                </td>
              </tr>
            )}
            {!isLoading && rows.map((r: any) => {
              const isGroup = typeof r.key === 'string' && r.key.startsWith('__group-');
              return (
                <tr
                  key={r.key}
                  className={[r.className, isGroup ? 'jira-table-group-row' : ''].filter(Boolean).join(' ')}
                  onClick={r.onClick}
                  onContextMenu={r.onContextMenu}
                  style={{ height: d.rowHeight }}
                >
                  {r.cells.map((c: any) => (
                    <td key={c.key} colSpan={c.colSpan} style={{ overflow: 'hidden' }}>
                      {c.content}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Apr 27, 2026 (L70): bottomSlot renders INSIDE the viewport
            so the horizontal scrollbar appears BELOW it, not between
            it and the table content. Lets a "+ Create" row sit flush
            against the table's last row with zero visual gap. */}
        {props.bottomSlot}
      </div>

      {/* Pagination footer — simple prev / next / page counter. Only shown
          when the caller provides onPageChange + rowsPerPage and data
          exceeds one page. Hidden entirely when grouping is active.
          Uses the UN-SLICED `data.length` so the total page count is
          correct — JiraTable slices internally (see pagedData). */}
      {onPageChange && rowsPerPage && rowsPerPage > 0 && !groups && (() => {
        const totalItems = data?.length ?? 0;
        const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
        if (totalPages <= 1) return null;
        const current = page ?? 1;
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '8px 12px',
            borderTop: '1px solid #DFE1E6',
            fontSize: 13,
            color: '#42526E',
            background: '#FFFFFF',
          }}>
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, current - 1))}
              disabled={current <= 1}
              style={pageBtnStyle(current <= 1)}
            >‹ Prev</button>
            <span>Page {current} of {totalPages}</span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, current + 1))}
              disabled={current >= totalPages}
              style={pageBtnStyle(current >= totalPages)}
            >Next ›</button>
          </div>
        );
      })()}

      {/* Right-click context menu (portal, cursor-anchored).
          Shares action vocabulary with the per-row ⋯ menu for consistency. */}
      {ctxMenu && contextMenuActions && createPortal(
        <div
          ref={ctxMenuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 1100,
            minWidth: 200,
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 4,
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: '#292A2E',
          }}
        >
          {contextMenuActions
            .filter((a) => !a.hidden?.(ctxMenu.row))
            .map((a) => {
              const disabled = !!a.disabled?.(ctxMenu.row);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    a.onClick(ctxMenu.row);
                    setCtxMenu(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 10px',
                    border: 'none',
                    background: 'transparent',
                    // Apr 28, 2026 (jira-compare cycle 3 typography sweep):
                    // legacy #172B4D → --ds-text fallback #292A2E to match
                    // the rest of the table's body-text token swap.
                    color: a.danger ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text, #292A2E)',
                    fontSize: 14,
                    textAlign: 'left',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    fontFamily: 'inherit',
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = a.danger ? '#FFEBE6' : '#F4F5F7'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {a.icon}
                  <span style={{ flex: 1 }}>{a.label}</span>
                </button>
              );
            })}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   ColumnManagerTrigger
   ─────────────────────────────────────────────────────────────────────────
   Trailing `+` column header. Opens a portal popover with:
     - search filter across column labels
     - checkbox row per toggleable column (alwaysVisible columns are locked)
     - Reset button (restores only toggleable cols whose `defaultVisible` is
       true — or all toggleables if none have defaultVisible set)
   Matches the 140-test catalog rows 030-034 (column hide/show, required lock,
   search, reset, persistence handled by the parent).
   ───────────────────────────────────────────────────────────────────────── */
function ColumnManagerTrigger<TRow>({
  columns,
  visibility,
  onChange,
}: {
  columns: Column<TRow>[];
  visibility: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const t = triggerRef.current;
      if (!t) return;
      const r = t.getBoundingClientRect();
      setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const toggleable = columns.filter((c) => !c.alwaysVisible && !c.id.startsWith('__'));
  const q = search.trim().toLowerCase();
  const filtered = q
    ? toggleable.filter((c) => (c.label || c.id).toLowerCase().includes(q))
    : toggleable;

  const toggle = (id: string, next: boolean) => {
    const out = new Set(visibility);
    if (next) out.add(id); else out.delete(id);
    onChange(out);
  };

  const reset = () => {
    const out = new Set<string>();
    const withDefault = toggleable.filter((c) => c.defaultVisible !== undefined);
    const pool = withDefault.length ? withDefault.filter((c) => c.defaultVisible) : toggleable;
    pool.forEach((c) => out.add(c.id));
    onChange(out);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Manage columns"
        aria-expanded={isOpen}
        data-jira-cell-editor
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        style={{
          width: 24,
          height: 24,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          color: '#6B778C',
          cursor: 'pointer',
          borderRadius: 3,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F1F2F4')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <PlusIcon size={14} />
      </button>
      {isOpen && anchor && createPortal(
        <div
          ref={popRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: anchor.top,
            right: anchor.right,
            zIndex: 1000,
            minWidth: 260,
            background: '#FFFFFF',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 8,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: '#292A2E',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B778C' }}>
              Columns
            </span>
            <button
              type="button"
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: '#0C66E4',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '2px 4px',
                borderRadius: 3,
              }}
              title="Reset to defaults"
            >
              <ResetIcon size={11} /> Reset
            </button>
          </div>
          <div style={{ padding: '0 4px 6px' }}>
            <Textfield
              isCompact
              autoFocus
              placeholder="Search columns"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              elemBeforeInput={
                <span style={{ paddingInlineStart: 8, color: '#6B778C', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon size={12} />
                </span>
              }
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: '#7A869A' }}>No matches</div>
            )}
            {filtered.map((c) => {
              const isVisible = visibility.has(c.id);
              return (
                <label
                  key={c.id}
                  role="menuitemcheckbox"
                  aria-checked={isVisible}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: 3,
                    fontSize: 14,
                    color: '#292A2E',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F4F5F7')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <AkCheckbox
                    isChecked={isVisible}
                    onChange={(e) => toggle(c.id, e.target.checked)}
                    label=""
                  />
                  <span style={{ flex: 1 }}>{c.label || c.id}</span>
                </label>
              );
            })}
          </div>
          {/* Locked columns hint */}
          {columns.some((c) => c.alwaysVisible) && (
            <div style={{ padding: '6px 8px 2px', fontSize: 11, color: '#7A869A', borderTop: '1px solid #DFE1E6', marginTop: 4 }}>
              {columns.filter((c) => c.alwaysVisible && !c.id.startsWith('__')).map((c) => c.label || c.id).join(', ')} are required.
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

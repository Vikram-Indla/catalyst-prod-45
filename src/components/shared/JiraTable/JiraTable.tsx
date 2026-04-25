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
    contextMenuActions,
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

  // Column visibility: filter out any non-alwaysVisible column that isn't in
  // the visible set. When no visibility state is provided, show everything.
  const visibleColumns: Column<TRow>[] = useMemo(() => {
    if (!columnVisibility) return columns;
    return columns.filter((c) => c.alwaysVisible || columnVisibility.has(c.id));
  }, [columns, columnVisibility]);

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
      .jira-table-viewport {
        position: relative;
        overflow: auto;
        max-height: 100%;
      }
      .jira-table-grid table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }
      .jira-table-grid thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #F7F8F9;
        padding: 8px 12px;
        text-align: left;
        font-size: 12px;
        font-weight: 600;
        color: #6B778C;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
        user-select: none;
      }
      .jira-table-grid thead th.jira-th-sortable { cursor: pointer; }
      .jira-table-grid thead th.jira-th-sortable:hover { background: #EBECF0; }
      .jira-table-grid tbody td {
        padding: 0 12px;
        vertical-align: middle;
        background: #FFFFFF;
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
            style={{
              fontSize: d.headerFontSize,
              fontWeight: 600,
              color: '#6B778C',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
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
      cells: Array<{ key: string; content: React.ReactNode }>;
    }> = [];

    const renderDataRow = (row: TRow) => {
      const id = getRowId(row);
      const isSelected = selectedSet.has(id);
      const isFocused = focusedRowId === id;

      const rowCells: Array<{ key: string; content: React.ReactNode }> = [];

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
        const groupCells: Array<{ key: string; content: React.ReactNode }> = [];

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

        // First cell hosts the full-visual header. Since DynamicTable won't
        // let us colSpan, we render the label in the first cell and leave
        // the rest empty with a shared background.
        groupCells.push({
          key: `__group-${g.id}-header`,
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
                    width: 16,
                    height: 16,
                    color: '#6B778C',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 120ms ease',
                  }}
                >
                  {/* Inline chevron — avoids another lucide import here */}
                  ▾
                </span>
              )}
              <span>{g.label}</span>
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
        // Pad trailing cells so layout is stable under isFixedSize.
        // groupCells already has: [select?, header]. Pad the remainder.
        while (groupCells.length < totalCellCount) {
          groupCells.push({
            key: `__group-${g.id}-pad-${groupCells.length}`,
            content: <span aria-hidden="true" />,
          });
        }

        out.push({
          key: `__group-${g.id}`,
          // `className` lets us tint the whole row.
          // @atlaskit/dynamic-table respects className on row objects.
          cells: groupCells,
        } as any);

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
  // AND body cells. Structural columns have fixed widths; data columns use
  // the user's resized width when set, else the schema's natural width.
  const colWidthEntries: Array<{ id: string; width: number; resizable: boolean; sortable: boolean }> = [];
  if (selectable) {
    colWidthEntries.push({ id: '__select', width: effectiveWidthFor('__select', 40), resizable: false, sortable: false });
  }
  for (const col of visibleColumns) {
    colWidthEntries.push({
      id: col.id,
      width: effectiveWidthFor(col.id, naturalWidthFor(col)),
      resizable: !col.id.startsWith('__'),
      sortable: !!col.sortable,
    });
  }
  if (showColumnManager) {
    colWidthEntries.push({ id: '__column-manager', width: effectiveWidthFor('__column-manager', 40), resizable: false, sortable: false });
  }

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
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 120,
      }}
    >
      <div className="jira-table-viewport">
        <table role="grid">
          <colgroup>
            {colWidthEntries.map((e) => (
              <col key={e.id} style={{ width: e.width, minWidth: 48 }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {head.cells.map((cell, idx) => {
                const meta = colWidthEntries[idx];
                const isSorted = meta && sortKey === meta.id;
                return (
                  <th
                    key={cell.key}
                    className={meta?.sortable ? 'jira-th-sortable' : undefined}
                    aria-sort={isSorted ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => meta && handleHeaderClick(meta.id, meta.sortable)}
                    style={{
                      position: 'sticky',
                      top: 0,
                      boxShadow: 'inset 0 -2px 0 0 #C1C7D0',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
                    <td key={c.key} style={{ overflow: 'hidden' }}>
                      {c.content}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
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
                    color: a.danger ? '#AE2A19' : '#172B4D',
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

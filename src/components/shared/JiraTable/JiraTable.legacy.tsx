/**
 * JiraTable -- canonical Jira-style work-item table.
 *
 * Wraps @atlaskit/dynamic-table with a Catalyst-opinionated skin:
 *   - Schema-driven columns (see types.ts)
 *   - Row-click opens a side detail panel (parent decides what that means)
 *   - `density="comfortable"` bumps the font ONE NOTCH up from Jira
 *     (14px cell / 12px header / 40px row height / 28px avatars)
 *   - Keyboard-ready (focusedRowId)
 *   - All visual chrome uses @atlaskit/tokens (no hardcoded hex)
 *
 * Built ONLY on @atlaskit/* primitives + react-router. No custom popovers,
 * no hallucinated components.
 */
import React, { useEffect, useMemo, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import DynamicTable from '@atlaskit/dynamic-table';
import { Checkbox as AkCheckbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';
import { Plus as PlusIcon, Search as SearchIcon, RotateCcw as ResetIcon } from 'lucide-react';
import type { Column, JiraTableProps, SortOrder } from './types';

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
    cellFontSize: 13,
    headerFontSize: 11,
    rowHeight: 36,
    cellPaddingY: 8,
    cellPaddingX: 12,
    headerPaddingY: 8,
    avatarSize: 'small' as const, // 24px
  },
};

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

  // Keyboard nav — uncontrolled internal state if parent doesn't pass focusedRowId.
  const [internalFocus, setInternalFocus] = useState<string | null>(null);
  const focusedRowId = focusedRowIdProp ?? internalFocus;
  const setFocusedRow = useCallback((id: string | null) => {
    if (onFocusedRowChange) onFocusedRowChange(id);
    else setInternalFocus(id);
  }, [onFocusedRowChange]);

  // Flat list of rows for @atlaskit/dynamic-table (grouping is expressed by
  // inserting group-header rows; we do that in `rows` below).
  const flatData: TRow[] = useMemo(() => {
    if (groups && groups.length) {
      return groups.flatMap((g) => {
        const collapsed = g.isCollapsed || !!collapsedGroups?.has(g.id);
        return collapsed ? [] : g.rows;
      });
    }
    return data ?? [];
  }, [data, groups, collapsedGroups]);

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
        box-shadow: inset 3px 0 0 var(--ds-border-focused, #0C66E4);
      }
      .jira-table-grid .jira-table-row-focused > td {
        background-color: var(--ds-background-neutral-subtle-hovered, #F4F5F7) !important;
      }
      /* Grid lines — stronger than the default token so they read on pure
         white backgrounds. Jira's list uses a hairline at ~#E4E6EA; at our
         line density this is the closest visible match. Also strips the
         row hover tint inside the select cell so the checkbox alignment
         doesn't drift. */
      .jira-table-grid table tbody > tr > td {
        box-shadow: inset 0 -1px 0 0 #E4E6EA !important;
        background: #FFFFFF !important;
      }
      .jira-table-grid table thead > tr > th {
        box-shadow: inset 0 -2px 0 0 #DFE1E6 !important;
        background: #FAFBFC !important;
      }
      /* Center the selection checkbox in its column at both thead + tbody.
         @atlaskit/checkbox wraps the input in a label with built-in
         padding and a hidden text span (from the empty label prop). We
         neutralise both so the checkbox sits on the cell centre axis. */
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
      /* Collapse the @atlaskit/checkbox label paddings so the icon centres
         on the cell's vertical/horizontal axis. */
      .jira-table-grid table > * tr > *:first-child label {
        margin: 0 !important;
        padding: 0 !important;
        gap: 0 !important;
        display: inline-flex !important;
        justify-content: center !important;
        align-items: center !important;
      }
      /* The invisible label text span AkCheckbox renders for the empty label prop */
      .jira-table-grid table > * tr > *:first-child label > span:not([role]):not([data-jira-table-editor]) {
        display: none !important;
      }
      /* AkCheckbox renders a hidden <input> inside the label that still
         takes layout space, pushing the visible SVG 6px right of centre.
         Force it to position:absolute so the SVG is the only laid-out
         child and centres cleanly. Click semantics are preserved because
         the whole label is the click target. */
      .jira-table-grid table > * tr > *:first-child label > input[type="checkbox"] {
        position: absolute !important;
        opacity: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
      }

      /* Force compact row height — Jira-faithful density. DynamicTable's
         own CSS inflates rows; we override every path to 32px. */
      .jira-table-grid table tbody > tr {
        height: 32px !important;
      }
      .jira-table-grid table tbody > tr > td {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        line-height: 32px;
        vertical-align: middle;
      }
      .jira-table-grid table tbody > tr > td > div {
        min-height: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
      .jira-table-grid table thead > tr > th {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }
      /* Focused row overrides the td shadow with its own blue bar */
      .jira-table-grid .jira-table-row-focused > td:first-child {
        box-shadow: inset 3px 0 0 var(--ds-border-focused, #0C66E4), inset 0 -1px 0 0 var(--ds-border, #DFE1E6) !important;
      }
      /* Row hover — Jira's list uses a very faint neutral tint that's
         clearly different from the resting white. */
      .jira-table-grid table tbody > tr:hover > td {
        background-color: #F7F8F9 !important;
      }
      /* Jira body-text contrast. Measured on digital-transformation.
         atlassian.net 2026-04-18: summary + most cells render at
         rgb(41, 42, 46) / #292A2E — a neutral dark grey with stronger
         contrast than Atlaskit's color.text token (#172B4D navy).
         Inline styles on cell wrappers set color: #172B4D from the old
         token fallback, so we need !important to win specificity.
         The Key link, status pill, parent chip, and priority bars all
         set their own explicit color inline (with or without !important)
         and continue to render correctly through this override. */
      .jira-table-grid table tbody > tr > td,
      .jira-table-grid table tbody > tr > td > div,
      .jira-table-grid table tbody > tr > td span:not([data-jira-table-row-open]):not([style*="background"]) {
        color: #292A2E !important;
      }
      /* Whole-cell hover tint: when an editor trigger inside a cell is hovered
         OR opened, tint the entire <td> so the affordance reads as
         "this whole cell is editable" — matches Jira list-view behaviour. */
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor]:hover),
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor][aria-expanded="true"]) {
        background-color: var(--ds-background-neutral, #F1F2F4) !important;
      }
      /* Key cell -- clearly clickable */
      [data-jira-table-row-open] {
        cursor: pointer;
        border-radius: 3px;
        transition: background 100ms;
      }
      [data-jira-table-row-open]:hover {
        background: var(--ds-background-selected, #E9F2FF);
        text-decoration: underline;
      }
      /* Inner trigger buttons no longer self-tint (the whole cell tints).
         Keep a subtle ring for keyboard focus. */
      [data-jira-cell-editor]:focus-visible {
        outline: 2px solid var(--ds-border-focused, #4C9AFF);
        outline-offset: -2px;
        border-radius: 3px;
      }
      /* Empty-cell ghost affordance (e.g. "Set status" / "Add parent" /
         "Unassigned" placeholder). Faded by default; reads as full text on
         row hover so users discover the cell is editable. */
      [data-jira-cell-ghost] {
        color: var(--ds-text-subtlest, #97A0AF);
        font-style: italic;
        transition: color 80ms ease;
      }
      .jira-table-grid table tbody > tr:hover [data-jira-cell-ghost] {
        color: var(--ds-text-subtle, #5E6C84);
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
              color: token('color.text.subtlest', '#6B778C'),
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
                // Jira body text — measured as rgb(41,42,46)/#292A2E on
                // digital-transformation.atlassian.net 2026-04-18. Stronger
                // contrast than color.text (#172B4D navy) which was looking
                // washed-out on the summary column.
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
              {col.cell({
                row,
                value,
                isFocused,
                isSelected,
                commit: (next) => onCellEdit?.(row, col.id, next),
              })}
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
                color: token('color.text.subtle', '#42526E'),
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
                    color: token('color.text.subtlest', '#6B778C'),
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
                  background: token('color.background.neutral', '#DFE1E6'),
                  borderRadius: 10,
                  color: token('color.text.subtle', '#42526E'),
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {g.rows.length}
              </span>
              {g.meta && (
                <span style={{ fontWeight: 500, color: token('color.text.subtlest', '#6B778C'), letterSpacing: 0, textTransform: 'none' }}>
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
      for (const row of data ?? []) out.push(renderDataRow(row));
    }

    return out;
  }, [
    visibleColumns,
    d.cellFontSize,
    d.cellPaddingY,
    d.rowHeight,
    data,
    focusedRowId,
    getRowDepth,
    getRowId,
    groups,
    collapsedGroups,
    onToggleGroup,
    contextMenuActions,
    onCellEdit,
    onRowClick,
    selectable,
    selectedSet,
    showColumnManager,
    toggleRow,
  ]);

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
        color: token('color.text', '#172B4D'),
        outline: 'none',
        background: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      <DynamicTable
        head={head}
        rows={rows}
        rowsPerPage={rowsPerPage}
        defaultPage={1}
        page={page}
        onSetPage={(next: number) => onPageChange?.(next)}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(data: { key: string | number | undefined; sortOrder: 'ASC' | 'DESC' }) => {
          if (data.key != null) onSortChange?.(String(data.key), data.sortOrder);
        }}
        isFixedSize
        isLoading={!!isLoading}
        loadingSpinnerSize="large"
        emptyView={emptyView as any}
      />

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
            background: token('elevation.surface', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 4,
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: token('color.text', '#172B4D'),
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
                    color: a.danger ? token('color.text.danger', '#AE2A19') : token('color.text', '#172B4D'),
                    fontSize: 14,
                    textAlign: 'left',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    fontFamily: 'inherit',
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = a.danger ? token('color.background.danger', '#FFEBE6') : token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
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
      <Tooltip content="Manage columns" position="bottom">
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
            color: token('color.text.subtlest', '#6B778C'),
            cursor: 'pointer',
            borderRadius: 3,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral', '#F1F2F4'))}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <PlusIcon size={14} />
        </button>
      </Tooltip>
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
            background: token('elevation.surface', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 8,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: token('color.text', '#172B4D'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: token('color.text.subtlest', '#6B778C') }}>
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
                color: token('color.link', '#0C66E4'),
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
                <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                  <SearchIcon size={12} />
                </span>
              }
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: token('color.text.subtlest', '#7A869A') }}>No matches</div>
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
                    color: token('color.text', '#172B4D'),
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
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
            <div style={{ padding: '6px 8px 2px', fontSize: 11, color: token('color.text.subtlest', '#7A869A'), borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, marginTop: 4 }}>
              {columns.filter((c) => c.alwaysVisible && !c.id.startsWith('__')).map((c) => c.label || c.id).join(', ')} are required.
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

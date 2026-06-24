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
import ArrowUpIcon from '@atlaskit/icon/glyph/arrow-up';
import ArrowDownIcon from '@atlaskit/icon/glyph/arrow-down';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useComponentConfig } from '@/registry/useComponentConfig';
import PlusIcon from '@atlaskit/icon/core/add';
import SearchIcon from '@atlaskit/icon/core/search';
import ResetIcon from '@atlaskit/icon/core/refresh';
import type { Column, JiraTableProps, SortOrder } from './types';
import { ColumnHeaderMenu, type MenuItem } from './ColumnHeaderMenu';
import { ResizeColumnDialog } from './ResizeColumnDialog';

// Simple Atlaskit-tuned button style used by the pagination footer.
const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  fontSize: 13,
  border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))',
  borderRadius: 3,
  background: disabled ? 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
  color: disabled ? 'var(--ds-text-subtlest, #A5ADBA)' : 'var(--ds-text-subtle, #42526E)',
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
});

// Density -> concrete pixel values. "comfortable" is the Catalyst default and
// is exactly one step bigger than Jira's "compact".
const DENSITY = {
  comfortable: {
    cellFontSize: 14,
    headerFontSize: 12,
    rowHeight: 48,
    cellPaddingY: 10,
    cellPaddingX: 12,
    headerPaddingY: 10,
    avatarSize: 'medium' as const, // 32px
  },
  compact: {
    // Jira BAU list DOM probe 2026-05-16: tr height = 40px (not 48px).
    // 48px was comfortable density leaking into compact. Jira's compact
    // row uses 40px height with 8px top+bottom padding on each td.
    cellFontSize: 14,
    headerFontSize: 12,
    rowHeight: 40,
    cellPaddingY: 6,
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
    showRowCount = true,
    totalRowCount,
    renderRowDragHandle,
    rowDragHandleHidden,
    focusedRowId: focusedRowIdProp,
    onFocusedRowChange,
    onEscape,
    density = 'compact',
    isLoading,
    emptyView,
    ariaLabel = 'Work items',
    columnVisibility,
    onColumnVisibilityChange,
    collapsedGroups,
    onToggleGroup,
    enableGroupCreateButton: enableGroupCreateButtonProp,
    onAddToGroup,
    renderGroupInlineRow,
    getRowHasChildren,
    expandedRowIds,
    onToggleRowExpanded,
    contextMenuActions,
    enableColumnReorder: enableColumnReorderProp,
    columnOrder: columnOrderProp,
    onColumnOrderChange,
    enableVirtualization = false,
    enableStickyCreateFooter: enableStickyCreateFooterProp,
    stickyCreateFooter,
    initialColumnWidths,
    onColumnWidthsChange,
  } = props;

  // ── v2 publish/cascade hook (PR-2, 2026-05-17) ──────────────────────────
  // The runtime config resolver decides which feature-flag value wins:
  //   1. caller prop  →  2. component_config runtime override  →  3. registry default
  // This lets /admin/components publish flag changes that propagate to every
  // JiraTable consumer that DOESN'T explicitly pass the prop. Consumers that
  // DO pass a prop still win — explicit intent is preserved.
  const resolvedConfig = useComponentConfig('jira-table', {
    enableGroupCreateButton: enableGroupCreateButtonProp,
    enableStickyCreateFooter: enableStickyCreateFooterProp,
    enableColumnReorder: enableColumnReorderProp,
  });
  const enableGroupCreateButton = Boolean(resolvedConfig.flags.enableGroupCreateButton);
  const enableStickyCreateFooter = Boolean(resolvedConfig.flags.enableStickyCreateFooter);
  const enableColumnReorder = Boolean(resolvedConfig.flags.enableColumnReorder);

  // Right-click context menu state — one menu at a time, anchored to cursor.
  const [ctxMenu, setCtxMenu] = useState<{ row: TRow; x: number; y: number } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  // 2026-06-23 — per-column header menu (3-dot). Stores open column id +
  // trigger element ref so the portal menu anchors correctly.
  const [headerMenuColId, setHeaderMenuColId] = useState<string | null>(null);
  const headerMenuTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  // 2026-06-23 — column resize dialog (slider). Anchored under the 3-dot trigger.
  const [resizeDialogColId, setResizeDialogColId] = useState<string | null>(null);
  const resizeDialogOriginalWidthRef = useRef<number | null>(null);
  // 2026-05-10 Per-column filter popup — opens from header chevron click.
  const [filterMenu, setFilterMenu] = useState<{ colId: string; top: number; left: number } | null>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterMenuRef.current?.contains(t)) return;
      // Don't dismiss when clicking the trigger chevron itself (that toggles).
      if ((e.target as HTMLElement)?.closest('[data-jira-filter-trigger]')) return;
      setFilterMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filterMenu]);
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
      ? columns.filter((c) => !c.hidden && (c.alwaysVisible || columnVisibility.has(c.id)))
      : columns.filter((c) => !c.hidden);
    if (!effectiveColumnOrder || effectiveColumnOrder.length === 0) return base;
    const idx = new Map<string, number>();
    effectiveColumnOrder.forEach((id, i) => idx.set(id, i));
    // Stable reorder: structural columns (__*) keep their relative side
    // (`__actions` is always last; other `__*` columns like `__drag` are
    // always first); reorderable columns sort by their index in
    // effectiveColumnOrder; unknown ids go to the end.
    return [...base].sort((a, b) => {
      const aS = a.id.startsWith('__');
      const bS = b.id.startsWith('__');
      const aEnd = a.id === '__actions';
      const bEnd = b.id === '__actions';
      if (aEnd && bEnd) return 0;
      if (aEnd) return 1;   // __actions always last
      if (bEnd) return -1;
      if (aS && bS) return base.indexOf(a) - base.indexOf(b);
      if (aS) return -1;    // other structural (__drag, __select) first
      if (bS) return 1;
      // 2026-06-23 — locked columns pinned at their original schema position,
      // ALWAYS before any non-locked reorderable column. Without this, a
      // commitColumnOrder excluding the locked column would push it to the
      // end (idx=undefined → 999), breaking the "Work always first" contract.
      const aLocked = !!a.lockedPosition;
      const bLocked = !!b.lockedPosition;
      if (aLocked && bLocked) return base.indexOf(a) - base.indexOf(b);
      if (aLocked) return -1;
      if (bLocked) return 1;
      const ai = idx.has(a.id) ? idx.get(a.id)! : 999;
      const bi = idx.has(b.id) ? idx.get(b.id)! : 999;
      return ai - bi;
    });
  }, [columns, columnVisibility, effectiveColumnOrder]);

  // Drag-and-drop state for header reorder. `dragId` is the column id being
  // dragged; `dragOverId` is the column the cursor is currently over (used to
  // render the drop indicator on the right edge of that header).
  // dragIdRef mirrors dragId as a ref so onDragOver can read the current
  // value synchronously (React state updates are async; without the ref,
  // onDragOver sees stale null and skips e.preventDefault(), which prevents
  // the browser from firing onDrop).
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Compute the next column order after dropping `sourceId` on `targetId`.
  const computeReorder = useCallback((sourceId: string, targetId: string): string[] | null => {
    if (sourceId === targetId) return null;
    if (sourceId.startsWith('__') || targetId.startsWith('__')) return null;
    const srcCol = visibleColumns.find((c) => c.id === sourceId);
    const tgtCol = visibleColumns.find((c) => c.id === targetId);
    if (srcCol?.lockedPosition || tgtCol?.lockedPosition) return null;
    const reorderable = visibleColumns
      .filter((c) => !c.id.startsWith('__') && !c.lockedPosition)
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

  // 2026-06-23 — Move column to absolute / relative position. Operates on
  // the reorderable list (excludes locked + structural columns).
  const moveColumn = useCallback(
    (colId: string, direction: 'first' | 'left' | 'right' | 'last') => {
      const reorderable = visibleColumns
        .filter((c) => !c.id.startsWith('__') && !c.lockedPosition)
        .map((c) => c.id);
      const idx = reorderable.indexOf(colId);
      if (idx < 0) return;
      const next = [...reorderable];
      next.splice(idx, 1);
      let to = idx;
      if (direction === 'first') to = 0;
      else if (direction === 'left') to = Math.max(0, idx - 1);
      else if (direction === 'right') to = Math.min(next.length, idx + 1);
      else if (direction === 'last') to = next.length;
      next.splice(to, 0, colId);
      commitColumnOrder(next);
    },
    [visibleColumns, commitColumnOrder],
  );

  // Whether to render the trailing `+` column-manager header. Only when the
  // parent opted in by providing both props.
  const showColumnManager = !!columnVisibility && !!onColumnVisibilityChange;

  // ── Column sizing ──────────────────────────────────────────────────────
  // Round H: user-resizable columns. Width storage is pixel-based per column
  // id. Seeded from `initialColumnWidths` prop for localStorage persistence;
  // falls back to schema fractions (column.width × 12) when absent.
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => initialColumnWidths ?? {},
  );
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  // 2026-06-23 — column whose right-edge resize handle is hovered. Used to
  // paint a full-height vertical line spanning header + every body row to
  // signal "you can drag here to resize" (Jira parity).
  const [hoveredResizeColId, setHoveredResizeColId] = useState<string | null>(null);

  const onColumnWidthsChangeRef = useRef(onColumnWidthsChange);
  useEffect(() => { onColumnWidthsChangeRef.current = onColumnWidthsChange; }, [onColumnWidthsChange]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.max(48, resizing.startWidth + (e.clientX - resizing.startX));
      setColumnWidths((prev) => ({ ...prev, [resizing.id]: next }));
    };
    const onUp = () => {
      setResizing(null);
      setHoveredResizeColId(null);
      // Notify parent after drag completes so it can persist to localStorage.
      setColumnWidths((prev) => {
        onColumnWidthsChangeRef.current?.(prev);
        return prev;
      });
    };
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
          // Guard: if any SubtasksPanel popover is open, let the popover's
          // capture-phase handler close it — don't close the detail panel.
          const spPopoverOpen = !!document.querySelector(
            '[data-sp-status-popover],[data-sp-priority-popover],[data-sp-assignee-popover]'
          );
          if (!spPopoverOpen && (focusedRowId || onEscape)) {
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
        box-shadow: inset 3px 0 0 var(--ds-link, #0C66E4);
      }
      .jira-table-grid .jira-table-row-focused > td {
        background-color: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)) !important;
      }
      /* Grid lines via box-shadow (immune to Atlaskit's em-based overrides).
         Phase 12 (2026-04-29): reverted to Atlaskit color.border via
         --ds-border CSS variable. Phase 11 made it flip natively. */
      .jira-table-grid table tbody > tr > td {
        box-shadow: inset 0 -1px 0 0 var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))) !important;
      }
      /* Apr 27, 2026 (Vikram audit pass 4): Type column is icon-only, so
         the standard 12px L/R cell padding leaves ~14px of dead space
         next to the 16px glyph and pushes Key visibly away from Type.
         Tightening to 4px L / 8px R brings the icon flush against the
         column edge and matches Jira's compact icon-column rhythm.
         2026-05-08: col 1=checkbox, col 2=__drag, col 3=type (was col 2
         before __drag was added). Updated nth-child to 3. */
      .jira-table-grid table thead > tr > th:nth-child(3),
      .jira-table-grid table tbody > tr > td:nth-child(3) {
        padding-left: 4px !important;
        padding-right: 8px !important;
      }
      .jira-table-grid table thead > tr > th {
        /* Phase 12 (2026-04-29): reverted to Atlaskit elevation.surface.sunken
           token via --ds-surface-sunken CSS variable. Phase 11 unblocked
           dark theme — token flips natively. Removed Catalyst-specific
           [data-theme="dark"] override block; ADS owns the band colour. */
        box-shadow: inset 0 -2px 0 0 var(--ds-border, var(--ds-border, #C1C7D0)) !important;
        background: var(--ds-surface-sunken, #F7F8F9) !important;
      }
      /* 2026-06-09 Sticky __actions header: white bg (so scrolled content
         doesn't show through), left divider (visual separator from the
         scrolling content underneath), bottom border (matches the rest
         of the header row). Higher-specificity selector + !important
         required to defeat the generic thead-th rule above. */
      .jira-table-grid table thead > tr > th[data-actions-sticky] {
        background: var(--cp-bg-elevated, var(--ds-surface, #FFFFFF)) !important;
        box-shadow:
          inset 1px 0 0 0 var(--ds-border, #C1C7D0),
          inset 0 -2px 0 0 var(--ds-border, #C1C7D0) !important;
      }
      /* Focused row overrides the td shadow with its own blue bar */
      .jira-table-grid .jira-table-row-focused > td:first-child {
        box-shadow: inset 3px 0 0 var(--ds-link, #0C66E4), inset 0 -1px 0 0 var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))) !important;
      }
      /* Row hover. Apr 28, 2026 (jira-compare cycle 4): tokenized — was
         hardcoded var(--ds-surface-sunken, #F7F8F9). --ds-background-neutral-subtle-hovered is the
         exact Atlaskit hover bg (var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06)) in light theme). */
      /* Jira DOM probe 2026-05-16: row hover bg = rgba(9,30,66,0.06) ≈ #F1F2F4 */
      .jira-table-grid table tbody > tr:hover > td {
        background-color: var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06));
      }
      /* Whole-cell hover tint: when an editor trigger inside a cell is hovered
         OR opened, tint the entire <td> so the affordance reads as
         "this whole cell is editable" — matches Jira list-view behaviour.
         Apr 28, 2026 (jira-compare cycle 4): tokenized — was hardcoded
         var(--ds-background-neutral, #F1F2F4). --ds-background-neutral-hovered is the next-step token
         used for active editor cells. */
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor]:hover):not(:has([data-jira-cell-summary])),
      .jira-table-grid table tbody > tr > td:has([data-jira-cell-editor][aria-expanded="true"]):not(:has([data-jira-cell-summary])) {
        background-color: var(--ds-background-neutral-hovered, #F1F2F4) !important;
      }
      /* Title (summary) cell — Vikram directive (2026-06-11):
         (1) td background — let the row's uniform gray hover tint
             (tr:hover > td above) paint the title cell. Do NOT override.
         (2) Atlaskit InlineEdit baked-in styling (compiled classes
             _189e1dm9, _irr31dpa, _vwz4kb7n on the readView role=
             presentation div + its outer wrapper) creates three
             unwanted artifacts inside .cv-cell-inline-edit-no-label:
               • a 2px transparent border that misaligns the title
                 baseline against the icon + key,
               • a gray :hover background (the "click-to-edit" bubble
                 sitting on top of the row tint), and
               • a line-height:1 outer wrapper that clips the bottom
                 of descenders (g, y, p, q, j).
             Override all three so the title sits at the SAME vertical
             centre as the icon and key, descenders are not clipped,
             and the hover tint is exactly the row-level gray.
             Hover-action buttons (Open in panel / Create child) are
             SIBLINGS of .cv-cell-inline-edit-no-label, so their own
             hover affordance is untouched. */
      .cv-cell-inline-edit-no-label,
      .cv-cell-inline-edit-no-label *,
      .cv-cell-inline-edit-no-label *:hover {
        background: transparent !important;
      }
      /* Kill the 2px transparent border on the readView's role=presentation
         div (Atlaskit class _189e1dm9). Use descendant selector — the
         role=presentation div is nested several layers deep inside
         <form> > <Field> > <_vwz4kb7n div>. */
      .cv-cell-inline-edit-no-label div[role="presentation"] {
        border-width: 0 !important;
        padding-block: 0 !important;
        vertical-align: middle !important;
      }
      /* Atlaskit InlineEdit renders an empty <button> (Pressable) as a
         SIBLING of the role=presentation div that holds the title text.
         The button is display:block with browser-default font-size, so
         it occupies a vertical line of ~14-16px ABOVE the title — that's
         why the title visibly sits BELOW the icon and key baseline
         (Vikram screenshot 2026-06-11 003156). Pull the button out of
         layout flow so the title sits at y=0 of the wrapper; keep it
         focusable for keyboard users (don't touch pointer-events /
         tabindex / visibility). Standard sr-only pattern. */
      .cv-cell-inline-edit-no-label button {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      /* Provide a positioned ancestor for the absolute button so it
         stays inside the cell visually (off-screen but anchored). */
      .cv-cell-inline-edit-no-label form {
        position: relative !important;
      }
      /* Atlaskit Field wraps its child in <div css={{ marginBlockStart:
         var(--ds-space-100, 8px) }}> — intended for stacking form fields.
         In a table cell that 8px top margin pushes the title DOWN exactly
         8px below the icon and key baseline (the visible offset in
         Vikram's screenshot 2026-06-11 003156). Zero it. */
      .cv-cell-inline-edit-no-label form > div {
        margin-block-start: 0 !important;
        margin-top: 0 !important;
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
        outline: 2px solid var(--ds-border-focused, #4688EC);
        outline-offset: -2px;
        border-radius: 3px;
      }
      /* Empty-cell ghost affordance (e.g. "Set status" / "Add parent" /
         "Unassigned" placeholder). Faded by default; reads as full text on
         row hover so users discover the cell is editable.
         2026-06-01: padding-right reserves space for the trailing glyph's
         italic overhang. Without it, parents using overflow:hidden clip
         the final character (the d of Unassigned rendered as Unassignea
         was the reported defect). */
      [data-jira-cell-ghost] {
        color: var(--ds-text-subtlest, #97A0AF);
        font-style: italic;
        padding-right: 2px;
        transition: color 80ms ease;
      }
      /* 2026-06-01 (catalyst-clone F1 fix): hide Atlaskit InlineEdit's
         built-in <label> when the cell is wrapped in this class. The label
         is required for a11y but visually duplicates the column header in
         every row. Scoped to table cells so right-rail InlineEdits keep
         their label. */
      .cv-cell-inline-edit-no-label label {
        display: none !important;
      }
      .cv-cell-inline-edit-no-label > div {
        padding: 0;
      }
      .jira-table-grid table tbody > tr:hover [data-jira-cell-ghost] {
        color: var(--ds-text-subtle, #5E6C84);
      }
      /* Group header + button: hidden by default, visible on row hover.
         Jira only shows the + on hover (parity confirmed 2026-05-08 DOM probe). */
      .jira-group-header-row .jira-group-add-btn {
        opacity: 0;
        transition: opacity 120ms ease;
      }
      .jira-group-header-row:hover .jira-group-add-btn,
      .jira-group-header-row:focus-within .jira-group-add-btn {
        opacity: 1;
      }
      /* Drag handle: hidden by default, visible on row hover.
         Jira shows 6-dot affordance only when there is no active sort
         AND no grouping. Using CSS (not inline style) so the hover rule
         can actually override it — inline styles block CSS hover overrides. */
      .jira-table-grid .jira-drag-handle { visibility: hidden; }
      .jira-table-grid table tbody > tr:hover .jira-drag-handle {
        visibility: visible;
      }
      /* 2026-05-17 jira-compare cycle 2: row-level drag handle overlay.
         Absolute-positioned outside the column flow (anchored to the row
         __select cell). Hidden at rest, visible on row hover. */
      .jira-table-grid table tbody > tr:hover .jira-row-drag-handle {
        visibility: visible;
      }
      /* Row menu: hidden by default, visible on row hover. */
      .jira-table-grid table tbody > tr:hover .jira-row-menu-trigger {
        opacity: 1;
      }
      /* Sticky create-row buttons: gray bg on hover (Jira parity). */
      button.jira-table-create-btn,
      button.jira-table-refresh-btn {
        transition: background-color 120ms ease;
      }
      button.jira-table-create-btn:hover,
      button.jira-table-refresh-btn:hover {
        background-color: var(--ds-background-neutral, #EBECF0) !important;
      }
      button.jira-table-create-btn:active,
      button.jira-table-refresh-btn:active {
        background-color: var(--ds-background-neutral-hovered, #DCDFE4) !important;
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
        /* Thin scrollbars (Atlassian parity). Firefox uses scrollbar-width;
           WebKit/Blink use ::-webkit-scrollbar rules below. */
        scrollbar-width: thin;
        scrollbar-color: var(--ds-background-neutral-hovered, #DCDFE4) transparent;
      }
      .jira-table-viewport::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      .jira-table-viewport::-webkit-scrollbar-track {
        background: transparent;
      }
      .jira-table-viewport::-webkit-scrollbar-thumb {
        background: var(--ds-background-neutral-hovered, #DCDFE4);
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      .jira-table-viewport::-webkit-scrollbar-thumb:hover {
        background: var(--ds-background-neutral-pressed, #B3B9C4);
        background-clip: content-box;
      }
      .jira-table-viewport::-webkit-scrollbar-corner {
        background: transparent;
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
        min-width: 1000px;
        width: 100%;
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
        background: var(--ds-surface-sunken, #F7F8F9);
        height: 40px;
        padding: 0 12px;
        vertical-align: middle;
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
             - color var(--ds-text-subtlest, #6B6E76) (color.text.subtle — re-probed 2026-04-27 vs
               Jira, was previously written as var(--ds-text-subtle, #44546F) from a stale probe)
             - text-transform: none (Title Case — NOT uppercase)
             - letter-spacing: normal (NOT 0.04em)
           Catalyst's previous UPPERCASE / wide-tracked / muted-grey
           treatment was a Catalyst opinion. Matching Jira's actual list
           view here for parity. Apr 27 2026 jira-compare regression
           (D-005 + D-006): fontWeight 700 → 653, color var(--ds-text-subtle, #44546F) → var(--ds-text-subtlest, #6B6E76).
           Jira spec (measured 2026-05-12): 12px/653/var(--ds-text-subtle, rgb(80,82,88)) — NOT 14px/400.
           14px/400 is body text. Headers must be bold and smaller.
           May 12 2026 (design-intelligence RCA): line-height 18px → 16px
           to match Jira's vertical compaction. Tighter line-height = denser
           text = perceived darker appearance. Jira uses 16px; Catalyst was
           18px (browser default). Also changed -webkit-font-smoothing from
           antialiased to auto (via global index.css update). */
        font-size: 12px;
        font-weight: 653;
        line-height: 20px;
        color: var(--ds-text-subtle, rgb(80, 82, 88));
        text-transform: none;
        letter-spacing: normal;
        white-space: nowrap;
        user-select: none;
        /* 2026-05-17: Added vertical column dividers matching tbody. */
        border-right: 1px solid var(--ds-border, #EBECF0);
      }
      .jira-table-grid thead th.jira-th-sortable { cursor: pointer; }
      /* Apr 28, 2026 (jira-compare cycle 4): tokenized — was hardcoded #EBECF0 */
      .jira-table-grid thead th.jira-th-sortable:hover { background: var(--ds-background-neutral-hovered, #EBECF0); }
      /* 2026-05-10 Jira-parity: row body is the click target for opening
         the detail panel. cursor: pointer signals clickability. Inline
         editor cells override with their own cursors (text/pointer).
         2026-05-16: reverted to 40px (Jira compact DOM probe = 40px). */
      .jira-table-grid tbody tr:not(.jira-table-group-row) { cursor: pointer; min-height: 40px; }
      /* 2026-05-10 Per-column filter chevron — hover-reveal on header.
         Active-filter state keeps chevron visible (opacity:1 inline). */
      .jira-table-grid thead th:hover .jira-filter-chevron { opacity: 1 !important; }
      .jira-filter-chevron-active { opacity: 1 !important; }
      /* 2026-06-23 Jira-parity: sort arrow + 3-dot trigger animated reveal.
         Idle: width 0, opacity 0 (collapsed in flex flow).
         Hover (or sorted/menu-open): width 18, opacity 1, smooth transition.
         The width-animation pushes the label to ellipsize gracefully and
         the arrow slides left to make room for the 3-dot. */
      .jira-th-sort-arrow,
      .jira-th-menu-trigger {
        width: 0;
        opacity: 0;
        margin: 0;
        transition: width 160ms ease, opacity 160ms ease, margin 160ms ease;
      }
      .jira-table-grid thead th:hover .jira-th-sort-arrow,
      .jira-table-grid thead th:hover .jira-th-menu-trigger {
        width: 18px;
        opacity: 1;
      }
      .jira-th-sort-arrow-active { width: 18px !important; opacity: 1 !important; }
      .jira-th-menu-trigger-active { width: 18px !important; opacity: 1 !important; }
      .jira-th-menu-trigger:hover {
        background: var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06)) !important;
      }
      .jira-table-grid tbody td {
        padding: 0 12px;
        vertical-align: middle;
        min-height: 40px;
        /* Phase 12 (2026-04-29): reverted to Atlaskit elevation.surface
           token via --ds-surface CSS variable. Phase 11 unblocked Atlaskit's
           bundled dark theme so --ds-surface flips natively. */
        background: var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))));
        /* Apr 27, 2026 (L60): explicit typography baseline per Jira-parity
           spec — 14/20/400 with primary text color. Cells with their own
           cell-renderers (Lozenge, Avatar, dates, etc.) override locally;
           all unstyled text inherits this default so we don't drift.
           Apr 28, 2026 (jira-compare cycle 2 typography RCA): switched
           from legacy hardcoded var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D))) (rgb 23,43,77 — old Atlassian
           Refresh "neutral 800") to the modern --ds-text token (resolves
           to rgb 41,42,46 on Jira /list per live probe of Catalyst H1
           AND Jira BAU body cells). The legacy hex was the cause of the
           washed-out / blue-shifted body text Vikram flagged: every body
           td was rendering var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D))) while headers + H1 used the modern
           token. Token-first ensures dark-mode + Dark mode switch flips
           too. Fallback hex updated to var(--ds-text, #172B4D) to match Jira's resolved
           --ds-text in light theme. */
        font-size: 14px;
        line-height: 20px;
        font-weight: 400;
        color: var(--ds-text, #292A2E);
        font-family: inherit;
        /* 2026-05-17: Added vertical column dividers. Each td renders a
           right border so columns are visually separated. Without this,
           the table appears as plain rows without grid structure. Jira
           uses 1px solid var(--ds-border, #DFE1E6) (Atlaskit border.subtle) on the right
           edge of each cell. */
        border-right: 1px solid var(--ds-border, #EBECF0);
      }
      /* Column resize handle — 6px hit area on the right edge of each
         sortable/resizable header. Highlights on hover to advertise. */
      .jira-resize-handle {
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        width: 8px;
        cursor: col-resize;
        user-select: none;
        z-index: 4;
      }
      /* 2026-06-23 — full-column resize line. Painted via ::after on every
         td/th carrying data-resize-hover="true" (set when hoveredResizeColId
         matches the column). Spans top to bottom across header + all body rows.
         Strip border-right entirely (not just color) so pseudo right:0 aligns
         to outer edge consistently — right:0 on absolute child positions to
         PADDING edge of containing block, so a 1px border would offset the
         line by 1px vs a borderless td. Removing the border keeps header +
         body pseudos at the same x. */
      /* Hover state — muted grey signals draggable affordance. */
      .jira-table-grid td[data-resize-state="hover"],
      .jira-table-grid th[data-resize-state="hover"],
      .jira-table-grid td[data-resize-state="active"],
      .jira-table-grid th[data-resize-state="active"] {
        border-right: none !important;
      }
      .jira-table-grid td[data-resize-state="hover"]::after,
      .jira-table-grid th[data-resize-state="hover"]::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 2px;
        background: var(--cp-resize-handle-hover, var(--ds-text-subtlest, #626F86));
        z-index: 3;
        pointer-events: none;
      }
      .jira-table-grid td[data-resize-state="active"]::after,
      .jira-table-grid th[data-resize-state="active"]::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 2px;
        background: var(--ds-border-selected, #4C9AFF);
        z-index: 3;
        pointer-events: none;
      }
      .jira-table-grid tbody tr.jira-table-group-row > td {
        background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)) !important;
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
        background: var(--ds-surface-sunken, #F7F8F9);
      }
      .jira-table-grid thead th {
        color: var(--ds-text-subtle, rgb(80, 82, 88)) !important;
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
        background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)) !important;
      }
      /* 2026-05-10 Jira-parity: group header rows stick below the thead
         while their child rows scroll past. top:40px = thead height.
         z-index 1 keeps them below the thead (z:2) but above body rows. */
      .jira-table-grid tbody tr.jira-table-group-row > td {
        position: sticky;
        top: 40px;
        z-index: 1;
        background: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7));
      }
      /* ── Critique fixes (2026-04) — ported from the retired legacy table ──
         Center the selection checkbox in its column.
         AkCheckbox renders a hidden <input> inside a <label> that normally
         takes left-side layout, pushing the visible SVG 6px right of centre.
         We collapse the label paddings and absolute-position the input so
         the SVG alone is the laid-out child. */
      .jira-table-grid.has-select-col table thead > tr > th:first-child,
      .jira-table-grid.has-select-col table tbody > tr > td:first-child {
        text-align: center;
        padding-left: 0 !important;
        padding-right: 0 !important;
        border-right: 1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6))) !important;
      }
      .jira-table-grid.has-select-col table thead > tr > th:first-child > span,
      .jira-table-grid.has-select-col table tbody > tr > td:first-child > [data-jira-table-editor],
      .jira-table-grid.has-select-col table tbody > tr > td:first-child > div {
        display: flex !important;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .jira-table-grid.has-select-col table > * tr > *:first-child label {
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
        box-shadow: inset 0 -1px 0 0 var(--ds-border, #E4E6EA) !important;
      }
      /* Row hover tint matches Jira's list view. */
      .jira-table-grid table tbody > tr:hover > td {
        background-color: var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.04)) !important;
      }
      /* Drag-handle grip — hidden at rest, visible on row hover */
      .jira-table-grid .jira-drag-handle { visibility: hidden; }
      .jira-table-grid table tbody > tr:hover .jira-drag-handle {
        visibility: visible;
      }
      /* 2026-05-17 jira-compare cycle 2: row-level drag handle overlay
         hover-reveal (dark-mode block; mirrors light-mode rule above). */
      .jira-table-grid table tbody > tr:hover .jira-row-drag-handle {
        visibility: visible;
      }
      /* 2026-05-12 Jira parity: row hover reveals ↗ open + add child buttons
         on the right edge of the Summary cell.
         2026-06-11: switched to display: none at rest (was visibility: hidden)
         so the buttons no longer reserve ~52px of layout width while idle —
         the title cell now gets that space back, eliminating premature
         ellipsis clipping on titles that comfortably fit the column. */
      .jira-table-grid table tbody > tr:hover [data-jira-row-hover-action] {
        display: inline-flex !important;
      }
      /* "Add comment" ghost text — always visible (Jira parity: shown at rest in every row) */
      .jira-table-grid table tbody > tr td [data-jira-cell-ghost] {
        visibility: visible;
        color: var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C));
      }
      /* ─────────────────────────────────────────────────────────────────────
         DARK MODE — Rule 3 paired overrides for !important hex above.
         Most surfaces already use --ds-* tokens that flip natively under
         @atlaskit/tokens dark mode. The remaining hardcoded fallbacks
         (var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7)) group-row bg, var(--ds-surface-sunken, #F7F8F9) sticky header, var(--ds-link, #0C66E4) focus bar,
         var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))) grid line) need explicit .dark companions per Rule 3.
         ───────────────────────────────────────────────────────────────────── */
      .dark .jira-table-grid .jira-table-row-focused > td {
        background-color: var(--ds-background-selected, #1C2B41) !important;
      }
      .dark .jira-table-grid tbody tr.jira-table-group-row > td,
      .dark .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(1),
      .dark .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(2),
      .dark .jira-table-grid tbody tr.jira-table-group-row > td:nth-child(3) {
        background: var(--ds-surface-sunken, #1D2125) !important;
      }
      .dark .jira-table-grid thead th {
        background: var(--ds-surface-sunken, #1D2125) !important;
      }
      .dark .jira-table-grid .jira-table-row-focused > td:first-child {
        box-shadow: inset 3px 0 0 var(--ds-border-selected, #579DFF), inset 0 -1px 0 0 var(--ds-border, #38414A) !important;
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
      // 2026-05-17 jira-compare cycle 2: when row-level drag handle is wired,
      // reserve a same-width spacer in the header so the master checkbox
      // aligns with body row checkboxes (the body has [handle-spacer][cb]).
      const headerHandleSpacer =
        renderRowDragHandle && !rowDragHandleHidden ? (
          <span style={{ width: 16, height: 16, display: 'inline-block' }} aria-hidden />
        ) : null;
      cells.push({
        key: '__select',
        content: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {headerHandleSpacer}
            <AkCheckbox
              isChecked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              label=""
            />
          </span>
        ),
        width: 3,
      });
    }

    for (const col of visibleColumns) {
      // 2026-06-09: column-picker icon is now overlaid on top of the
      // `__actions` header (Jira parity — Jira's column-picker icon lives
      // in the row-actions column header, not in a dedicated column).
      const isActionsHeader = col.id === '__actions';
      const headerContent =
        isActionsHeader && showColumnManager ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <ColumnManagerTrigger
              columns={columns}
              visibility={columnVisibility!}
              onChange={onColumnVisibilityChange!}
            />
          </div>
        ) : (
          <span
            // Header label — Jira parity (2026-04-26 re-probe from
            // BAU list view "Summary"): 12px / 700 / #505258 /
            // textTransform none / letterSpacing normal. NO uppercase.
            // 2026-06-23: flex:1 + min-width:0 + overflow ellipsis lets the
            // label shrink when the column gets narrow so the sort arrow +
            // 3-dot icons next to it never overflow into the next column.
            style={{
              fontSize: d.headerFontSize,
              fontWeight: 700,
              color: 'var(--ds-text-subtle, #505258)',
              textTransform: 'none',
              letterSpacing: 'normal',
              whiteSpace: 'nowrap',
              textAlign: col.align === 'center' ? 'center' : col.align === 'end' ? 'right' : 'left',
              display: 'block',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {col.label}
          </span>
        );
      cells.push({
        key: col.id,
        content: headerContent,
        isSortable: !!col.sortable,
        width: col.width,
      });
    }

    return { cells };
  }, [allSelected, visibleColumns, columns, columnVisibility, onColumnVisibilityChange, showColumnManager, d.headerFontSize, selectable, toggleAll, renderRowDragHandle, rowDragHandleHidden]);

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
        const dragHandleNode =
          renderRowDragHandle && !rowDragHandleHidden ? renderRowDragHandle(row) : null;
        rowCells.push({
          key: `${id}-select`,
          content: (
            <span
              data-jira-table-editor // marker: click shouldn't trigger row navigation
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {/* 2026-05-17 jira-compare cycle 2 (revision 2): row-level drag
                  handle rendered as an INLINE-FLEX sibling of the checkbox so
                  the handle's width is reserved on every row (Jira's pattern:
                  the gutter is always allocated). visibility:hidden keeps the
                  handle in layout but invisible at rest; the .jira-row-drag-
                  handle CSS rule flips it to visible on tr:hover. Previous
                  revision used position:absolute which was clipped by the td's
                  overflow:hidden. */}
              {dragHandleNode && (
                <span
                  className="jira-row-drag-handle"
                  style={{ visibility: 'hidden', display: 'inline-flex' }}
                  aria-hidden
                >
                  {dragHandleNode}
                </span>
              )}
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

        // The first non-structural column gets the expand chevron slot.
        // Skip ALL __ prefix columns (drag, checkbox, select, actions) —
        // the chevron goes into the first visible user-data column (e.g. type).
        if (firstDataColIdx === -1 && !col.id.startsWith('__')) {
          firstDataColIdx = colIdx;
        }
        const isFirstDataCol = colIdx === firstDataColIdx;

        rowCells.push({
          key: `${id}-${col.id}`,
          colId: col.id,
          content: (
            <div
              style={{
                fontSize: d.cellFontSize,
                color: 'var(--ds-text, #292A2E)',
                paddingTop: d.cellPaddingY - 4,
                paddingBottom: d.cellPaddingY - 4,
                paddingLeft: isFirstDataCol && indentPx > 0 ? indentPx : (col.align === 'center' ? undefined : 4),
                paddingRight: col.align === 'center' ? undefined : 4,
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
                minWidth: 0,
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
                        color: 'var(--ds-text-subtle, #6B6E76)',
                        borderRadius: 3,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06))';
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
                // Only render the empty slot when the hierarchy feature is active
                // (getRowHasChildren is provided). Leaf rows in a flat list skip
                // the slot entirely so the type icon starts at the cell edge.
                if (!getRowHasChildren) return null;
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

      // 2026-06-09: column-manager no longer has a dedicated column; its
      // icon is overlaid on the `__actions` header. No row cell needed.

      return {
        key: id,
        className: isFocused ? 'jira-table-row-focused' : undefined,
        onClick: (e: React.MouseEvent) => {
          // 2026-05-10 Jira-parity fix: clicking ANYWHERE on the row body
          // (except inline editor cells, form controls, links/buttons with
          // their own onClick) opens the detail panel. Matches Jira's
          // BAU list-view behavior where row body is the click target.
          // Inline editors (status/priority/assignee/summary) carry
          // `data-jira-cell-editor` and stopPropagation, so they're already
          // safe — this guard is defensive belt-and-braces.
          const target = e.target as HTMLElement;
          if (target.closest('[data-jira-cell-editor], [data-jira-table-editor], input, textarea, select, [contenteditable="true"]')) return;
          // Anchors and buttons inside cells handle their own navigation.
          // Exception: the Key-cell anchor explicitly carries
          // `data-jira-table-row-open` and IS a panel-open trigger.
          const explicitOpen = target.closest('[data-jira-table-row-open]');
          const interactive = target.closest('a, button');
          if (interactive && !explicitOpen) return;
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
        (selectable ? 1 : 0) + visibleColumns.length;

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
              className="jira-group-header-row"
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
                padding: '4px 12px',
                margin: '-4px -12px',  // bleed into the cell padding
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
                    // 2026-05-08 DOM probe: Jira group header chevron color = rgb(80,82,88)
                    // = --ds-text-subtle. Was #6B6E76 (--ds-text-subtlest) — too faint.
                    color: 'var(--ds-text-subtle, #505258)',
                    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease',
                    flexShrink: 0,
                  }}
                >
                  {/* 2026-05-08 DOM probe: Jira group header chevron = 24×24px (size="medium").
                      Catalyst was using size="small" (16px) — visually too thin/small vs Jira. */}
                  <ChevronDownIcon label="" size="medium" />
                </span>
              )}
              {/* 2026-05-08 Jira parity: label BEFORE + button.
                  Jira layout: checkbox > chevron > LABEL > +
                  Prior Catalyst layout had + before label — wrong. */}
              {(g as any).labelNode != null ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {(g as any).labelNode}
                </span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtle, #42526E)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {g.label}
                </span>
              )}
              {g.meta && (
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))' }}>
                  {g.meta}
                </span>
              )}
              {enableGroupCreateButton && onAddToGroup && (
                // 2026-05-08: + is AFTER label (Jira parity). Hidden by default,
                // visible on row hover via .jira-group-header-row:hover .jira-group-add-btn CSS.
                // 2026-05-17: feature flag `enableGroupCreateButton` gates this entire feature
                // to ensure consumers declare intent explicitly via canonical prop.
                <span className="jira-group-add-btn" style={{ display: 'inline-flex' }}>
                  <button
                    type="button"
                    data-testid="jira-table.group-row.add-issue-button"
                    aria-label={`Add issue to ${g.label}`}
                    onClick={(e) => {
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
                      color: 'var(--ds-text-subtle, #6B6E76)',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9, 30, 66, 0.06))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <PlusIcon label="" size="small" />
                  </button>
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
            const totalCols = (selectable ? 1 : 0) + visibleColumns.length;
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
    renderRowDragHandle,
    rowDragHandleHidden,
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
    sumWidth: number;
    resizable: boolean;
    sortable: boolean;
  }> = [];
  if (selectable) {
    const px = effectiveWidthFor('__select', 40);
    colWidthEntries.push({ id: '__select', width: px, widthCss: `${px}px`, sumWidth: px, resizable: false, sortable: false });
  }
  for (const col of visibleColumns) {
    const userOverride = columnWidths[col.id];
    const naturalPx = naturalWidthFor(col);
    // table-layout:fixed + width:100% on the table:
    //   - Fixed columns get an explicit pixel width on their <col>.
    //   - The ONE flex column (Summary) gets NO width on its <col> so the
    //     browser hands it all remaining space after fixed cols are placed.
    //   - User resize overrides stay pinned to pixels as before.
    // 2026-06-09: flex column (Work / Summary) keeps its expand-to-fill
    // behavior so it has its wide default; but the sum we compute for the
    // TABLE width below also reserves at least FLEX_MIN_WIDTH per flex
    // column. That way the table extends rather than letting the flex col
    // shrink when more columns are added.
    const widthCss = userOverride != null
      ? `${userOverride}px`
      : col.flex
        ? ''          // flex → browser hands it remaining space
        : `${naturalPx}px`;
    // 2026-06-09: `sumWidth` is the pixel value used ONLY for the table's
    // total width. For flex columns we use a generous floor (640px) so
    // the table is wide enough that the flex column (Work / Summary) can
    // display full work-item titles by default even when many other
    // columns are added. The column itself still expands beyond this
    // floor when the viewport has spare room.
    const FLEX_SUM_FLOOR = 640;
    const sumWidth = col.flex
      ? Math.max(naturalPx, FLEX_SUM_FLOOR)
      : (userOverride ?? naturalPx);
    colWidthEntries.push({
      id: col.id,
      width: userOverride ?? naturalPx,
      widthCss,
      sumWidth,
      resizable: !col.id.startsWith('__'),
      sortable: !!col.sortable,
    });
  }
  // 2026-06-09: __column-manager no longer occupies a column; its icon is
  // overlaid on the __actions header. No width entry needed.

  const viewportRef = useRef<HTMLDivElement>(null);
  const useVirtual = enableVirtualization;
  const virtualizer = useVirtual
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useVirtualizer({
        count: rows.length,
        getScrollElement: () => viewportRef.current,
        estimateSize: () => d.rowHeight,
        overscan: 10,
      })
    : null;

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
      className={`jira-table-grid${selectable ? ' has-select-col' : ''}`}
      aria-label={ariaLabel}
      tabIndex={0}
      style={{
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
        fontSize: d.cellFontSize,
        color: 'var(--ds-text, #292A2E)',
        outline: 'none',
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
        border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))',
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
      <div
        className="jira-table-viewport"
        ref={viewportRef}
        style={useVirtual ? { overflowY: 'auto', flex: 1, minHeight: 0 } : undefined}
      >
        <table
          role="grid"
          // 2026-06-09 Jira parity: table width is the SUM of each column's
          // sumWidth (flex columns floor at 480px so adding new columns
          // never shrinks the Work / Summary column below its full default
          // width). Combined with max(100%, ...) so narrow tables still
          // fill the container — the flex column expands to absorb the
          // leftover. Viewport overflow-x:auto handles scroll when total
          // exceeds container.
          style={{
            width: `max(100%, ${colWidthEntries.reduce(
              (sum, e) => sum + Math.max(48, e.sumWidth),
              0,
            )}px)`,
          }}
        >
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
                const colMeta = meta ? columns.find((c) => c.id === meta.id) : undefined;
                const isLocked = !!colMeta?.lockedPosition;
                const isReorderable = enableColumnReorder && !!meta && !isStructural && !isLocked;
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
                    data-actions-sticky={meta?.id === '__actions' ? '' : undefined}
                    data-jt-drag-over={isDragOverThis ? 'true' : undefined}
                    data-jt-drag-source={isDraggingThis ? 'true' : undefined}
                    data-resize-state={
                      meta && resizing?.id === meta.id
                        ? 'active'
                        : meta && hoveredResizeColId === meta.id
                          ? 'hover'
                          : undefined
                    }
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
                      // Custom drag image: blue-outlined rectangle sized to
                      // the column body (width = th width, height = full
                      // table height). Mirrors Jira's column-drag ghost.
                      try {
                        const thEl = e.currentTarget as HTMLElement;
                        const tableEl = thEl.closest('table') as HTMLElement | null;
                        const thRect = thEl.getBoundingClientRect();
                        const tableRect = tableEl?.getBoundingClientRect();
                        const ghostW = Math.round(thRect.width);
                        const ghostH = Math.round(tableRect?.height ?? thRect.height);
                        const ghost = document.createElement('div');
                        ghost.style.cssText = [
                          `position:fixed`,
                          `top:-10000px`,
                          `left:-10000px`,
                          `width:${ghostW}px`,
                          `height:${ghostH}px`,
                          `background:rgba(76,154,255,0.10)`,
                          `border:2px solid var(--ds-border-selected, #4C9AFF)`,
                          `border-radius:3px`,
                          `pointer-events:none`,
                          `box-sizing:border-box`,
                          `z-index:9999`,
                        ].join(';');
                        document.body.appendChild(ghost);
                        const offsetX = Math.round(e.clientX - thRect.left);
                        const offsetY = Math.round(e.clientY - thRect.top);
                        e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
                        setTimeout(() => ghost.remove(), 0);
                      } catch { /* setDragImage unsupported / cross-origin guard */ }
                      dragIdRef.current = meta!.id;
                      setDragId(meta!.id);
                    } : undefined}
                    onDragOver={isReorderable ? (e) => {
                      const currentDragId = dragIdRef.current;
                      if (!currentDragId || currentDragId === meta!.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverId !== meta!.id) setDragOverId(meta!.id);
                    } : undefined}
                    onDragLeave={isReorderable ? () => {
                      if (dragOverId === meta!.id) setDragOverId(null);
                    } : undefined}
                    onDrop={isReorderable ? (e) => {
                      e.preventDefault();
                      const sourceId = (e.dataTransfer.getData('text/plain') || dragIdRef.current) as string;
                      if (!sourceId) { dragIdRef.current = null; setDragId(null); setDragOverId(null); return; }
                      const next = computeReorder(sourceId, meta!.id);
                      if (next) commitColumnOrder(next);
                      dragIdRef.current = null;
                      setDragId(null);
                      setDragOverId(null);
                    } : undefined}
                    onDragEnd={isReorderable ? () => {
                      dragIdRef.current = null;
                      setDragId(null);
                      setDragOverId(null);
                    } : undefined}
                    style={{
                      // 2026-06-09 Jira parity: __actions header (and ONLY
                      // the header, not the column body) is pinned to the
                      // right edge so the column-picker icon stays visible
                      // while data scrolls underneath horizontally. Body
                      // cells scroll naturally with the rest of the row.
                      // Higher z-index keeps it above the body row above.
                      position: 'sticky',
                      top: 0,
                      right: meta?.id === '__actions' ? 0 : undefined,
                      zIndex: meta?.id === '__actions' ? 3 : undefined,
                      background: isDragOverThis
                        ? 'var(--ds-background-selected, rgba(76, 154, 255, 0.15))'
                        : meta?.id === '__actions'
                          ? 'var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))'
                          : undefined,
                      // 2026-06-09: when __actions header sticks during
                      // horizontal scroll, add a 1px left divider so the
                      // sticky cell visually separates from the scrolling
                      // content sliding underneath it. Combined with the
                      // bottom border that all headers share.
                      boxShadow: isDragOverThis
                        ? 'inset 1px 0 0 0 var(--ds-border-selected, #4C9AFF), inset -1px 0 0 0 var(--ds-border-selected, #4C9AFF), inset 0 -2px 0 0 var(--ds-border, #C1C7D0)'
                        : meta?.id === '__actions'
                          ? 'inset 1px 0 0 0 var(--ds-border, #C1C7D0), inset 0 -2px 0 0 var(--ds-border, #C1C7D0)'
                          : 'inset 0 -2px 0 0 var(--ds-border, #C1C7D0)',
                      // 2026-05-10 Jira-parity: sort affordance wins over reorder
                      // affordance for cursor. Sortable headers always show pointer
                      // so click-to-sort is discoverable. Active drag shows grabbing.
                      // Non-sortable reorderable headers fall back to grab.
                      cursor: isReorderable
                        ? (isDraggingThis ? 'grabbing' : (meta?.sortable ? 'pointer' : 'grab'))
                        : undefined,
                      opacity: isDraggingThis ? 0.55 : 1,
                      ...meta?.headerStyle,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', overflow: 'hidden' }}>
                      {/* F-NEW-3 chevron-slot placeholder in the header,
                          mirrors body-row slot at `data-jira-table-issue-chevron-slot`. */}
                      {isFirstDataColHeader && (
                        <span
                          aria-hidden="true"
                          data-jt-chevron-slot="true"
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
                      {/* 2026-06-23 Jira-parity sort arrow:
                          - Sorted: always visible
                          - Sortable (unsorted): show on header hover */}
                      {meta?.sortable && !isStructural && (
                        <button
                          type="button"
                          aria-label={isSorted
                            ? `Sorted ${sortOrder === 'ASC' ? 'ascending' : 'descending'} — toggle`
                            : `Sort ${meta.id} ascending`}
                          className={isSorted ? 'jira-th-sort-arrow jira-th-sort-arrow-active' : 'jira-th-sort-arrow'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHeaderClick(meta.id, true);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 18,
                            padding: 0,
                            border: 'none',
                            borderRadius: 3,
                            background: 'transparent',
                            color: isSorted
                              ? 'var(--ds-text, #292A2E)'
                              : 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
                            cursor: 'pointer',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {sortOrder === 'DESC' && isSorted
                            ? <ArrowDownIcon label="" size="small" />
                            : <ArrowUpIcon label="" size="small" />}
                        </button>
                      )}
                      {/* 2026-06-23 Jira-parity per-column 3-dot menu:
                          Hover-revealed; opens portal menu (per CLAUDE.md
                          @atlaskit/dropdown-menu ban inside overflow:hidden). */}
                      {!isStructural && meta && (() => {
                        const col = visibleColumns.find((c) => c.id === meta.id);
                        if (!col) return null;
                        const isMenuOpen = headerMenuColId === meta.id;
                        return (
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) headerMenuTriggerRefs.current.set(meta.id, el);
                              else headerMenuTriggerRefs.current.delete(meta.id);
                            }}
                            aria-label={`${col.label} column actions`}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            className={isMenuOpen ? 'jira-th-menu-trigger jira-th-menu-trigger-active' : 'jira-th-menu-trigger'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHeaderMenuColId(isMenuOpen ? null : meta.id);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: 18,
                              padding: 0,
                              border: isMenuOpen ? '1px solid var(--ds-border-selected, #0C66E4)' : 'none',
                              borderRadius: 3,
                              background: isMenuOpen ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                              color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
                              cursor: 'pointer',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                              <circle cx="2" cy="6" r="1" />
                              <circle cx="6" cy="6" r="1" />
                              <circle cx="10" cy="6" r="1" />
                            </svg>
                          </button>
                        );
                      })()}
                      {/* 2026-05-10 Jira-parity: hover-revealed filter chevron. */}
                      {(() => {
                        const col = meta && !isStructural
                          ? visibleColumns.find((c) => c.id === meta.id)
                          : undefined;
                        if (!col?.filterable) return null;
                        const isFilterOpen = filterMenu?.colId === col.id;
                        const showChevron = col.hasActiveFilter || isFilterOpen;
                        return (
                          <button
                            type="button"
                            data-jira-filter-trigger
                            aria-label={`Filter ${col.label}`}
                            aria-haspopup="dialog"
                            aria-expanded={isFilterOpen}
                            className={col.hasActiveFilter || isFilterOpen ? 'jira-filter-chevron jira-filter-chevron-active' : 'jira-filter-chevron'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFilterOpen) {
                                setFilterMenu(null);
                                return;
                              }
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setFilterMenu({ colId: col.id, top: rect.bottom + 4, left: rect.left });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 18,
                              height: 18,
                              padding: 0,
                              border: 'none',
                              borderRadius: 3,
                              background: showChevron ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))' : 'transparent',
                              color: col.hasActiveFilter ? 'var(--ds-icon-brand, #0C66E4)' : 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
                              cursor: 'pointer',
                              flexShrink: 0,
                              opacity: showChevron ? 1 : 0,
                              transition: 'opacity 100ms',
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
                              <path d="M2.5 3.5 5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                            </svg>
                          </button>
                        );
                      })()}
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
                        onMouseEnter={() => setHoveredResizeColId(meta.id)}
                        onMouseLeave={() => {
                          // Keep visible while actively resizing this col.
                          if (resizing?.id !== meta.id) setHoveredResizeColId(null);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setResizing({ id: meta.id, startX: e.clientX, startWidth: meta.width });
                          setHoveredResizeColId(meta.id);
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
            {!isLoading && !virtualizer && rows.map((r: any) => {
              const isGroup = typeof r.key === 'string' && r.key.startsWith('__group-');
              return (
                <tr
                  key={r.key}
                  className={[r.className, isGroup ? 'jira-table-group-row' : ''].filter(Boolean).join(' ')}
                  onClick={r.onClick}
                  onContextMenu={r.onContextMenu}
                  style={{ minHeight: d.rowHeight }}
                >
                  {r.cells.map((c: any) => {
                    const isDropTarget = c.colId && dragOverId === c.colId && dragId && dragId !== c.colId;
                    const isResizeHoverCol = c.colId && hoveredResizeColId === c.colId;
                    const cellMeta = c.colId ? colWidthEntries.find((e) => e.id === c.colId) : undefined;
                    const cellResizable = !!cellMeta?.resizable && !isGroup;
                    return (
                      <td
                        key={c.key}
                        colSpan={c.colSpan}
                        data-col-id={c.colId}
                        data-jt-drag-over={isDropTarget ? 'true' : undefined}
                        data-jt-drag-source={c.colId && dragId === c.colId ? 'true' : undefined}
                        data-resize-state={
                          c.colId && resizing?.id === c.colId
                            ? 'active'
                            : isResizeHoverCol
                              ? 'hover'
                              : undefined
                        }
                        style={{
                        overflow: 'hidden',
                        position: 'relative',
                        ...(c.colId === '__actions' ? {
                          position: 'sticky',
                          right: 0,
                          zIndex: 2,
                          background: 'var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))',
                        } : {}),
                        ...(isDropTarget ? {
                          background: 'var(--ds-background-selected, rgba(76, 154, 255, 0.15))',
                          boxShadow: 'inset 1px 0 0 0 var(--ds-border-selected, #4C9AFF), inset -1px 0 0 0 var(--ds-border-selected, #4C9AFF)',
                        } : {}),
                      }}>
                        {c.content}
                        {cellResizable && cellMeta && (
                          <span
                            className="jira-resize-handle"
                            data-active={resizing?.id === cellMeta.id ? 'true' : 'false'}
                            role="separator"
                            aria-orientation="vertical"
                            aria-label="Resize column"
                            draggable={false}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={() => setHoveredResizeColId(cellMeta.id)}
                            onMouseLeave={() => {
                              if (resizing?.id !== cellMeta.id) setHoveredResizeColId(null);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizing({ id: cellMeta.id, startX: e.clientX, startWidth: cellMeta.width });
                              setHoveredResizeColId(cellMeta.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setColumnWidths((prev) => {
                                const next = { ...prev };
                                delete next[cellMeta.id];
                                return next;
                              });
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!isLoading && virtualizer && (() => {
              const vItems = virtualizer.getVirtualItems();
              const totalSize = virtualizer.getTotalSize();
              const paddingTop = vItems.length > 0 ? (vItems[0]?.start ?? 0) : 0;
              const paddingBottom = vItems.length > 0
                ? totalSize - (vItems[vItems.length - 1]?.end ?? 0)
                : 0;
              return (
                <>
                  {paddingTop > 0 && (
                    <tr style={{ height: paddingTop }}>
                      <td colSpan={colWidthEntries.length} />
                    </tr>
                  )}
                  {vItems.map((vRow) => {
                    const r = rows[vRow.index] as any;
                    if (!r) return null;
                    const isGroup = typeof r.key === 'string' && r.key.startsWith('__group-');
                    return (
                      <tr
                        key={r.key}
                        data-index={vRow.index}
                        ref={virtualizer?.measureElement as any}
                        className={[r.className, isGroup ? 'jira-table-group-row' : ''].filter(Boolean).join(' ')}
                        onClick={r.onClick}
                        onContextMenu={r.onContextMenu}
                        style={{ minHeight: d.rowHeight }}
                      >
                        {r.cells.map((c: any) => {
                          const isResizeHoverCol = c.colId && hoveredResizeColId === c.colId;
                          const cellMeta = c.colId ? colWidthEntries.find((e) => e.id === c.colId) : undefined;
                          const cellResizable = !!cellMeta?.resizable && !isGroup;
                          return (
                            <td
                              key={c.key}
                              colSpan={c.colSpan}
                              data-col-id={c.colId}
                              data-resize-state={
                                c.colId && resizing?.id === c.colId
                                  ? 'active'
                                  : isResizeHoverCol
                                    ? 'hover'
                                    : undefined
                              }
                              style={{
                              overflow: 'hidden',
                              position: 'relative',
                              ...(c.colId === '__actions' ? {
                                position: 'sticky',
                                right: 0,
                                zIndex: 2,
                                background: 'var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))',
                              } : {}),
                            }}>
                              {c.content}
                              {cellResizable && cellMeta && (
                                <span
                                  className="jira-resize-handle"
                                  data-active={resizing?.id === cellMeta.id ? 'true' : 'false'}
                                  role="separator"
                                  aria-orientation="vertical"
                                  aria-label="Resize column"
                                  draggable={false}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseEnter={() => setHoveredResizeColId(cellMeta.id)}
                                  onMouseLeave={() => {
                                    if (resizing?.id !== cellMeta.id) setHoveredResizeColId(null);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setResizing({ id: cellMeta.id, startX: e.clientX, startWidth: cellMeta.width });
                                    setHoveredResizeColId(cellMeta.id);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setColumnWidths((prev) => {
                                      const next = { ...prev };
                                      delete next[cellMeta.id];
                                      return next;
                                    });
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr style={{ height: paddingBottom }}>
                      <td colSpan={colWidthEntries.length} />
                    </tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
        {/* Apr 27, 2026 (L70): bottomSlot renders INSIDE the viewport
            so the horizontal scrollbar appears BELOW it, not between
            it and the table content. Lets a "+ Create" row sit flush
            against the table's last row with zero visual gap. */}
        {props.bottomSlot}
      </div>
      {/* Sticky create row — rendered OUTSIDE the viewport so it does
          NOT move with the table's horizontal scroll. Sits at the bottom
          of the .jira-table-grid flex column at the visible viewport width. */}
      {enableStickyCreateFooter && stickyCreateFooter && (() => {
        const visible = data?.length ?? 0;
        const total = totalRowCount ?? visible;
        const showCount = showRowCount && !groups && data && data.length > 0 && !onPageChange;
        const countLabel = `${visible} of ${total}`;
        const creating = stickyCreateFooter.active != null;
        return (
          <div
            style={{
              background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
              minHeight: 40,
              flexShrink: 0,
              marginTop: 'auto',
              ...(creating ? {
                borderTop: '2px solid var(--ds-border-focused, #4688EC)',
                borderLeft: '2px solid var(--ds-border-focused, #4688EC)',
                borderRight: '2px solid var(--ds-border-focused, #4688EC)',
                borderBottom: '2px solid var(--ds-border-focused, #4688EC)',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
              } : {
                boxShadow: 'inset 0 1px 0 0 var(--ds-border, rgba(11,18,14,0.14))',
              }),
            }}
          >
            {stickyCreateFooter.active ?? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  height: 40,
                  padding: '0 8px',
                }}
              >
                <button
                  type="button"
                  onClick={stickyCreateFooter.onActivate}
                  className="jira-table-create-btn"
                  style={{
                    justifySelf: 'start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 28,
                    padding: '0 8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--ds-text, #292A2E)',
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 3,
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1, marginTop: -2, fontWeight: 400 }}>+</span>
                  <span>{stickyCreateFooter.placeholder ?? 'Create'}</span>
                </button>
                <div
                  style={{
                    justifySelf: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--ds-text, #292A2E)',
                  }}
                >
                  {showCount && <span>{countLabel}</span>}
                  {stickyCreateFooter.onRefresh && (
                    <button
                      type="button"
                      onClick={() => { void stickyCreateFooter.onRefresh?.(); }}
                      className="jira-table-refresh-btn"
                      aria-label="Refresh"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        border: 'none',
                        background: 'transparent',
                        borderRadius: 3,
                        cursor: 'pointer',
                        padding: 0,
                        color: 'var(--ds-text, #292A2E)',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  )}
                </div>
                <div />
              </div>
            )}
          </div>
        );
      })()}

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
            borderTop: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))',
            fontSize: 13,
            color: 'var(--ds-text-subtle, #42526E)',
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
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

      {/* Per-column filter popup (portal, anchored to header chevron). */}
      {filterMenu && createPortal(
        <div
          ref={filterMenuRef}
          role="dialog"
          aria-label={`Filter ${filterMenu.colId}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: filterMenu.top,
            left: filterMenu.left,
            zIndex: 9999,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
            border: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
            borderRadius: 4,
            boxShadow: '0 8px 16px var(--ds-shadow-raised, rgba(9,30,66,0.15))',
            minWidth: 220,
            maxHeight: 360,
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {(() => {
            const col = visibleColumns.find((c) => c.id === filterMenu.colId);
            return col?.renderFilterMenu?.(() => setFilterMenu(null)) ?? null;
          })()}
        </div>,
        document.body,
      )}
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
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
            border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))',
            borderRadius: 4,
            boxShadow: '0 1px 1px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 8px 24px -4px var(--ds-shadow-raised, rgba(9,30,66,0.18))',
            padding: 4,
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: 'var(--ds-text, #292A2E)',
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
                    // legacy var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D))) → --ds-text fallback #292A2E to match
                    // the rest of the table's body-text token swap.
                    color: a.danger ? 'var(--ds-text-danger, #AE2A19)' : 'var(--ds-text, #292A2E)',
                    fontSize: 14,
                    textAlign: 'left',
                    cursor: disabled ? 'default' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    fontFamily: 'inherit',
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = a.danger ? 'var(--ds-background-danger-hovered, #FFEBE6)' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))'; }}
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
      {/* 2026-06-23 Per-column 3-dot menu (portal) */}
      {headerMenuColId && (() => {
        const col = visibleColumns.find((c) => c.id === headerMenuColId);
        if (!col) return null;
        const triggerRef = { current: headerMenuTriggerRefs.current.get(headerMenuColId) ?? null };
        const reorderable = visibleColumns
          .filter((c) => !c.id.startsWith('__') && !c.lockedPosition)
          .map((c) => c.id);
        const idx = reorderable.indexOf(headerMenuColId);
        const isFirst = idx === 0;
        const isLast = idx === reorderable.length - 1;
        const canReorder = enableColumnReorder && !col.lockedPosition && idx >= 0;
        const canRemove = !!columnVisibility && !!onColumnVisibilityChange && !col.alwaysVisible;
        const widthMeta = colWidthEntries.find((e) => e.id === headerMenuColId);
        const items: MenuItem[] = [];
        if (col.sortable) {
          items.push({
            id: 'sort-asc',
            label: 'Sort lowest to highest',
            onClick: () => onSortChange?.(headerMenuColId, 'ASC'),
          });
          items.push({
            id: 'sort-desc',
            label: 'Sort highest to lowest',
            onClick: () => onSortChange?.(headerMenuColId, 'DESC'),
          });
        } else if (col.lockedPosition) {
          // Work column — Jira parity: "Sort by columns" is a non-interactive
          // SECTION LABEL above Type / Key / Summary entries (each a submenu
          // of A→Z / Z→A or low→high / high→low). Prefer the explicit
          // col.subSorts contract (Jira's composite-cell sort grouping); fall
          // back to sortable peers for older consumers without subSorts.
          if (col.subSorts && col.subSorts.length > 0) {
            items.push({
              id: 'sort-by-columns-label',
              label: 'Sort by columns',
              kind: 'sectionLabel',
            });
            for (const sub of col.subSorts) {
              const isAlpha = sub.kind === 'alpha';
              items.push({
                id: `sort-${sub.id}`,
                label: sub.label,
                hasSubmenu: true,
                submenu: [
                  {
                    id: `sort-${sub.id}-asc`,
                    label: isAlpha ? 'Sort A to Z' : 'Sort lowest to highest',
                    onClick: () => onSortChange?.(sub.id, 'ASC'),
                  },
                  {
                    id: `sort-${sub.id}-desc`,
                    label: isAlpha ? 'Sort Z to A' : 'Sort highest to lowest',
                    onClick: () => onSortChange?.(sub.id, 'DESC'),
                  },
                ],
              });
            }
          } else {
            const sortablePeers = visibleColumns.filter((c) => c.sortable && !c.id.startsWith('__'));
            if (sortablePeers.length > 0) {
              items.push({
                id: 'sort-by-columns',
                label: 'Sort by columns',
                hasSubmenu: true,
                submenu: sortablePeers.flatMap((peer) => [
                  {
                    id: `sort-${peer.id}-asc`,
                    label: `${peer.label}: A to Z`,
                    onClick: () => onSortChange?.(peer.id, 'ASC'),
                  },
                  {
                    id: `sort-${peer.id}-desc`,
                    label: `${peer.label}: Z to A`,
                    onClick: () => onSortChange?.(peer.id, 'DESC'),
                  },
                ]),
              });
            }
          }
        }
        if (canReorder) {
          if (items.length > 0) items[items.length - 1].divider = 'after';
          if (!isFirst) {
            items.push({ id: 'move-first', label: 'Move column to first position', onClick: () => moveColumn(headerMenuColId, 'first') });
            items.push({ id: 'move-left', label: 'Move column to left', onClick: () => moveColumn(headerMenuColId, 'left') });
          }
          if (!isLast) {
            items.push({ id: 'move-right', label: 'Move column to right', onClick: () => moveColumn(headerMenuColId, 'right') });
            items.push({ id: 'move-last', label: 'Move column to last position', onClick: () => moveColumn(headerMenuColId, 'last') });
          }
        }
        if (canRemove) {
          items.push({
            id: 'remove',
            label: 'Remove column',
            onClick: () => {
              if (!columnVisibility || !onColumnVisibilityChange) return;
              const next = new Set(columnVisibility);
              next.delete(headerMenuColId);
              onColumnVisibilityChange(next);
            },
          });
        }
        if (items.length > 0) items[items.length - 1].divider = 'after';
        items.push({
          id: 'resize',
          label: 'Resize column',
          onClick: () => {
            resizeDialogOriginalWidthRef.current = widthMeta?.width ?? null;
            setResizeDialogColId(headerMenuColId);
          },
        });
        if (columnWidths[headerMenuColId] != null) {
          items.push({
            id: 'reset-width',
            label: 'Reset column width',
            onClick: () => {
              setColumnWidths((prev) => {
                const next = { ...prev };
                delete next[headerMenuColId];
                onColumnWidthsChangeRef.current?.(next);
                return next;
              });
            },
          });
        }
        return (
          <ColumnHeaderMenu
            isOpen={true}
            onClose={() => setHeaderMenuColId(null)}
            triggerRef={triggerRef as React.RefObject<HTMLButtonElement>}
            items={items}
          />
        );
      })()}
      {/* 2026-06-23 Column resize dialog (portal, slider with live preview) */}
      {resizeDialogColId && (() => {
        const col = visibleColumns.find((c) => c.id === resizeDialogColId);
        if (!col) return null;
        const triggerRef = { current: headerMenuTriggerRefs.current.get(resizeDialogColId) ?? null };
        const widthMeta = colWidthEntries.find((e) => e.id === resizeDialogColId);
        const original = resizeDialogOriginalWidthRef.current ?? widthMeta?.width ?? 120;
        return (
          <ResizeColumnDialog
            isOpen={true}
            onClose={() => setResizeDialogColId(null)}
            triggerRef={triggerRef as React.RefObject<HTMLElement>}
            columnLabel={col.label}
            currentWidth={original}
            onPreview={(next) => {
              setColumnWidths((prev) => ({ ...prev, [resizeDialogColId]: next }));
            }}
            onSave={(next) => {
              setColumnWidths((prev) => {
                const merged = { ...prev, [resizeDialogColId]: next };
                onColumnWidthsChangeRef.current?.(merged);
                return merged;
              });
            }}
            onCancel={() => { /* preview already reverts via onPreview(original) */ }}
          />
        );
      })()}
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
  // 2026-05-12 Jira parity: My defaults / System tabs.
  // "My defaults" shows columns marked defaultVisible:true (the canonical
  // out-of-box set). "System" shows ALL toggleable columns. Matches Jira's
  // column-picker tab pattern probed at digital-transformation.atlassian.net.
  const [activeTab, setActiveTab] = useState<'my-defaults' | 'system'>('system');
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
  // 2026-05-12 Jira parity: My defaults tab filters to defaultVisible:true cols.
  // System tab shows the full toggleable set. Search applies on top.
  const tabFiltered = activeTab === 'my-defaults'
    ? toggleable.filter((c) => c.defaultVisible)
    : toggleable;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? tabFiltered.filter((c) => (c.label || c.id).toLowerCase().includes(q))
    : tabFiltered;
  // Jira parity "X of Y" count display at bottom: visible-after-search / total-in-tab.
  const totalInTab = tabFiltered.length;
  const matchCount = filtered.length;

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
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          // 2026-06-09: black stroke (color.text default) per user spec —
          // was inheriting subtle gray which was too light against Jira.
          color: 'var(--ds-text, #172B4D)',
          cursor: 'pointer',
          borderRadius: 3,
          outline: 'none',
          boxShadow: 'none',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #F1F2F4)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        onFocus={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #F1F2F4)')}
        onBlur={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        {/* 2026-06-09 Jira parity: Jira's column-picker icon is a bordered
            rectangle with three internal vertical bars (a "closed" columns
            icon), not the open Lucide Columns3 glyph. Inline SVG to match.
            18×18 at strokeWidth 1.25 — visible at the larger size without
            the bolder weight from the 1.75 stroke I tried previously. */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <line x1="6" y1="3" x2="6" y2="13" />
          <line x1="10" y1="3" x2="10" y2="13" />
        </svg>
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
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
            border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))',
            borderRadius: 4,
            boxShadow: '0 1px 1px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 8px 24px -4px var(--ds-shadow-raised, rgba(9,30,66,0.18))',
            padding: 8,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
            color: 'var(--ds-text, #292A2E)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))' }}>
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
                color: 'var(--ds-link, #0C66E4)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '2px 4px',
                borderRadius: 3,
              }}
              title="Reset to defaults"
            >
              <ResetIcon label="" size="small" /> Reset
            </button>
          </div>
          {/* 2026-05-12 Jira parity: My defaults / System tabs */}
          <div
            role="tablist"
            aria-label="Column tabs"
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '2px solid transparent',
              padding: '0 4px',
              marginBottom: 6,
            }}
          >
            {[
              { id: 'my-defaults' as const, label: 'My defaults' },
              { id: 'system' as const, label: 'System' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? 'var(--ds-link, #0C66E4)' : 'transparent'}`,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--ds-link, #0C66E4)' : 'var(--ds-text-subtle, var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '0 4px 6px' }}>
            <Textfield
              isCompact
              autoFocus
              placeholder="Search columns"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              elemBeforeInput={
                <span style={{ paddingInlineStart: 8, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))', display: 'flex', alignItems: 'center' }}>
                  <SearchIcon label="" size="small" />
                </span>
              }
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--ds-text-subtlest, #7A869A)' }}>No matches</div>
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
                    color: 'var(--ds-text, #292A2E)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))')}
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
          {/* 2026-05-12 Jira parity: "X of Y" count display at the bottom */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px 2px', fontSize: 11, color: 'var(--ds-text-subtlest, #7A869A)',
            borderTop: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border, #DFE1E6)))', marginTop: 4,
          }}>
            <span>{matchCount} of {totalInTab}</span>
          </div>
          {/* Locked columns hint */}
          {columns.some((c) => c.alwaysVisible) && (
            <div style={{ padding: '6px 8px 2px', fontSize: 11, color: 'var(--ds-text-subtlest, #7A869A)' }}>
              {columns.filter((c) => c.alwaysVisible && !c.id.startsWith('__')).map((c) => c.label || c.id).join(', ')} are required.
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * TableInteractions — Jira-style hover-rod + grip + menu controls for
 * every table in the editor. Mounted once inside EditorView; finds all
 * tables, attaches per-cell hover detection, and renders:
 *
 *   • A small "rod" at the top of each column / left of each row when
 *     the user hovers any cell in that column/row.
 *   • The rod morphs into a 6-dot grip when hovered (hand cursor).
 *   • Clicking the grip highlights the entire column/row in blue and
 *     opens a contextual menu (ColumnMenu / RowMenu).
 *
 * Selection highlight is applied via data attributes on cells
 * (`data-catalyst-cell-selected`) which the CSS styles in
 * editorStyles.ts pick up.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  findTableFromDom,
  cellCoords,
  moveColumnTo,
  moveRowTo,
  type TableInfo,
} from './tableHelpers';
import { TableMap } from '@tiptap/pm/tables';
import { ColumnMenu } from './ColumnMenu';
import { RowMenu } from './RowMenu';
import {
  clearTableSelection,
  selectTableColumn,
  selectTableRow,
} from '../../extensions/TableSelection';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface HoverState {
  tablePos: number;
  /** Live reference to the actual <table> DOM — avoids re-deriving it
   *  via view.nodeDOM (which can return the wrapper or null depending
   *  on NodeView quirks). */
  tableDom: HTMLTableElement;
  row: number;
  col: number;
  rowRect: DOMRect;
  colRect: DOMRect;
  tableRect: DOMRect;
}

interface ActiveMenu {
  kind: 'column' | 'row';
  tablePos: number;
  tableDom: HTMLTableElement;
  index: number; // col or row index
  /** Rect of the grip that opened the menu — used to anchor the dropdown. */
  anchorRect: DOMRect;
}

/* Resting narrow pill (rod). Centered ON the table border line — so
   half sits above and half below the 1px border. */
const ROD_LENGTH = 24;
const ROD_THICKNESS = 3;
/* Lighter than the original gray so the rod reads as a hint rather
   than a structural line — but still distinct from the table border. */
const ROD_COLOR = '#C1C7D0';
/* Expanded pill with 6-dot grip (shown when cursor is in the hitbox).
   Hitbox dimensions stay constant whether or not the cursor is inside,
   so mouse-enter/leave can't oscillate as the visual pill changes size. */
const GRIP_LONG = 28;
const GRIP_SHORT = 18;
const GRIP_BG = '#85B8FF';
const GRIP_RADIUS = 4;
/* 3px white halo around the pill — hides the table border line
   passing behind the rod / grip, gives clean separation. */
const HALO_SHADOW = '0 0 0 3px var(--ds-surface, #FFFFFF)';

export function TableInteractions({ editor, containerRef }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null);
  const [rodHover, setRodHover] = useState<'col' | 'row' | null>(null);
  const rodColRef = useRef<HTMLDivElement | null>(null);
  const rodRowRef = useRef<HTMLDivElement | null>(null);
  // Highlight is handled by the TableSelection PM plugin via
  // Decoration.node — see ../../extensions/TableSelection.ts. React
  // just dispatches the meta transaction; PM adds the
  // .catalyst-cell-selected class to the cells; CSS does the rest.
  const clearHighlight = useCallback(() => {
    clearTableSelection(editor);
  }, [editor]);

  // Drag state — set when the user mousedowns the grip. If the cursor
  // moves > DRAG_THRESHOLD px before mouseup, we treat it as a drag
  // (reorder); otherwise it's a click (open menu).
  /** Live ref to the drag-preview DOM element. We append it to body
   *  on drag-start and call .remove() on drag-end — direct ownership
   *  guarantees cleanup even if React is mid-render from the PM
   *  transaction that fires the column/row move. */
  const previewElRef = useRef<HTMLDivElement | null>(null);

  const dragStateRef = useRef<{
    kind: 'column' | 'row';
    fromIndex: number;
    startX: number;
    startY: number;
    tablePos: number;
    table: HTMLTableElement;
    moved: boolean;
    /** Size of the source column/row, captured at drag-start. */
    sourceWidth: number;
    sourceHeight: number;
    /** Offset from the cursor to the preview's top-left corner. */
    grabOffsetX: number;
    grabOffsetY: number;
  } | null>(null);

  const DRAG_THRESHOLD = 4;

  const findDropTarget = useCallback(
    (
      kind: 'column' | 'row',
      table: HTMLTableElement,
      clientX: number,
      clientY: number,
    ): { index: number; line: { x: number; y: number; length: number } } | null => {
      const firstRow = table.querySelector('tr');
      if (!firstRow) return null;
      const tableRect = table.getBoundingClientRect();

      if (kind === 'column') {
        const cells = Array.from(firstRow.children).filter(
          (c) => !(c as HTMLElement).hasAttribute('data-catalyst-number'),
        ) as HTMLElement[];
        if (cells.length === 0) return null;
        // Build boundary X positions: left edge of each cell + right
        // edge of the last cell. Pick the boundary closest to cursor.
        const boundaries: number[] = cells.map(
          (c) => c.getBoundingClientRect().left,
        );
        boundaries.push(cells[cells.length - 1].getBoundingClientRect().right);
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < boundaries.length; i++) {
          const d = Math.abs(boundaries[i] - clientX);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        return {
          index: bestIdx,
          line: {
            x: boundaries[bestIdx],
            y: tableRect.top,
            length: tableRect.height,
          },
        };
      }

      // Row drag: boundaries are top of each tr + bottom of last tr.
      const trs = Array.from(table.querySelectorAll('tr'));
      if (trs.length === 0) return null;
      const boundaries: number[] = trs.map(
        (tr) => tr.getBoundingClientRect().top,
      );
      boundaries.push(trs[trs.length - 1].getBoundingClientRect().bottom);
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < boundaries.length; i++) {
        const d = Math.abs(boundaries[i] - clientY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return {
        index: bestIdx,
        line: {
          x: tableRect.left,
          y: boundaries[bestIdx],
          length: tableRect.width,
        },
      };
    },
    [],
  );

  useEffect(() => {
    const removePreview = () => {
      if (previewElRef.current) {
        previewElRef.current.remove();
        previewElRef.current = null;
      }
    };
    const onMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      state.moved = true;
      // Lazily create the preview DOM on the first detected drag.
      if (!previewElRef.current) {
        previewElRef.current = buildDragPreview(
          state.kind,
          state.table,
          state.fromIndex,
          state.sourceWidth,
          state.sourceHeight,
        );
        document.body.appendChild(previewElRef.current);
      }
      previewElRef.current.style.top = `${e.clientY - state.grabOffsetY}px`;
      previewElRef.current.style.left = `${e.clientX - state.grabOffsetX}px`;
    };
    const onUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      dragStateRef.current = null;
      if (!state.moved) {
        // Treat as click → open the menu at the grip's location.
        removePreview();
        const rect = new DOMRect(state.startX - 4, state.startY - 4, 8, 8);
        if (state.kind === 'column') {
          setActiveMenu({
            kind: 'column',
            tablePos: state.tablePos,
            tableDom: state.table,
            index: state.fromIndex,
            anchorRect: rect,
          });
          selectTableColumn(editor, state.tablePos, state.fromIndex);
        } else {
          setActiveMenu({
            kind: 'row',
            tablePos: state.tablePos,
            tableDom: state.table,
            index: state.fromIndex,
            anchorRect: rect,
          });
          selectTableRow(editor, state.tablePos, state.fromIndex);
        }
        return;
      }
      // Real drop — execute the reorder.
      const target = findDropTarget(
        state.kind,
        state.table,
        e.clientX,
        e.clientY,
      );
      removePreview();
      if (!target) return;
      const tableNode = editor.state.doc.nodeAt(state.tablePos);
      if (!tableNode) return;
      const info: TableInfo = {
        tableNode,
        tablePos: state.tablePos,
        tableDom: state.table,
        wrapperDom: state.table.parentElement as HTMLElement,
        map: TableMap.get(tableNode),
      };
      let toIdx = target.index;
      if (toIdx > state.fromIndex) toIdx -= 1;
      if (toIdx === state.fromIndex) return;
      if (state.kind === 'column') {
        moveColumnTo(editor, info, state.fromIndex, toIdx);
      } else {
        moveRowTo(editor, info, state.fromIndex, toIdx);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [editor, findDropTarget]);

  const startDrag = (
    e: React.MouseEvent,
    kind: 'column' | 'row',
    fromIndex: number,
  ) => {
    if (!hover) return;
    e.preventDefault();
    e.stopPropagation();
    // Capture source column/row dimensions for the drag preview.
    const tableRect = hover.tableDom.getBoundingClientRect();
    let sourceWidth = 0;
    let sourceHeight = 0;
    let sourceLeft = 0;
    let sourceTop = 0;
    if (kind === 'column') {
      const firstRow = hover.tableDom.querySelector('tr');
      const cell = firstRow?.children[fromIndex] as HTMLElement | undefined;
      const cellRect = cell?.getBoundingClientRect();
      sourceWidth = cellRect?.width ?? 0;
      sourceHeight = tableRect.height;
      sourceLeft = cellRect?.left ?? tableRect.left;
      sourceTop = tableRect.top;
    } else {
      const tr = hover.tableDom.querySelectorAll('tr')[fromIndex] as
        | HTMLElement
        | undefined;
      const rowRect = tr?.getBoundingClientRect();
      sourceWidth = tableRect.width;
      sourceHeight = rowRect?.height ?? 0;
      sourceLeft = tableRect.left;
      sourceTop = rowRect?.top ?? tableRect.top;
    }
    dragStateRef.current = {
      kind,
      fromIndex,
      startX: e.clientX,
      startY: e.clientY,
      tablePos: hover.tablePos,
      table: hover.tableDom,
      moved: false,
      sourceWidth,
      sourceHeight,
      grabOffsetX: e.clientX - sourceLeft,
      grabOffsetY: e.clientY - sourceTop,
    };
  };

  // Track which cell the mouse is over, recompute on mousemove.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      // If the mouse is on the rod / grip itself, hold the current
      // hover state — otherwise we'd lose the rod the moment the user
      // tries to interact with it.
      if (
        (rodColRef.current && rodColRef.current.contains(e.target as Node)) ||
        (rodRowRef.current && rodRowRef.current.contains(e.target as Node))
      ) {
        return;
      }
      const cellDom = (e.target as HTMLElement | null)?.closest(
        'td, th',
      ) as HTMLElement | null;
      if (!cellDom) {
        if (!activeMenu) setHover(null);
        return;
      }
      // Ignore our own number-gutter cells.
      if (cellDom.hasAttribute('data-catalyst-number')) return;

      const info = findTableFromDom(editor, cellDom);
      if (!info) {
        if (!activeMenu) setHover(null);
        return;
      }
      const coords = cellCoords(info.tableDom, cellDom);
      if (!coords) return;

      const rowDom = cellDom.parentElement as HTMLElement;
      const rowRect = rowDom.getBoundingClientRect();
      const colRect = cellDom.getBoundingClientRect();
      const tableRect = info.tableDom.getBoundingClientRect();

      setHover({
        tablePos: info.tablePos,
        tableDom: info.tableDom,
        row: coords.row,
        col: coords.col,
        rowRect,
        colRect,
        tableRect,
      });
    };
    const onLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null;
      if (related && container.contains(related)) return;
      if (!activeMenu) setHover(null);
    };
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, [editor, containerRef, activeMenu]);

  // Close the menu when clicking outside it.
  useEffect(() => {
    if (!activeMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-catalyst-table-menu]')) return;
      if (target.closest('[data-catalyst-table-rod]')) return;
      setActiveMenu(null);
      setHover(null);
      clearHighlight();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [activeMenu, clearHighlight]);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
    setHover(null);
    clearHighlight();
  }, [clearHighlight]);


  if (!editor.isEditable) return null;

  // Rod centers — the table-border line passes through the middle.
  // Round to integer pixels so the pill renders crisply (sub-pixel
  // positions cause anti-aliased blur that reads as misalignment).
  const colCenterX = hover
    ? Math.round(hover.colRect.left + hover.colRect.width / 2)
    : 0;
  const colCenterY = hover ? Math.round(hover.tableRect.top) : 0;
  const rowCenterX = hover ? Math.round(hover.tableRect.left) : 0;
  const rowCenterY = hover
    ? Math.round(hover.rowRect.top + hover.rowRect.height / 2)
    : 0;

  const colHovered = rodHover === 'col';
  const rowHovered = rodHover === 'row';

  return (
    <>
      {hover && (
        <>
          {/* Column rod — fixed hitbox at the grip size, transparent
              background, inner pill morphs on hover. Stable hitbox =
              no flicker. */}
          <div
            ref={rodColRef}
            data-catalyst-table-rod="column"
            onMouseDown={(e) => startDrag(e, 'column', hover.col)}
            onMouseEnter={() => setRodHover('col')}
            onMouseLeave={() => setRodHover(null)}
            title="Column options — click for menu, drag to reorder"
            style={{
              position: 'fixed',
              top: colCenterY - GRIP_SHORT / 2,
              left: colCenterX - GRIP_LONG / 2,
              width: GRIP_LONG,
              height: GRIP_SHORT,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2147483600,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: colHovered ? GRIP_LONG : ROD_LENGTH,
                height: colHovered ? GRIP_SHORT : ROD_THICKNESS,
                background: colHovered ? GRIP_BG : ROD_COLOR,
                borderRadius: colHovered ? GRIP_RADIUS : 999,
                boxShadow: HALO_SHADOW,
                transition:
                  'width 90ms ease, height 90ms ease, background-color 90ms ease',
              }}
            >
              {colHovered && <GripDots orientation="horizontal" />}
            </span>
          </div>
          {/* Row rod — same pattern, vertical orientation. */}
          <div
            ref={rodRowRef}
            data-catalyst-table-rod="row"
            onMouseDown={(e) => startDrag(e, 'row', hover.row)}
            onMouseEnter={() => setRodHover('row')}
            onMouseLeave={() => setRodHover(null)}
            title="Row options — click for menu, drag to reorder"
            style={{
              position: 'fixed',
              top: rowCenterY - GRIP_LONG / 2,
              left: rowCenterX - GRIP_SHORT / 2,
              width: GRIP_SHORT,
              height: GRIP_LONG,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2147483600,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: rowHovered ? GRIP_SHORT : ROD_THICKNESS,
                height: rowHovered ? GRIP_LONG : ROD_LENGTH,
                background: rowHovered ? GRIP_BG : ROD_COLOR,
                borderRadius: rowHovered ? GRIP_RADIUS : 999,
                boxShadow: HALO_SHADOW,
                transition:
                  'width 90ms ease, height 90ms ease, background-color 90ms ease',
              }}
            >
              {rowHovered && <GripDots orientation="vertical" />}
            </span>
          </div>
        </>
      )}
      {activeMenu?.kind === 'column' && (
        <ColumnMenu
          editor={editor}
          tablePos={activeMenu.tablePos}
          col={activeMenu.index}
          anchorRect={activeMenu.anchorRect}
          onClose={closeMenu}
        />
      )}
      {activeMenu?.kind === 'row' && (
        <RowMenu
          editor={editor}
          tablePos={activeMenu.tablePos}
          row={activeMenu.index}
          anchorRect={activeMenu.anchorRect}
          onClose={closeMenu}
        />
      )}
    </>
  );
}

/** 6-dot grip rendered inside the blue pill on hover. */
function GripDots({
  orientation,
}: {
  orientation: 'horizontal' | 'vertical';
}) {
  // Horizontal grip → dots in 2 rows × 3 cols; vertical → 3 rows × 2 cols.
  const cols = orientation === 'horizontal' ? 3 : 2;
  const rows = orientation === 'horizontal' ? 2 : 3;
  const dots = Array.from({ length: cols * rows });
  return (
    <span
      aria-hidden
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 2px)`,
        gridTemplateRows: `repeat(${rows}, 2px)`,
        gap: 2,
      }}
    >
      {dots.map((_, i) => (
        <span
          key={i}
          style={{
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: '#FFFFFF',
          }}
        />
      ))}
    </span>
  );
}

/** Builds the drag-preview DOM element — cloned cells from the source
 *  column/row, wrapped in a `.catalyst-tiptap-editor` host so all the
 *  editor-scoped table CSS applies. Returns the host div, which the
 *  caller appends to document.body and removes on drop. Direct DOM
 *  ownership (not React) so cleanup is unconditional and races with
 *  the PM-transaction render can't strand the ghost in the DOM. */
function buildDragPreview(
  kind: 'column' | 'row',
  sourceTable: HTMLTableElement,
  fromIndex: number,
  width: number,
  height: number,
): HTMLDivElement {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = [
    'position: fixed',
    'top: -9999px',
    'left: -9999px',
    `width: ${width}px`,
    `height: ${height}px`,
    'opacity: 0.55',
    'pointer-events: none',
    'z-index: 2147483645',
    'box-shadow: 0 6px 20px rgba(9,30,66,0.2)',
    'overflow: hidden',
    'background: var(--ds-surface, #FFFFFF)',
  ].join(';');

  const wrapper = document.createElement('div');
  wrapper.className = 'catalyst-tiptap-editor';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  host.appendChild(wrapper);

  const table = document.createElement('table');
  table.style.borderCollapse = 'collapse';
  table.style.tableLayout = 'fixed';
  table.style.width = `${width}px`;
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const trs = Array.from(sourceTable.querySelectorAll('tr'));
  if (kind === 'column') {
    trs.forEach((tr) => {
      const cells = Array.from(tr.children).filter(
        (c) => !(c as HTMLElement).hasAttribute('data-catalyst-number'),
      ) as HTMLElement[];
      const cell = cells[fromIndex];
      if (!cell) return;
      const newRow = document.createElement('tr');
      const clonedCell = cell.cloneNode(true) as HTMLElement;
      clonedCell.classList.remove('catalyst-cell-selected');
      clonedCell.removeAttribute('data-catalyst-cell-selected');
      newRow.appendChild(clonedCell);
      tbody.appendChild(newRow);
    });
  } else {
    const sourceRow = trs[fromIndex];
    if (sourceRow) {
      const newRow = sourceRow.cloneNode(true) as HTMLElement;
      Array.from(newRow.children).forEach((c) => {
        const el = c as HTMLElement;
        if (el.hasAttribute('data-catalyst-number')) {
          newRow.removeChild(el);
          return;
        }
        el.classList.remove('catalyst-cell-selected');
        el.removeAttribute('data-catalyst-cell-selected');
      });
      tbody.appendChild(newRow);
    }
  }

  wrapper.appendChild(table);
  return host;
}

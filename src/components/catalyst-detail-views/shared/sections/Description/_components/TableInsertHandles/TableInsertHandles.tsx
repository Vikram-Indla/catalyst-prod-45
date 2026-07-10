/**
 * TableInsertHandles — small filled dots at every column/row boundary
 * of the currently-focused table. Hover → blue + circle + dark blue
 * line through the boundary. Click → insert column/row AT that
 * boundary (same convention as Notion / Google Docs: everything from
 * the boundary onward shifts).
 *
 * Dot positions:
 *  - Column dots: above the table, one per column boundary (N+1
 *    dots for N columns — includes outer left + outer right edges).
 *  - Row dots: left of the table, one per row boundary (N+1 dots
 *    for N rows — includes outer top + outer bottom edges).
 *
 * Header-row exception (data-header-row="true"): the corner dots
 * adjacent to the header's first cell are hidden — i.e. the
 * left-edge column dot and the top-edge row dot.
 */
import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import AddIcon from '@atlaskit/icon/core/add';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface ColumnDot {
  key: string;
  tablePos: number;
  /** Position in the doc to insert at: 0..colCount. */
  insertIndex: number;
  /** Container-space coordinates. */
  x: number;
  tableTop: number;
  tableBottom: number;
}

interface RowDot {
  key: string;
  tablePos: number;
  insertIndex: number;
  y: number;
  tableLeft: number;
  tableRight: number;
}

const DOT_IDLE_SIZE = 4;
const DOT_HOVER_SIZE = 14;
const DOT_OFFSET = 8; // distance from the table edge
const HIT_PAD = 6; // extra invisible padding around the dot for easier hovering
const LINE_THICKNESS = 2;
/** Idle filled dot — light gray (ADS neutral subtle). */
const IDLE_DOT_COLOR = 'var(--ds-text-disabled)';
/** + button border — light gray, matches the table border tone. */
const BORDER_COLOR = 'var(--ds-border)';
/** Idle + icon color (matches the dot). */
const PLUS_IDLE_COLOR = 'var(--ds-text-subtlest)';
/** Active hover background — solid blue with white +. */
const ACCENT_COLOR = 'var(--ds-link)';

export function TableInsertHandles({ editor, containerRef }: Props) {
  const [columnDots, setColumnDots] = useState<ColumnDot[]>([]);
  const [rowDots, setRowDots] = useState<RowDot[]>([]);
  /** Set to the focused table DOM element each recompute so the
   *  outer effect can attach a ResizeObserver to IT (the container
   *  observer alone misses table-only reflows — that's the source
   *  of the initial-render misalignment). */
  const [focusedTable, setFocusedTable] = useState<HTMLTableElement | null>(
    null,
  );

  const recompute = useCallback(() => {
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        setColumnDots([]);
        setRowDots([]);
        return;
      }
      // Find the table that contains the current selection. Only
      // ONE table is "focused" at a time — that's the one we show
      // handles for.
      const { state } = editor;
      const $from = state.selection.$from;
      let tableNode: ReturnType<typeof state.doc.nodeAt> = null;
      let tablePos = -1;
      for (let d = $from.depth; d >= 0; d--) {
        const n = $from.node(d);
        if (n.type.name === 'table') {
          tableNode = n;
          tablePos = $from.before(d);
          break;
        }
      }
      if (!tableNode || tablePos < 0) {
        setColumnDots([]);
        setRowDots([]);
        setFocusedTable(null);
        return;
      }
      const wrapper = editor.view.nodeDOM(tablePos) as HTMLElement | null;
      const tableEl =
        wrapper?.tagName === 'TABLE'
          ? (wrapper as HTMLTableElement)
          : (wrapper?.querySelector('table') as HTMLTableElement | null);
      if (!tableEl) {
        setColumnDots([]);
        setRowDots([]);
        setFocusedTable(null);
        return;
      }
      setFocusedTable(tableEl);
      const containerRect = container.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const sx = container.scrollLeft;
      const sy = container.scrollTop;

      const firstRow = tableEl.querySelector('tr');
      const allRows = Array.from(tableEl.querySelectorAll('tr'));
      if (!firstRow || allRows.length === 0) {
        setColumnDots([]);
        setRowDots([]);
        return;
      }
      const firstRowCells = Array.from(firstRow.children).filter(
        (c) => !(c as HTMLElement).hasAttribute('data-catalyst-number'),
      ) as HTMLElement[];

      const hasHeader =
        tableEl.getAttribute('data-header-row') !== 'false';

      // Column boundaries: left edge + each cell's right edge.
      const colBoundaryXs: number[] = [tableRect.left];
      firstRowCells.forEach((cell) => {
        colBoundaryXs.push(cell.getBoundingClientRect().right);
      });
      const newColDots: ColumnDot[] = colBoundaryXs
        .map((x, i) => ({
          key: `${tablePos}-col-${i}`,
          tablePos,
          insertIndex: i,
          x: x - containerRect.left + sx,
          tableTop: tableRect.top - containerRect.top + sy,
          tableBottom: tableRect.bottom - containerRect.top + sy,
        }))
        // Hide the corner dot (left edge) when there's a header row.
        .filter((d) => !(hasHeader && d.insertIndex === 0));

      // Row boundaries: top edge + each row's bottom edge.
      const rowBoundaryYs: number[] = [tableRect.top];
      allRows.forEach((row) => {
        rowBoundaryYs.push(row.getBoundingClientRect().bottom);
      });
      const newRowDots: RowDot[] = rowBoundaryYs
        .map((y, i) => ({
          key: `${tablePos}-row-${i}`,
          tablePos,
          insertIndex: i,
          y: y - containerRect.top + sy,
          tableLeft: tableRect.left - containerRect.left + sx,
          tableRight: tableRect.right - containerRect.left + sx,
        }))
        // Hide the corner dot (top edge) when there's a header row.
        .filter((d) => !(hasHeader && d.insertIndex === 0));

      setColumnDots(newColDots);
      setRowDots(newRowDots);
    });
  }, [editor, containerRef]);

  useEffect(() => {
    recompute();
    editor.on('selectionUpdate', recompute);
    editor.on('transaction', recompute);
    return () => {
      editor.off('selectionUpdate', recompute);
      editor.off('transaction', recompute);
    };
  }, [editor, recompute]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    window.addEventListener('resize', recompute);
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => {
      window.removeEventListener('resize', recompute);
      ro.disconnect();
    };
  }, [containerRef, recompute]);

  // Observe the focused table directly — container-only observation
  // misses table-level reflows (font load, cell content changes,
  // border-collapse settling) that shift boundary X/Y between when
  // we first measure and when the user sees the result.
  useEffect(() => {
    if (!focusedTable) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(focusedTable);
    // Belt + braces: trigger a second-frame recompute so any
    // post-mount layout shift is caught even before the observer
    // sees it.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(recompute),
    );
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [focusedTable, recompute]);

  if (!editor.isEditable) return null;

  return (
    <>
      {columnDots.map((d) => (
        <ColumnInsertDot key={d.key} dot={d} editor={editor} />
      ))}
      {rowDots.map((d) => (
        <RowInsertDot key={d.key} dot={d} editor={editor} />
      ))}
    </>
  );
}

function ColumnInsertDot({
  dot,
  editor,
}: {
  dot: ColumnDot;
  editor: Editor;
}) {
  /** True when mouse is anywhere in the (larger) hit area. Drives
   *  the dot→+ growth and the boundary line visibility. */
  const [hover, setHover] = useState(false);
  /** True when mouse is directly on the visible + button. Drives
   *  the white-bg → blue-bg color swap. */
  const [activeHover, setActiveHover] = useState(false);
  const lineTop = dot.tableTop;
  const lineHeight = dot.tableBottom - dot.tableTop;

  const onClick = () => insertColumnAt(editor, dot.tablePos, dot.insertIndex);

  const hitSize = DOT_HOVER_SIZE + HIT_PAD * 2;

  return (
    <>
      {/* Dark-blue boundary line, visible only on hover. */}
      {hover && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: lineTop,
            left: dot.x - LINE_THICKNESS / 2,
            width: LINE_THICKNESS,
            height: lineHeight,
            background: ACCENT_COLOR,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Larger transparent hit area — captures hover before the
          cursor reaches the visible + button so the user sees the
          white→blue progression. */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setActiveHover(false);
        }}
        style={{
          position: 'absolute',
          top: lineTop - DOT_OFFSET - hitSize / 2,
          left: dot.x - hitSize / 2,
          width: hitSize,
          height: hitSize,
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hover ? (
          <button
            type="button"
            onMouseEnter={() => setActiveHover(true)}
            onMouseLeave={() => setActiveHover(false)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            aria-label="Insert column"
            style={{
              width: DOT_HOVER_SIZE,
              height: DOT_HOVER_SIZE,
              borderRadius: '50%',
              background: activeHover ? ACCENT_COLOR : 'var(--ds-surface)',
              border: `1px solid ${BORDER_COLOR}`,
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeHover ? 'var(--ds-text-inverse)' : PLUS_IDLE_COLOR,
              boxShadow: '0 1px 3px var(--ds-shadow-raised)',
              transition: 'background-color 80ms ease, color 80ms ease',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                transform: 'scale(0.55)',
                transformOrigin: 'center',
                lineHeight: 0,
              }}
            >
              <AddIcon label="" color="currentColor" />
            </span>
          </button>
        ) : (
          <span
            aria-hidden
            style={{
              width: DOT_IDLE_SIZE,
              height: DOT_IDLE_SIZE,
              borderRadius: '50%',
              background: IDLE_DOT_COLOR,
            }}
          />
        )}
      </div>
    </>
  );
}

function RowInsertDot({
  dot,
  editor,
}: {
  dot: RowDot;
  editor: Editor;
}) {
  const [hover, setHover] = useState(false);
  const [activeHover, setActiveHover] = useState(false);
  const lineLeft = dot.tableLeft;
  const lineWidth = dot.tableRight - dot.tableLeft;

  const onClick = () => insertRowAt(editor, dot.tablePos, dot.insertIndex);

  const hitSize = DOT_HOVER_SIZE + HIT_PAD * 2;

  return (
    <>
      {hover && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: dot.y - LINE_THICKNESS / 2,
            left: lineLeft,
            width: lineWidth,
            height: LINE_THICKNESS,
            background: ACCENT_COLOR,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setActiveHover(false);
        }}
        style={{
          position: 'absolute',
          top: dot.y - hitSize / 2,
          left: lineLeft - DOT_OFFSET - hitSize / 2,
          width: hitSize,
          height: hitSize,
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hover ? (
          <button
            type="button"
            onMouseEnter={() => setActiveHover(true)}
            onMouseLeave={() => setActiveHover(false)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            aria-label="Insert row"
            style={{
              width: DOT_HOVER_SIZE,
              height: DOT_HOVER_SIZE,
              borderRadius: '50%',
              background: activeHover ? ACCENT_COLOR : 'var(--ds-surface)',
              border: `1px solid ${BORDER_COLOR}`,
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeHover ? 'var(--ds-text-inverse)' : PLUS_IDLE_COLOR,
              boxShadow: '0 1px 3px var(--ds-shadow-raised)',
              transition: 'background-color 80ms ease, color 80ms ease',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                transform: 'scale(0.55)',
                transformOrigin: 'center',
                lineHeight: 0,
              }}
            >
              <AddIcon label="" color="currentColor" />
            </span>
          </button>
        ) : (
          <span
            aria-hidden
            style={{
              width: DOT_IDLE_SIZE,
              height: DOT_IDLE_SIZE,
              borderRadius: '50%',
              background: IDLE_DOT_COLOR,
            }}
          />
        )}
      </div>
    </>
  );
}

/**
 * Insert a column at the given boundary index (0..colCount).
 *
 * Strategy: move the selection to a cell adjacent to the boundary,
 * then call Tiptap's built-in addColumnBefore / addColumnAfter
 * command. The new column appears AT the boundary.
 */
function insertColumnAt(
  editor: Editor,
  tablePos: number,
  insertIndex: number,
) {
  const tableNode = editor.state.doc.nodeAt(tablePos);
  if (!tableNode || tableNode.type.name !== 'table') return;
  const firstRow = tableNode.firstChild;
  if (!firstRow) return;

  // Count columns from the first row (accounting for colspan).
  let colCount = 0;
  firstRow.forEach((cell) => {
    colCount += (cell.attrs.colspan as number) || 1;
  });
  if (colCount === 0) return;

  const isAtEnd = insertIndex >= colCount;
  const targetCol = isAtEnd ? colCount - 1 : insertIndex;

  // Find the cell in the first row that covers `targetCol`.
  let cellInsidePos = -1;
  let col = 0;
  firstRow.forEach((cell, offset) => {
    if (cellInsidePos !== -1) return;
    const span = (cell.attrs.colspan as number) || 1;
    if (targetCol >= col && targetCol < col + span) {
      // Position just inside this cell.
      cellInsidePos = tablePos + 2 + offset + 1;
    }
    col += span;
  });
  if (cellInsidePos < 0) return;

  editor
    .chain()
    .setTextSelection(cellInsidePos)
    .command(({ commands }) =>
      isAtEnd ? commands.addColumnAfter() : commands.addColumnBefore(),
    )
    .run();
}

function insertRowAt(
  editor: Editor,
  tablePos: number,
  insertIndex: number,
) {
  const tableNode = editor.state.doc.nodeAt(tablePos);
  if (!tableNode || tableNode.type.name !== 'table') return;
  const rowCount = tableNode.childCount;
  if (rowCount === 0) return;

  const isAtEnd = insertIndex >= rowCount;
  const targetRow = isAtEnd ? rowCount - 1 : insertIndex;

  // Find the position INSIDE the first cell of row `targetRow`.
  let rowCellInsidePos = -1;
  let r = 0;
  tableNode.forEach((row, rowOffset) => {
    if (rowCellInsidePos !== -1) return;
    if (r === targetRow) {
      // Position before the row: tablePos + 1 + rowOffset
      // Position inside the row's first cell: tablePos + 1 + rowOffset + 1 + 1
      rowCellInsidePos = tablePos + 1 + rowOffset + 2;
    }
    r += 1;
  });
  if (rowCellInsidePos < 0) return;

  editor
    .chain()
    .setTextSelection(rowCellInsidePos)
    .command(({ commands }) =>
      isAtEnd ? commands.addRowAfter() : commands.addRowBefore(),
    )
    .run();
}

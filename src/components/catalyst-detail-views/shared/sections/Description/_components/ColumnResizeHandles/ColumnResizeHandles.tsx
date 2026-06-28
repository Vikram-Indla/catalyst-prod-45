/**
 * ColumnResizeHandles — invisible draggable handles at every column
 * boundary inside every table in the editor. Same shape as the
 * TableResizeBar (which controls the table-level width), only one
 * per inter-column boundary instead of one per table.
 *
 * Live behaviour:
 *   - On mousedown, capture the target <col>'s current pixel width.
 *   - On mousemove, mutate that <col>.style.width directly —
 *     instant visual feedback, no PM transaction.
 *   - On mouseup, dispatch ONE transaction that writes the final
 *     colwidth onto the first-row cell at that column index.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface Anchor {
  tablePos: number;
  /** Column-INDEX of the cell to the LEFT of this boundary. */
  colIndex: number;
  /** Viewport-space x of the boundary; top/height to size the hitbox. */
  x: number;
  top: number;
  height: number;
  /** Live refs we need at drag-time. */
  table: HTMLTableElement;
  colgroup: HTMLElement;
}

const HIT_WIDTH = 10;
const MIN_COL_WIDTH = 32;

export function ColumnResizeHandles({ editor, containerRef }: Props) {
  const [anchors, setAnchors] = useState<Anchor[]>([]);

  const recompute = useCallback(() => {
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const result: Anchor[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== 'table') return true;
        const wrapper = editor.view.nodeDOM(pos) as HTMLElement | null;
        const tableDom =
          wrapper?.tagName === 'TABLE'
            ? (wrapper as HTMLTableElement)
            : (wrapper?.querySelector('table') as HTMLTableElement | null);
        if (!tableDom) return false;
        const tableRect = tableDom.getBoundingClientRect();
        const firstRow = tableDom.querySelector('tr');
        if (!firstRow) return false;
        const colgroup = tableDom.querySelector('colgroup') as HTMLElement | null;
        if (!colgroup) return false;
        const cells = Array.from(firstRow.children).filter(
          (c) => !(c as HTMLElement).hasAttribute('data-catalyst-number'),
        ) as HTMLElement[];
        // Boundaries = the right edge of each cell EXCEPT the last
        // (handled by TableResizeBar).
        for (let i = 0; i < cells.length - 1; i++) {
          const cellRect = cells[i].getBoundingClientRect();
          result.push({
            tablePos: pos,
            colIndex: i,
            x: cellRect.right - containerRect.left + container.scrollLeft,
            top: tableRect.top - containerRect.top + container.scrollTop,
            height: tableRect.height,
            table: tableDom,
            colgroup,
          });
        }
        return false;
      });
      setAnchors(result);
    });
  }, [editor, containerRef]);

  useEffect(() => {
    recompute();
    editor.on('transaction', recompute);
    editor.on('update', recompute);
    editor.on('selectionUpdate', recompute);
    return () => {
      editor.off('transaction', recompute);
      editor.off('update', recompute);
      editor.off('selectionUpdate', recompute);
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

  if (!editor.isEditable) return null;

  return (
    <>
      {anchors.map((a) => (
        <ColumnHandle key={`${a.tablePos}-${a.colIndex}`} editor={editor} anchor={a} />
      ))}
    </>
  );
}

interface HandleProps {
  editor: Editor;
  anchor: Anchor;
}

function ColumnHandle({ editor, anchor }: HandleProps) {
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  /** While dragging, this is the live cursor x (container-relative).
   *  Used to position the blue line so it FOLLOWS the cursor instead
   *  of staying pinned at the anchor's pre-drag position. */
  const [liveX, setLiveX] = useState<number | null>(null);
  /** Captured at mousedown — all the state we need for the drag.
   *  Crucially we capture the width of EVERY column AND the table
   *  width so during the drag we can freeze the non-target columns
   *  in place while only the dragged column + table width change.
   *  This is why dragging a middle column no longer shifts the
   *  neighbours. */
  const dragRef = useRef<{
    startX: number;
    startAnchorX: number;
    targetIndex: number;
    initialColWidths: number[];
    /** Updated on every mousemove. We persist from this on mouseup
     *  instead of reading <col>.style.width back from the DOM —
     *  anything that re-syncs the DOM in between (PM internal
     *  mutation recovery, another extension's transaction) would
     *  otherwise reset <col> widths to the previously-persisted
     *  cell.colwidth and silently lose the drag's changes. */
    lastDx: number;
    table: HTMLTableElement;
    colgroup: HTMLElement;
    tablePos: number;
  } | null>(null);

  // Clear the live override the moment a fresh anchor lands (the
  // post-transaction recompute) — same trick as TableResizeBar. The
  // new anchor.x is already at the resized boundary, so switching off
  // produces no visible jump.
  useEffect(() => {
    if (!dragging) setLiveX(null);
  }, [anchor.x, anchor.top, dragging]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = dragRef.current;
      if (!s) return;
      let dx = e.clientX - s.startX;

      // Excel / Google Sheets style: the column to the LEFT of the
      // boundary grows by +dx, the column to the RIGHT shrinks by
      // -dx. Every other column stays exactly where it is. Table
      // width stays the same. Clamp dx so neither neighbour drops
      // below MIN_COL_WIDTH.
      const initTarget = s.initialColWidths[s.targetIndex];
      const initNext = s.initialColWidths[s.targetIndex + 1] ?? 0;
      const maxGrow = initNext - MIN_COL_WIDTH;
      const maxShrink = initTarget - MIN_COL_WIDTH;
      if (dx > maxGrow) dx = maxGrow;
      if (dx < -maxShrink) dx = -maxShrink;
      s.lastDx = dx;

      const newWidths = s.initialColWidths.map((w, i) => {
        if (i === s.targetIndex) return Math.round(w + dx);
        if (i === s.targetIndex + 1) return Math.round(w - dx);
        return Math.round(w);
      });

      for (let i = 0; i < newWidths.length; i++) {
        const col = s.colgroup.children[i] as HTMLElement | undefined;
        if (col) col.style.width = `${newWidths[i]}px`;
      }
      setLiveX(s.startAnchorX + dx);
    };
    const onUp = () => {
      const s = dragRef.current;
      if (!s) return;
      dragRef.current = null;
      setDragging(false);
      document.body.style.cursor = '';

      // Compute final widths the same way onMove did: only the
      // target column and its immediate right neighbour change.
      const finalColWidths = s.initialColWidths.map((w, i) => {
        if (i === s.targetIndex) return Math.round(w + s.lastDx);
        if (i === s.targetIndex + 1) return Math.round(w - s.lastDx);
        return Math.round(w);
      });

      // REFIND the table's current position by matching the DOM
      // reference — never trust the captured s.tablePos. Any silent
      // doc shift (or a race between recompute and mousedown) makes
      // s.tablePos point to the wrong node, and setNodeMarkup at the
      // wrong position is exactly what produces "the column reverts
      // to its original position".
      const { state } = editor;
      let tablePos = -1;
      let tableNode: ReturnType<typeof state.doc.nodeAt> = null;
      state.doc.descendants((node, pos) => {
        if (tablePos !== -1) return false;
        if (node.type.name !== 'table') return true;
        const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
        const candidate =
          dom?.tagName === 'TABLE'
            ? (dom as HTMLTableElement)
            : (dom?.querySelector('table') as HTMLTableElement | null);
        if (candidate === s.table) {
          tablePos = pos;
          tableNode = node;
          return false;
        }
        return false;
      });
      if (tablePos < 0 || !tableNode || tableNode.type.name !== 'table') {
        // Couldn't find the table — the drag visual already stuck via
        // inline <col> + table widths, so don't dispatch anything.
        return;
      }
      const firstRow = tableNode.firstChild;
      if (!firstRow) return;

      const tr = state.tr;
      let idx = 0;
      firstRow.forEach((cell, offset) => {
        const w = finalColWidths[idx];
        if (typeof w === 'number') {
          const cellAbsPos = tablePos + 2 + offset;
          const colspan = (cell.attrs.colspan as number) || 1;
          tr.setNodeMarkup(cellAbsPos, undefined, {
            ...cell.attrs,
            colwidth: Array.from({ length: colspan }, () => w),
          });
        }
        idx++;
      });
      // Don't touch the table's width attr — Excel-style resize
      // keeps table width constant.
      editor.view.dispatch(tr);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [editor]);

  const onMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const firstRow = anchor.table.querySelector('tr');
    if (!firstRow) return;
    const cells = Array.from(firstRow.children).filter(
      (c) => !(c as HTMLElement).hasAttribute('data-catalyst-number'),
    ) as HTMLElement[];
    const initialColWidths = cells.map(
      (c) => c.getBoundingClientRect().width,
    );
    dragRef.current = {
      startX: e.clientX,
      startAnchorX: anchor.x,
      targetIndex: anchor.colIndex,
      initialColWidths,
      lastDx: 0,
      table: anchor.table,
      colgroup: anchor.colgroup,
      tablePos: anchor.tablePos,
    };
    setLiveX(anchor.x);
    setDragging(true);
    document.body.style.cursor = 'col-resize';
  };

  const lineVisible = hovering || dragging;
  const xPos = dragging && liveX != null ? liveX : anchor.x;

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'absolute',
        top: anchor.top,
        left: xPos - HIT_WIDTH / 2,
        width: HIT_WIDTH,
        height: anchor.height,
        cursor: 'col-resize',
        zIndex: 4,
      }}
      aria-label={`Resize column ${anchor.colIndex + 1}`}
    >
      {/* 1px line positioned exactly on the cell border so it
          OVERLAYS the gray border instead of sitting beside it.
          Rendered ONLY when active — no transparent fallback means
          no transition flicker, no stale-position "blink". */}
      {lineVisible && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: HIT_WIDTH / 2,
            width: 1,
            height: '100%',
            background: 'var(--ds-border-focused)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

/**
 * CellMultiSelect — adds Excel / Sheets style multi-cell selection on
 * top of Tiptap's table extension:
 *
 *   • Click + drag across cells → rectangular CellSelection from the
 *     mousedown cell to the cell under the cursor.
 *   • Ctrl / Cmd + click any cell → extend the current CellSelection's
 *     bounding RECTANGLE to include the clicked cell. The selection
 *     is always rectangular: clicking a cell two rows down and one
 *     col over from a 1×2 selection produces a 3×3 rect covering all
 *     9 cells in the bounding box.
 *
 * Selection is represented as a real PM `CellSelection` so Tiptap's
 * native commands (mergeCells, splitCell, deleteColumn, …) all see
 * the right context. The visual highlight is PM's standard
 * `.selectedCell` class, restyled in editorStyles.ts to match the
 * rest of the Catalyst highlight palette.
 */
import { useEffect, useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { CellSelection } from '@tiptap/pm/tables';
import {
  cellAt,
  cellCoords,
  findTableFromDom,
  type TableInfo,
} from '../TableInteractions/tableHelpers';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface CellHit {
  tablePos: number;
  info: TableInfo;
  row: number;
  col: number;
  cellPos: number;
}

export function CellMultiSelect({ editor, containerRef }: Props) {
  /** Set on mousedown over a cell; cleared on mouseup. While set,
   *  mousemove dispatches a CellSelection from the anchor cell to
   *  whichever cell is currently under the cursor. */
  const dragAnchorRef = useRef<{
    tablePos: number;
    anchorPos: number;
    anchorRow: number;
    anchorCol: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const findCell = (el: Element | null): HTMLElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== container) {
        if (cur.tagName === 'TD' || cur.tagName === 'TH') {
          return cur as HTMLElement;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const getCellHit = (cellEl: HTMLElement): CellHit | null => {
      const info = findTableFromDom(editor, cellEl);
      if (!info) return null;
      const coords = cellCoords(info.tableDom, cellEl);
      if (!coords) return null;
      const cell = cellAt(editor, info, coords.row, coords.col);
      if (!cell) return null;
      return {
        tablePos: info.tablePos,
        info,
        row: coords.row,
        col: coords.col,
        cellPos: cell.pos,
      };
    };

    const onDown = (e: MouseEvent) => {
      // Skip clicks on our own portal-rendered widgets (menus,
      // chevron, insert dots) — they handle their own state.
      const target = e.target as Element | null;
      if (target?.closest?.('[data-catalyst-table-menu]')) return;
      if (target?.tagName === 'BUTTON') return;

      const cellEl = findCell(target);
      if (!cellEl) return;
      const hit = getCellHit(cellEl);
      if (!hit) return;

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click: extend rectangle to include this cell.
        e.preventDefault();
        e.stopPropagation();
        extendRectSelection(editor, hit);
        return;
      }

      // Plain click — track for potential drag selection. Don't
      // preventDefault yet: if the user releases on the same cell
      // (just clicked, no drag), PM should handle text cursor
      // placement normally.
      dragAnchorRef.current = {
        tablePos: hit.tablePos,
        anchorPos: hit.cellPos,
        anchorRow: hit.row,
        anchorCol: hit.col,
      };
    };

    const onMove = (e: MouseEvent) => {
      const drag = dragAnchorRef.current;
      if (!drag) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cellEl = findCell(target as Element | null);
      if (!cellEl) return;
      const hit = getCellHit(cellEl);
      if (!hit || hit.tablePos !== drag.tablePos) return;
      // Same cell as anchor — let PM do its normal text selection
      // inside the cell. Once the cursor moves to a DIFFERENT cell,
      // promote to CellSelection.
      if (hit.cellPos === drag.anchorPos) return;

      try {
        const next = CellSelection.create(
          editor.state.doc,
          drag.anchorPos,
          hit.cellPos,
        );
        if (!editor.state.selection.eq(next)) {
          editor.view.dispatch(editor.state.tr.setSelection(next));
        }
      } catch {
        // CellSelection.create can throw if positions are invalid
        // after a mid-drag transaction reshuffled the doc — ignore.
      }
    };

    const onUp = () => {
      dragAnchorRef.current = null;
    };

    container.addEventListener('mousedown', onDown);
    container.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      container.removeEventListener('mousedown', onDown);
      container.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [editor, containerRef]);

  return null;
}

/** Extend the current CellSelection's bounding rectangle to include
 *  the cell at `hit.row`/`hit.col`. The new selection always covers
 *  the smallest axis-aligned rectangle that contains every cell of
 *  the previous selection plus the new cell. */
function extendRectSelection(editor: Editor, hit: CellHit): void {
  const { info, row, col } = hit;
  let minRow = row;
  let maxRow = row;
  let minCol = col;
  let maxCol = col;

  const sel = editor.state.selection;
  if (sel instanceof CellSelection) {
    // Translate the selection's anchor and head cell positions back
    // into (row, col) using the table map.
    const anchorRel = sel.$anchorCell.pos - info.tablePos - 1;
    const headRel = sel.$headCell.pos - info.tablePos - 1;
    let anchorRC: { r: number; c: number } | null = null;
    let headRC: { r: number; c: number } | null = null;
    for (let r = 0; r < info.map.height; r++) {
      for (let c = 0; c < info.map.width; c++) {
        const p = info.map.map[r * info.map.width + c];
        if (p === anchorRel && !anchorRC) anchorRC = { r, c };
        if (p === headRel && !headRC) headRC = { r, c };
      }
    }
    if (anchorRC && headRC) {
      minRow = Math.min(minRow, anchorRC.r, headRC.r);
      maxRow = Math.max(maxRow, anchorRC.r, headRC.r);
      minCol = Math.min(minCol, anchorRC.c, headRC.c);
      maxCol = Math.max(maxCol, anchorRC.c, headRC.c);
    }
  }

  const anchorCell = cellAt(editor, info, minRow, minCol);
  const headCell = cellAt(editor, info, maxRow, maxCol);
  if (!anchorCell || !headCell) return;
  try {
    const next = CellSelection.create(
      editor.state.doc,
      anchorCell.pos,
      headCell.pos,
    );
    editor.view.dispatch(editor.state.tr.setSelection(next));
  } catch {
    // ignore — selection couldn't be constructed (rare)
  }
}

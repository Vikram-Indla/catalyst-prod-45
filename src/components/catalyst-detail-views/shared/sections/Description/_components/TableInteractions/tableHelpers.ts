/**
 * tableHelpers — shared table-DOM/PM-position utilities used by the
 * row/column hover controls. Centralised so TableInteractions,
 * ColumnMenu, and RowMenu all agree on how to find a table, resolve a
 * cell's (row, col) coordinates, and stage selections before running
 * table commands.
 */
import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { TableMap, CellSelection } from '@tiptap/pm/tables';

export interface TableInfo {
  tableNode: PMNode;
  tablePos: number; // position of the table node
  tableDom: HTMLTableElement;
  wrapperDom: HTMLElement;
  map: TableMap;
}

/** Find the <table> ancestor of a DOM node, plus PM coords. */
export function findTableFromDom(
  editor: Editor,
  startNode: Node | null,
): TableInfo | null {
  if (!startNode) return null;
  let el: Node | null = startNode;
  while (el && el !== editor.view.dom) {
    if (el instanceof HTMLTableElement) break;
    el = (el as HTMLElement).parentNode;
  }
  if (!el || !(el instanceof HTMLTableElement)) return null;
  const tableDom = el as HTMLTableElement;
  const wrapperDom =
    tableDom.closest('.tableWrapper') instanceof HTMLElement
      ? (tableDom.closest('.tableWrapper') as HTMLElement)
      : (tableDom.parentElement as HTMLElement);

  let pmPos: number;
  try {
    pmPos = editor.view.posAtDOM(wrapperDom, 0) - 1;
  } catch {
    return null;
  }
  const tableNode = editor.state.doc.nodeAt(pmPos);
  if (!tableNode || tableNode.type.name !== 'table') return null;
  return {
    tableNode,
    tablePos: pmPos,
    tableDom,
    wrapperDom,
    map: TableMap.get(tableNode),
  };
}

/** Get (rowIndex, colIndex) for a <td>/<th> DOM element inside a table. */
export function cellCoords(
  tableDom: HTMLTableElement,
  cellDom: HTMLElement,
): { row: number; col: number } | null {
  const rows = Array.from(tableDom.querySelectorAll('tr'));
  for (let r = 0; r < rows.length; r++) {
    const cells = Array.from(rows[r].children);
    const colIdx = cells.indexOf(cellDom);
    if (colIdx >= 0) return { row: r, col: colIdx };
  }
  return null;
}

/** Cell at (row, col) in a table. Returns { node, pos } in the doc. */
export function cellAt(
  editor: Editor,
  info: TableInfo,
  row: number,
  col: number,
): { node: PMNode; pos: number } | null {
  const idx = row * info.map.width + col;
  if (idx < 0 || idx >= info.map.map.length) return null;
  const relPos = info.map.map[idx];
  const absPos = info.tablePos + 1 + relPos;
  const node = editor.state.doc.nodeAt(absPos);
  if (!node) return null;
  return { node, pos: absPos };
}

/** Put the cursor inside the cell at (row, col) so Tiptap's column/row
 *  commands operate on the right cell. */
export function focusCell(
  editor: Editor,
  info: TableInfo,
  row: number,
  col: number,
): boolean {
  const cell = cellAt(editor, info, row, col);
  if (!cell) return false;
  const tr = editor.state.tr.setSelection(
    TextSelection.create(editor.state.doc, cell.pos + 1),
  );
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}

/** Build a CellSelection covering every cell in a column. */
export function selectColumn(
  editor: Editor,
  info: TableInfo,
  col: number,
): boolean {
  const top = cellAt(editor, info, 0, col);
  const bottom = cellAt(editor, info, info.map.height - 1, col);
  if (!top || !bottom) return false;
  const $anchor = editor.state.doc.resolve(top.pos);
  const $head = editor.state.doc.resolve(bottom.pos);
  const sel = CellSelection.colSelection($anchor, $head);
  editor.view.dispatch(editor.state.tr.setSelection(sel));
  return true;
}

/** Build a CellSelection covering every cell in a row. */
export function selectRow(
  editor: Editor,
  info: TableInfo,
  row: number,
): boolean {
  const left = cellAt(editor, info, row, 0);
  const right = cellAt(editor, info, row, info.map.width - 1);
  if (!left || !right) return false;
  const $anchor = editor.state.doc.resolve(left.pos);
  const $head = editor.state.doc.resolve(right.pos);
  const sel = CellSelection.rowSelection($anchor, $head);
  editor.view.dispatch(editor.state.tr.setSelection(sel));
  return true;
}

/** Clear the content of every cell in a column/row — replaces each
 *  cell's content with an empty paragraph in a single transaction. */
export function clearColumnCells(
  editor: Editor,
  info: TableInfo,
  col: number,
): void {
  const tr = editor.state.tr;
  const schema = editor.state.schema;
  const empty = schema.nodes.paragraph.create();
  for (let r = 0; r < info.map.height; r++) {
    const cell = cellAt(editor, info, r, col);
    if (!cell) continue;
    // Map position through prior changes in this transaction.
    const mappedPos = tr.mapping.map(cell.pos);
    const cellNode = tr.doc.nodeAt(mappedPos);
    if (!cellNode) continue;
    tr.replaceWith(
      mappedPos + 1,
      mappedPos + 1 + cellNode.content.size,
      empty,
    );
  }
  editor.view.dispatch(tr);
}

export function clearRowCells(
  editor: Editor,
  info: TableInfo,
  row: number,
): void {
  const tr = editor.state.tr;
  const schema = editor.state.schema;
  const empty = schema.nodes.paragraph.create();
  for (let c = 0; c < info.map.width; c++) {
    const cell = cellAt(editor, info, row, c);
    if (!cell) continue;
    const mappedPos = tr.mapping.map(cell.pos);
    const cellNode = tr.doc.nodeAt(mappedPos);
    if (!cellNode) continue;
    tr.replaceWith(
      mappedPos + 1,
      mappedPos + 1 + cellNode.content.size,
      empty,
    );
  }
  editor.view.dispatch(tr);
}

/** Move a row up or down in the table. Returns true if the move
 *  happened, false if already at the edge. */
export function moveRow(
  editor: Editor,
  info: TableInfo,
  row: number,
  direction: 'up' | 'down',
): boolean {
  const targetRow = direction === 'up' ? row - 1 : row + 1;
  if (targetRow < 0 || targetRow >= info.tableNode.childCount) return false;
  const rows: PMNode[] = [];
  info.tableNode.forEach((r) => rows.push(r));
  [rows[row], rows[targetRow]] = [rows[targetRow], rows[row]];
  // Replace the whole table content with the reordered rows.
  const newTable = info.tableNode.type.create(
    info.tableNode.attrs,
    rows,
  );
  const tr = editor.state.tr.replaceWith(
    info.tablePos,
    info.tablePos + info.tableNode.nodeSize,
    newTable,
  );
  editor.view.dispatch(tr);
  return true;
}

/** Move a column left or right. Swaps the cell at col with col±1 in
 *  every row. Returns true if performed. */
export function moveColumn(
  editor: Editor,
  info: TableInfo,
  col: number,
  direction: 'left' | 'right',
): boolean {
  const targetCol = direction === 'left' ? col - 1 : col + 1;
  if (targetCol < 0 || targetCol >= info.map.width) return false;
  const schema = editor.state.schema;
  const newRows: PMNode[] = [];
  info.tableNode.forEach((rowNode) => {
    const cells: PMNode[] = [];
    rowNode.forEach((cell) => cells.push(cell));
    if (col < cells.length && targetCol < cells.length) {
      [cells[col], cells[targetCol]] = [cells[targetCol], cells[col]];
    }
    newRows.push(rowNode.type.create(rowNode.attrs, cells));
  });
  const newTable = info.tableNode.type.create(info.tableNode.attrs, newRows);
  const tr = editor.state.tr.replaceWith(
    info.tablePos,
    info.tablePos + info.tableNode.nodeSize,
    newTable,
  );
  editor.view.dispatch(tr);
  // Suppress unused-var lint on schema (kept for future schema-based
  // builds inside the helper).
  void schema;
  return true;
}

/** Sort table rows by the text content of the given column. If the
 *  table has a header row (attrs.headerRow), it stays pinned at the
 *  top. Stable sort, locale-aware compare. */
export function sortColumn(
  editor: Editor,
  info: TableInfo,
  col: number,
  direction: 'asc' | 'desc',
): void {
  const headerRowOn = !!(info.tableNode.attrs as { headerRow?: boolean })
    .headerRow;
  const rows: PMNode[] = [];
  info.tableNode.forEach((r) => rows.push(r));
  const startIdx = headerRowOn ? 1 : 0;
  const sortable = rows.slice(startIdx);
  const keyFor = (row: PMNode): string => {
    let cell: PMNode | null = null;
    let idx = 0;
    row.forEach((c) => {
      if (idx === col) cell = c;
      idx++;
    });
    return cell ? cell.textContent.trim().toLowerCase() : '';
  };
  sortable.sort((a, b) => {
    const ka = keyFor(a);
    const kb = keyFor(b);
    const cmp = ka.localeCompare(kb, undefined, { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });
  const newRows = headerRowOn ? [rows[0], ...sortable] : sortable;
  const newTable = info.tableNode.type.create(info.tableNode.attrs, newRows);
  const tr = editor.state.tr.replaceWith(
    info.tablePos,
    info.tablePos + info.tableNode.nodeSize,
    newTable,
  );
  editor.view.dispatch(tr);
}

/** Set background color on every cell in a column. Pass null to clear. */
export function setColumnBackground(
  editor: Editor,
  info: TableInfo,
  col: number,
  color: string | null,
): void {
  const tr = editor.state.tr;
  for (let r = 0; r < info.map.height; r++) {
    const cell = cellAt(editor, info, r, col);
    if (!cell) continue;
    const mappedPos = tr.mapping.map(cell.pos);
    const cellNode = tr.doc.nodeAt(mappedPos);
    if (!cellNode) continue;
    tr.setNodeMarkup(mappedPos, undefined, {
      ...cellNode.attrs,
      background: color,
    });
  }
  editor.view.dispatch(tr);
}

/** Set background color on every cell in a row. Pass null to clear. */
export function setRowBackground(
  editor: Editor,
  info: TableInfo,
  row: number,
  color: string | null,
): void {
  const tr = editor.state.tr;
  for (let c = 0; c < info.map.width; c++) {
    const cell = cellAt(editor, info, row, c);
    if (!cell) continue;
    const mappedPos = tr.mapping.map(cell.pos);
    const cellNode = tr.doc.nodeAt(mappedPos);
    if (!cellNode) continue;
    tr.setNodeMarkup(mappedPos, undefined, {
      ...cellNode.attrs,
      background: color,
    });
  }
  editor.view.dispatch(tr);
}

/** Reorder columns by moving the column at `fromCol` to the `toCol`
 *  position. Used by drag-and-drop and could replace the +/-1
 *  moveColumn function above for larger jumps. */
export function moveColumnTo(
  editor: Editor,
  info: TableInfo,
  fromCol: number,
  toCol: number,
): boolean {
  if (fromCol === toCol) return false;
  if (
    fromCol < 0 ||
    toCol < 0 ||
    fromCol >= info.map.width ||
    toCol >= info.map.width
  )
    return false;
  const newRows: PMNode[] = [];
  info.tableNode.forEach((rowNode) => {
    const cells: PMNode[] = [];
    rowNode.forEach((cell) => cells.push(cell));
    const [moved] = cells.splice(fromCol, 1);
    cells.splice(toCol, 0, moved);
    newRows.push(rowNode.type.create(rowNode.attrs, cells));
  });
  const newTable = info.tableNode.type.create(info.tableNode.attrs, newRows);
  editor.view.dispatch(
    editor.state.tr.replaceWith(
      info.tablePos,
      info.tablePos + info.tableNode.nodeSize,
      newTable,
    ),
  );
  return true;
}

/** Reorder rows by moving the row at `fromRow` to the `toRow`
 *  position. */
export function moveRowTo(
  editor: Editor,
  info: TableInfo,
  fromRow: number,
  toRow: number,
): boolean {
  if (fromRow === toRow) return false;
  if (
    fromRow < 0 ||
    toRow < 0 ||
    fromRow >= info.tableNode.childCount ||
    toRow >= info.tableNode.childCount
  )
    return false;
  const rows: PMNode[] = [];
  info.tableNode.forEach((r) => rows.push(r));
  const [moved] = rows.splice(fromRow, 1);
  rows.splice(toRow, 0, moved);
  const newTable = info.tableNode.type.create(info.tableNode.attrs, rows);
  editor.view.dispatch(
    editor.state.tr.replaceWith(
      info.tablePos,
      info.tablePos + info.tableNode.nodeSize,
      newTable,
    ),
  );
  return true;
}

/** Walk up from the current selection to find the table + cell the
 *  cursor is in. Returns { info, row, col } or null when not in a
 *  table. Used by the keyboard-shortcut extension. */
export function currentTableContext(
  editor: Editor,
): { info: TableInfo; row: number; col: number } | null {
  const { $from } = editor.state.selection;
  let tableDepth = -1;
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d;
      break;
    }
  }
  if (tableDepth < 0) return null;
  const tableNode = $from.node(tableDepth);
  const tablePos = $from.before(tableDepth);

  let cellDepth = -1;
  for (let d = $from.depth; d >= 0; d--) {
    const name = $from.node(d).type.name;
    if (name === 'tableCell' || name === 'tableHeader') {
      cellDepth = d;
      break;
    }
  }
  if (cellDepth < 0) return null;
  const cellPos = $from.before(cellDepth);
  const map = TableMap.get(tableNode);
  const relPos = cellPos - tablePos - 1;
  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) {
      if (map.map[r * map.width + c] === relPos) {
        const tableDom = editor.view.nodeDOM(tablePos) as HTMLElement | null;
        const tableEl =
          tableDom?.tagName === 'TABLE'
            ? (tableDom as HTMLTableElement)
            : (tableDom?.querySelector('table') as HTMLTableElement | null);
        if (!tableEl) return null;
        return {
          info: {
            tableNode,
            tablePos,
            tableDom: tableEl,
            wrapperDom: (tableDom as HTMLElement) ?? tableEl,
            map,
          },
          row: r,
          col: c,
        };
      }
    }
  }
  return null;
}

/** Read the background color of the cell at (row, col) — used by the
 *  Background menu item to show the current swatch. */
export function getCellBackground(
  editor: Editor,
  info: TableInfo,
  row: number,
  col: number,
): string | null {
  const cell = cellAt(editor, info, row, col);
  if (!cell) return null;
  return ((cell.node.attrs as { background?: string | null }).background) ?? null;
}

/** Set background on a single cell. */
export function setCellBackground(
  editor: Editor,
  info: TableInfo,
  row: number,
  col: number,
  color: string | null,
): void {
  const cell = cellAt(editor, info, row, col);
  if (!cell) return;
  const tr = editor.state.tr.setNodeMarkup(cell.pos, undefined, {
    ...cell.node.attrs,
    background: color,
  });
  editor.view.dispatch(tr);
}

/** Clear the content of a SINGLE cell — replaces with an empty paragraph. */
export function clearCellContent(
  editor: Editor,
  info: TableInfo,
  row: number,
  col: number,
): void {
  const cell = cellAt(editor, info, row, col);
  if (!cell) return;
  const empty = editor.state.schema.nodes.paragraph.create();
  const tr = editor.state.tr.replaceWith(
    cell.pos + 1,
    cell.pos + 1 + cell.node.content.size,
    empty,
  );
  editor.view.dispatch(tr);
}

/** True if the cell at (row, col) currently spans more than one
 *  visual column OR row — i.e. it CAN be split. */
export function canSplitCell(
  info: TableInfo,
  row: number,
  col: number,
): boolean {
  const idx = row * info.map.width + col;
  const relPos = info.map.map[idx];
  if (relPos === undefined) return false;
  const cellNode = info.tableNode.nodeAt(relPos);
  if (!cellNode) return false;
  const colspan = (cellNode.attrs.colspan as number) || 1;
  const rowspan = (cellNode.attrs.rowspan as number) || 1;
  return colspan > 1 || rowspan > 1;
}

/** Toggle a boolean attribute on the table node. */
export function toggleTableAttr(
  editor: Editor,
  info: TableInfo,
  attr: 'headerRow' | 'headerColumn' | 'numberedRows',
): void {
  const current = (info.tableNode.attrs as Record<string, unknown>)[attr];
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(info.tablePos, undefined, {
      ...info.tableNode.attrs,
      [attr]: !current,
    }),
  );
}

/**
 * TableSelection — ProseMirror plugin that holds an "active column /
 * row" selection in plugin state and renders it as `node` decorations
 * on the matching <td>/<th> elements. Each cell gets a CSS class
 * (`catalyst-cell-selected`) which editorStyles.ts turns into a light
 * blue background + blue 1px border — without touching the DOM and
 * without overlay divs.
 *
 * React drives this by dispatching meta transactions:
 *   - selectTableColumn(editor, tablePos, colIndex)
 *   - selectTableRow(editor, tablePos, rowIndex)
 *   - clearTableSelection(editor)
 */
import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TableMap } from '@tiptap/pm/tables';

export type TableSelectionState =
  | null
  | { kind: 'column' | 'row'; tablePos: number; index: number };

export const tableSelectionPluginKey = new PluginKey<TableSelectionState>(
  'catalystTableSelection',
);

/** Same shape, separate state slot — when active, paints the cells
 *  RED instead of BLUE. Used to preview destructive actions (delete
 *  column / delete row / clear cells) on hover. The 'cell' kind
 *  carries (row, col) so we can also preview a single-cell action. */
export type TableDangerState =
  | null
  | { kind: 'column' | 'row'; tablePos: number; index: number }
  | { kind: 'cell'; tablePos: number; row: number; col: number };

export const tableDangerPluginKey = new PluginKey<TableDangerState>(
  'catalystTableDanger',
);

export const TableSelection = Extension.create({
  name: 'catalystTableSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin<TableSelectionState>({
        key: tableSelectionPluginKey,
        state: {
          init: () => null,
          apply: (tr, prev) => {
            // `undefined` = no meta in this tx (preserve current state).
            // `null` = explicit clear.
            // Anything else = new selection.
            const meta = tr.getMeta(tableSelectionPluginKey);
            if (meta === undefined) return prev;
            if (meta === null) return null;
            return meta as TableSelectionState;
          },
        },
        props: {
          decorations(state) {
            const sel = tableSelectionPluginKey.getState(state);
            if (!sel) return null;
            const tableNode = state.doc.nodeAt(sel.tablePos);
            if (!tableNode || tableNode.type.name !== 'table') return null;
            const map = TableMap.get(tableNode);
            const decos: Decoration[] = [];

            const addCellAtRelPos = (relPos: number) => {
              const absPos = sel.tablePos + 1 + relPos;
              const cellNode = state.doc.nodeAt(absPos);
              if (!cellNode) return;
              decos.push(
                Decoration.node(absPos, absPos + cellNode.nodeSize, {
                  class: 'catalyst-cell-selected',
                }),
              );
            };

            if (sel.kind === 'column') {
              if (sel.index < 0 || sel.index >= map.width) return null;
              for (let r = 0; r < map.height; r++) {
                addCellAtRelPos(map.map[r * map.width + sel.index]);
              }
            } else {
              if (sel.index < 0 || sel.index >= map.height) return null;
              for (let c = 0; c < map.width; c++) {
                addCellAtRelPos(map.map[sel.index * map.width + c]);
              }
            }

            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
      // Danger-preview plugin — paints the targeted cells red on top
      // of any active blue selection. CSS rule for
      // .catalyst-cell-danger lives AFTER .catalyst-cell-selected in
      // editorStyles.ts so it wins among equal-!important rules.
      new Plugin<TableDangerState>({
        key: tableDangerPluginKey,
        state: {
          init: () => null,
          apply: (tr, prev) => {
            const meta = tr.getMeta(tableDangerPluginKey);
            if (meta === undefined) return prev;
            if (meta === null) return null;
            return meta as TableDangerState;
          },
        },
        props: {
          decorations(state) {
            const sel = tableDangerPluginKey.getState(state);
            if (!sel) return null;
            const tableNode = state.doc.nodeAt(sel.tablePos);
            if (!tableNode || tableNode.type.name !== 'table') return null;
            const map = TableMap.get(tableNode);
            const decos: Decoration[] = [];

            const addCellAtRelPos = (relPos: number) => {
              const absPos = sel.tablePos + 1 + relPos;
              const cellNode = state.doc.nodeAt(absPos);
              if (!cellNode) return;
              decos.push(
                Decoration.node(absPos, absPos + cellNode.nodeSize, {
                  class: 'catalyst-cell-danger',
                }),
              );
            };

            if (sel.kind === 'column') {
              if (sel.index < 0 || sel.index >= map.width) return null;
              for (let r = 0; r < map.height; r++) {
                addCellAtRelPos(map.map[r * map.width + sel.index]);
              }
            } else if (sel.kind === 'row') {
              if (sel.index < 0 || sel.index >= map.height) return null;
              for (let c = 0; c < map.width; c++) {
                addCellAtRelPos(map.map[sel.index * map.width + c]);
              }
            } else {
              if (
                sel.row < 0 || sel.row >= map.height ||
                sel.col < 0 || sel.col >= map.width
              ) return null;
              addCellAtRelPos(map.map[sel.row * map.width + sel.col]);
            }

            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

export function selectTableColumn(
  editor: Editor,
  tablePos: number,
  colIndex: number,
): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableSelectionPluginKey, {
      kind: 'column',
      tablePos,
      index: colIndex,
    }),
  );
}

export function selectTableRow(
  editor: Editor,
  tablePos: number,
  rowIndex: number,
): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableSelectionPluginKey, {
      kind: 'row',
      tablePos,
      index: rowIndex,
    }),
  );
}

export function clearTableSelection(editor: Editor): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableSelectionPluginKey, null),
  );
}

export function setTableDangerColumn(
  editor: Editor,
  tablePos: number,
  colIndex: number,
): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableDangerPluginKey, {
      kind: 'column',
      tablePos,
      index: colIndex,
    }),
  );
}

export function setTableDangerRow(
  editor: Editor,
  tablePos: number,
  rowIndex: number,
): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableDangerPluginKey, {
      kind: 'row',
      tablePos,
      index: rowIndex,
    }),
  );
}

export function setTableDangerCell(
  editor: Editor,
  tablePos: number,
  row: number,
  col: number,
): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableDangerPluginKey, {
      kind: 'cell',
      tablePos,
      row,
      col,
    }),
  );
}

export function clearTableDanger(editor: Editor): void {
  editor.view.dispatch(
    editor.state.tr.setMeta(tableDangerPluginKey, null),
  );
}

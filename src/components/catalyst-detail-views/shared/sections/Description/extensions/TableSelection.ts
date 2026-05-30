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

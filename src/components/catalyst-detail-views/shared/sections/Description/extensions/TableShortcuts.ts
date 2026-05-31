/**
 * TableShortcuts — keymap entries for table-scoped actions, mirroring
 * the labels we show in ColumnMenu / RowMenu. All shortcuts only fire
 * when the cursor is currently inside a table cell.
 *
 *   Ctrl + Alt + ←      → addColumnBefore
 *   Ctrl + Alt + →      → addColumnAfter
 *   Ctrl + Alt + ↑      → addRowBefore
 *   Ctrl + Alt + ↓      → addRowAfter
 *   Ctrl + Alt + -      → moveColumnLeft
 *   Ctrl + Alt + =      → moveColumnRight
 *   Ctrl + Alt + [      → moveRowUp
 *   Ctrl + Alt + ]      → moveRowDown
 *   Ctrl + Backspace    → deleteColumn (when in a table)
 *
 * "Mod" in Tiptap keymaps resolves to ⌘ on Mac, Ctrl elsewhere.
 */
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import {
  currentTableContext,
  moveColumn,
  moveRow,
} from '../_components/TableInteractions/tableHelpers';

function inTable(editor: Editor): boolean {
  return currentTableContext(editor) !== null;
}

export const TableShortcuts = Extension.create({
  name: 'catalystTableShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-ArrowLeft': () => {
        if (!inTable(this.editor)) return false;
        return this.editor.commands.addColumnBefore();
      },
      'Mod-Alt-ArrowRight': () => {
        if (!inTable(this.editor)) return false;
        return this.editor.commands.addColumnAfter();
      },
      'Mod-Alt-ArrowUp': () => {
        if (!inTable(this.editor)) return false;
        return this.editor.commands.addRowBefore();
      },
      'Mod-Alt-ArrowDown': () => {
        if (!inTable(this.editor)) return false;
        return this.editor.commands.addRowAfter();
      },
      'Mod-Backspace': () => {
        if (!inTable(this.editor)) return false;
        return this.editor.commands.deleteColumn();
      },
      'Mod-Alt--': () => {
        const ctx = currentTableContext(this.editor);
        if (!ctx) return false;
        return moveColumn(this.editor, ctx.info, ctx.col, 'left');
      },
      'Mod-Alt-=': () => {
        const ctx = currentTableContext(this.editor);
        if (!ctx) return false;
        return moveColumn(this.editor, ctx.info, ctx.col, 'right');
      },
      'Mod-Alt-[': () => {
        const ctx = currentTableContext(this.editor);
        if (!ctx) return false;
        return moveRow(this.editor, ctx.info, ctx.row, 'up');
      },
      'Mod-Alt-]': () => {
        const ctx = currentTableContext(this.editor);
        if (!ctx) return false;
        return moveRow(this.editor, ctx.info, ctx.row, 'down');
      },
    };
  },
});

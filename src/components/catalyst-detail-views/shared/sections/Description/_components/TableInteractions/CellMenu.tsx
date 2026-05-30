/**
 * CellMenu — dropdown opened by clicking the chevron in a table cell's
 * top-right corner. Operates on the SINGLE cell at (row, col).
 *
 * Items (in order):
 *   1. Background color (cell-only)
 *   2. Merge cells   (always disabled here — needs multi-cell selection)
 *   3. Split cell    (enabled only if the cell has colspan or rowspan > 1)
 *   ---
 *   4. Add column right
 *   5. Add row below
 *   6. Clear cell
 *   7. Delete column   (red-previews the column on hover)
 *   8. Delete row      (red-previews the row on hover)
 */
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import TableCellMergeIcon from '@atlaskit/icon/core/table-cell-merge';
// eslint-disable-next-line no-restricted-imports
import TableCellSplitIcon from '@atlaskit/icon/core/table-cell-split';
// eslint-disable-next-line no-restricted-imports
import AddColumnRightIcon from '@atlaskit/icon/core/table-column-add-right';
// eslint-disable-next-line no-restricted-imports
import AddRowBelowIcon from '@atlaskit/icon/core/table-row-add-below';
// eslint-disable-next-line no-restricted-imports
import TableCellClearIcon from '@atlaskit/icon/core/table-cell-clear';
// eslint-disable-next-line no-restricted-imports
import DeleteColumnIcon from '@atlaskit/icon/core/table-column-delete';
// eslint-disable-next-line no-restricted-imports
import DeleteRowIcon from '@atlaskit/icon/core/table-row-delete';
import { TableMap } from '@tiptap/pm/tables';
import {
  canSplitCell,
  cellAt,
  clearCellContent,
  focusCell,
  getCellBackground,
  setCellBackground,
} from './tableHelpers';
import { BackgroundPickerItem } from './BackgroundPickerItem';
import {
  MenuDropdown,
  MenuDivider,
  MenuItem,
  useMenuDismiss,
} from './MenuShared';
import {
  setTableDangerCell,
  setTableDangerColumn,
  setTableDangerRow,
  clearTableDanger,
} from '../../extensions/TableSelection';

interface Props {
  editor: Editor;
  tablePos: number;
  row: number;
  col: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function CellMenu({
  editor,
  tablePos,
  row,
  col,
  anchorRect,
  onClose,
}: Props) {
  useMenuDismiss(onClose);

  const tableNode = editor.state.doc.nodeAt(tablePos);
  if (!tableNode || tableNode.type.name !== 'table') return null;
  const map = TableMap.get(tableNode);
  const info = {
    tableNode,
    tablePos,
    tableDom: editor.view.nodeDOM(tablePos) as HTMLTableElement,
    wrapperDom: editor.view.nodeDOM(tablePos) as HTMLElement,
    map,
  };

  const splitEnabled = canSplitCell(info, row, col);
  // Merge is always disabled from the chevron menu — merging requires
  // a multi-cell selection (CellSelection covering 2+ adjacent cells)
  // and the chevron menu always opens on a single cell.
  const mergeEnabled = false;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const addColumnRight = () => {
    if (!focusCell(editor, info, row, col)) return;
    editor.chain().focus().addColumnAfter().run();
  };
  const addRowBelow = () => {
    if (!focusCell(editor, info, row, col)) return;
    editor.chain().focus().addRowAfter().run();
  };
  const clearCell = () => {
    clearCellContent(editor, info, row, col);
  };
  const deleteCol = () => {
    if (!focusCell(editor, info, row, col)) return;
    editor.chain().focus().deleteColumn().run();
  };
  const deleteRow = () => {
    if (!focusCell(editor, info, row, col)) return;
    editor.chain().focus().deleteRow().run();
  };
  const splitCell = () => {
    if (!focusCell(editor, info, row, col)) return;
    editor.chain().focus().splitCell().run();
  };

  // Reference cellAt so TS doesn't complain about unused import — it's
  // here for future Phase 2 (cell-range merge from chevron menu).
  void cellAt;

  return (
    <MenuDropdown anchorRect={anchorRect}>
      <BackgroundPickerItem
        currentColor={getCellBackground(editor, info, row, col)}
        onSelect={(color) => {
          setCellBackground(editor, info, row, col, color);
          onClose();
        }}
      />
      <MenuItem
        icon={<TableCellMergeIcon label="" />}
        label="Merge cells"
        onClick={() => {}}
        disabled={!mergeEnabled}
      />
      <MenuItem
        icon={<TableCellSplitIcon label="" />}
        label="Split cell"
        onClick={() => run(splitCell)}
        disabled={!splitEnabled}
      />
      <MenuDivider />
      <MenuItem
        icon={<AddColumnRightIcon label="" />}
        label="Add column right"
        shortcut={['Ctrl', 'Alt', 'ArrowRight']}
        onClick={() => run(addColumnRight)}
      />
      <MenuItem
        icon={<AddRowBelowIcon label="" />}
        label="Add row below"
        shortcut={['Ctrl', 'Alt', 'ArrowDown']}
        onClick={() => run(addRowBelow)}
      />
      <MenuItem
        icon={<TableCellClearIcon label="" />}
        label="Clear cell"
        shortcut={['Backspace']}
        onClick={() => run(clearCell)}
        onHoverChange={(h) =>
          h
            ? setTableDangerCell(editor, tablePos, row, col)
            : clearTableDanger(editor)
        }
      />
      <MenuItem
        icon={<DeleteColumnIcon label="" />}
        label="Delete column"
        onClick={() => run(deleteCol)}
        onHoverChange={(h) =>
          h
            ? setTableDangerColumn(editor, tablePos, col)
            : clearTableDanger(editor)
        }
      />
      <MenuItem
        icon={<DeleteRowIcon label="" />}
        label="Delete row"
        onClick={() => run(deleteRow)}
        onHoverChange={(h) =>
          h
            ? setTableDangerRow(editor, tablePos, row)
            : clearTableDanger(editor)
        }
      />
    </MenuDropdown>
  );
}

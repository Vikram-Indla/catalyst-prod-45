/**
 * RowMenu — dropdown opened by clicking the row grip. Round 1 wires:
 * add-above/below, delete row, clear cells, header row toggle, numbered
 * rows toggle. Background color and move-row items are rendered but
 * disabled (Round 2).
 */
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import AddRowAboveIcon from '@atlaskit/icon/core/table-row-add-above';
// eslint-disable-next-line no-restricted-imports
import AddRowBelowIcon from '@atlaskit/icon/core/table-row-add-below';
// eslint-disable-next-line no-restricted-imports
import TableCellClearIcon from '@atlaskit/icon/core/table-cell-clear';
// eslint-disable-next-line no-restricted-imports
import DeleteRowIcon from '@atlaskit/icon/core/table-row-delete';
// eslint-disable-next-line no-restricted-imports
import MoveRowUpIcon from '@atlaskit/icon/core/table-row-move-up';
// eslint-disable-next-line no-restricted-imports
import MoveRowDownIcon from '@atlaskit/icon/core/table-row-move-down';
import { TableMap } from '@tiptap/pm/tables';
import {
  clearRowCells,
  focusCell,
  getCellBackground,
  moveRow,
  setRowBackground,
  toggleTableAttr,
} from './tableHelpers';
import { BackgroundPickerItem } from './BackgroundPickerItem';
import {
  MenuDropdown,
  MenuDivider,
  MenuItem,
  MenuToggle,
  useMenuDismiss,
} from './MenuShared';
import {
  setTableDangerRow,
  clearTableDanger,
} from '../../extensions/TableSelection';

interface Props {
  editor: Editor;
  tablePos: number;
  row: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function RowMenu({
  editor,
  tablePos,
  row,
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
  const tableAttrs = tableNode.attrs as {
    headerRow?: boolean;
    numberedRows?: boolean;
  };

  const canMoveUp = row > 0;
  const canMoveDown = row < map.height - 1;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const addRowAbove = () => {
    if (!focusCell(editor, info, row, 0)) return;
    editor.chain().focus().addRowBefore().run();
  };
  const addRowBelow = () => {
    if (!focusCell(editor, info, row, 0)) return;
    editor.chain().focus().addRowAfter().run();
  };
  const deleteRow = () => {
    if (!focusCell(editor, info, row, 0)) return;
    editor.chain().focus().deleteRow().run();
  };
  const clearCells = () => {
    clearRowCells(editor, info, row);
  };
  const toggleHeaderRow = () => toggleTableAttr(editor, info, 'headerRow');
  const toggleNumberedRows = () =>
    toggleTableAttr(editor, info, 'numberedRows');

  return (
    <MenuDropdown anchorRect={anchorRect}>
      <MenuItem
        icon={<AddRowAboveIcon label="" />}
        label="Add row above"
        shortcut={['Ctrl', 'Alt', 'ArrowUp']}
        onClick={() => run(addRowAbove)}
      />
      <MenuItem
        icon={<AddRowBelowIcon label="" />}
        label="Add row below"
        shortcut={['Ctrl', 'Alt', 'ArrowDown']}
        onClick={() => run(addRowBelow)}
      />
      <MenuItem
        icon={<TableCellClearIcon label="" />}
        label="Clear cells"
        shortcut={['Backspace']}
        onClick={() => run(clearCells)}
        onHoverChange={(h) =>
          h
            ? setTableDangerRow(editor, tablePos, row)
            : clearTableDanger(editor)
        }
      />
      <MenuItem
        icon={<DeleteRowIcon label="" />}
        label="Delete row"
        shortcut={['Ctrl', 'Backspace']}
        onClick={() => run(deleteRow)}
        onHoverChange={(h) =>
          h
            ? setTableDangerRow(editor, tablePos, row)
            : clearTableDanger(editor)
        }
      />
      <MenuDivider />
      <BackgroundPickerItem
        currentColor={getCellBackground(editor, info, row, 0)}
        onSelect={(color) => {
          setRowBackground(editor, info, row, color);
          onClose();
        }}
      />
      <MenuItem
        icon={<MoveRowUpIcon label="" />}
        label="Move row up"
        shortcut={['Ctrl', 'Alt', '[']}
        onClick={() => run(() => moveRow(editor, info, row, 'up'))}
        disabled={!canMoveUp}
      />
      <MenuItem
        icon={<MoveRowDownIcon label="" />}
        label="Move row down"
        shortcut={['Ctrl', 'Alt', ']']}
        onClick={() => run(() => moveRow(editor, info, row, 'down'))}
        disabled={!canMoveDown}
      />
      <MenuDivider />
      <MenuItem
        label="Header row"
        onClick={() => run(toggleHeaderRow)}
        rightSlot={<MenuToggle on={!!tableAttrs.headerRow} />}
      />
      <MenuItem
        label="Numbered rows"
        onClick={() => run(toggleNumberedRows)}
        rightSlot={<MenuToggle on={!!tableAttrs.numberedRows} />}
      />
    </MenuDropdown>
  );
}

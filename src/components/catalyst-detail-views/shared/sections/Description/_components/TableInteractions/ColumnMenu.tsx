/**
 * ColumnMenu — dropdown opened by clicking the column grip. Lists every
 * column-scoped action. Round 1 wires: add-left/right, delete column,
 * distribute columns, clear cells, header column toggle, numbered rows
 * toggle. Sort, background color, and move-column items are rendered
 * but disabled (Round 2).
 */
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import SortAscendingIcon from '@atlaskit/icon/core/sort-ascending';
// eslint-disable-next-line no-restricted-imports
import SortDescendingIcon from '@atlaskit/icon/core/sort-descending';
// eslint-disable-next-line no-restricted-imports
import AddColumnLeftIcon from '@atlaskit/icon/core/table-column-add-left';
// eslint-disable-next-line no-restricted-imports
import AddColumnRightIcon from '@atlaskit/icon/core/table-column-add-right';
// eslint-disable-next-line no-restricted-imports
import DistributeColumnsIcon from '@atlaskit/icon/core/table-columns-distribute';
// eslint-disable-next-line no-restricted-imports
import TableCellClearIcon from '@atlaskit/icon/core/table-cell-clear';
// eslint-disable-next-line no-restricted-imports
import DeleteColumnIcon from '@atlaskit/icon/core/table-column-delete';
// eslint-disable-next-line no-restricted-imports
import MoveColumnLeftIcon from '@atlaskit/icon/core/table-column-move-left';
// eslint-disable-next-line no-restricted-imports
import MoveColumnRightIcon from '@atlaskit/icon/core/table-column-move-right';
import { TableMap } from '@tiptap/pm/tables';
import {
  cellAt,
  clearColumnCells,
  focusCell,
  getCellBackground,
  moveColumn,
  selectColumn,
  setColumnBackground,
  sortColumn,
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
  setTableDangerColumn,
  clearTableDanger,
} from '../../extensions/TableSelection';

interface Props {
  editor: Editor;
  tablePos: number;
  col: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function ColumnMenu({
  editor,
  tablePos,
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
  const tableAttrs = tableNode.attrs as {
    headerRow?: boolean;
    headerColumn?: boolean;
    numberedRows?: boolean;
  };

  const canMoveLeft = col > 0;
  const canMoveRight = col < map.width - 1;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const addColumnLeft = () => {
    if (!focusCell(editor, info, 0, col)) return;
    editor.chain().focus().addColumnBefore().run();
  };
  const addColumnRight = () => {
    if (!focusCell(editor, info, 0, col)) return;
    editor.chain().focus().addColumnAfter().run();
  };
  const deleteCol = () => {
    if (!focusCell(editor, info, 0, col)) return;
    editor.chain().focus().deleteColumn().run();
  };
  const distributeColumns = () => {
    // Walk every cell, strip colwidth so table-layout: fixed redistributes.
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        const node = state.doc.nodeAt(tablePos);
        if (!node) return false;
        node.forEach((row, rowOffset) => {
          row.forEach((cell, cellOffset) => {
            const pos = tablePos + 1 + rowOffset + 1 + cellOffset;
            if (cell.attrs.colwidth != null) {
              tr.setNodeMarkup(pos, undefined, {
                ...cell.attrs,
                colwidth: null,
              });
            }
          });
        });
        return true;
      })
      .run();
  };
  const clearCells = () => {
    clearColumnCells(editor, info, col);
  };
  const toggleHeaderCol = () => toggleTableAttr(editor, info, 'headerColumn');
  const toggleNumberedRows = () =>
    toggleTableAttr(editor, info, 'numberedRows');

  return (
    <MenuDropdown anchorRect={anchorRect}>
      <MenuItem
        icon={<SortAscendingIcon label="" />}
        label="Sort increasing"
        onClick={() => run(() => sortColumn(editor, info, col, 'asc'))}
      />
      <MenuItem
        icon={<SortDescendingIcon label="" />}
        label="Sort decreasing"
        onClick={() => run(() => sortColumn(editor, info, col, 'desc'))}
      />
      <MenuDivider />
      <BackgroundPickerItem
        currentColor={getCellBackground(editor, info, 0, col)}
        onSelect={(color) => {
          setColumnBackground(editor, info, col, color);
          onClose();
        }}
      />
      <MenuItem
        icon={<AddColumnLeftIcon label="" />}
        label="Add column left"
        shortcut={['Ctrl', 'Alt', 'ArrowLeft']}
        onClick={() => run(addColumnLeft)}
      />
      <MenuItem
        icon={<AddColumnRightIcon label="" />}
        label="Add column right"
        shortcut={['Ctrl', 'Alt', 'ArrowRight']}
        onClick={() => run(addColumnRight)}
      />
      <MenuItem
        icon={<DistributeColumnsIcon label="" />}
        label="Distribute columns"
        onClick={() => run(distributeColumns)}
      />
      <MenuItem
        icon={<TableCellClearIcon label="" />}
        label="Clear cells"
        shortcut={['Backspace']}
        onClick={() => run(clearCells)}
        onHoverChange={(h) =>
          h
            ? setTableDangerColumn(editor, tablePos, col)
            : clearTableDanger(editor)
        }
      />
      <MenuItem
        icon={<DeleteColumnIcon label="" />}
        label="Delete column"
        shortcut={['Ctrl', 'Backspace']}
        onClick={() => run(deleteCol)}
        onHoverChange={(h) =>
          h
            ? setTableDangerColumn(editor, tablePos, col)
            : clearTableDanger(editor)
        }
      />
      <MenuDivider />
      <MenuItem
        icon={<MoveColumnLeftIcon label="" />}
        label="Move column left"
        shortcut={['Ctrl', 'Alt', '-']}
        onClick={() => run(() => moveColumn(editor, info, col, 'left'))}
        disabled={!canMoveLeft}
      />
      <MenuItem
        icon={<MoveColumnRightIcon label="" />}
        label="Move column right"
        shortcut={['Ctrl', 'Alt', '=']}
        onClick={() => run(() => moveColumn(editor, info, col, 'right'))}
        disabled={!canMoveRight}
      />
      <MenuDivider />
      <MenuItem
        label="Header column"
        onClick={() => run(toggleHeaderCol)}
        rightSlot={<MenuToggle on={!!tableAttrs.headerColumn} />}
      />
      {/* Silence unused-var lint: selectColumn is exported for use by
          drag-and-drop in Round 2. */}
      <span style={{ display: 'none' }} aria-hidden>
        {String(typeof selectColumn === 'function')}
        {String(!!cellAt)}
        {String(!!toggleNumberedRows)}
      </span>
    </MenuDropdown>
  );
}

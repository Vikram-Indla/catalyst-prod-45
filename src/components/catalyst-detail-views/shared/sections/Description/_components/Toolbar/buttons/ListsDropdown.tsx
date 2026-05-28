import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import BulletListIcon from '@atlaskit/icon/glyph/editor/bullet-list';
// eslint-disable-next-line no-restricted-imports
import NumberListIcon from '@atlaskit/icon/glyph/editor/number-list';
// eslint-disable-next-line no-restricted-imports
import TaskIcon from '@atlaskit/icon/glyph/editor/task';
import { ToolbarPopover, MenuItem } from '../ToolbarPopover';
import { ChevronDownGlyph } from '../ChevronDownGlyph';

interface Props {
  editor: Editor;
}

export function ListsDropdown({ editor }: Props) {
  return (
    <ToolbarPopover
      label="Lists"
      triggerContent={<ChevronDownGlyph />}
      panelWidth={220}
      testId="catalyst-desc-toolbar-lists"
    >
      {({ close }) => (
        <>
          <MenuItem
            glyph={<BulletListIcon label="" />}
            label="Bullet list"
            shortcut="Ctrl+Shift+8"
            active={editor.isActive('bulletList')}
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
              close();
            }}
          />
          <MenuItem
            glyph={<NumberListIcon label="" />}
            label="Numbered list"
            shortcut="Ctrl+Shift+7"
            active={editor.isActive('orderedList')}
            onClick={() => {
              editor.chain().focus().toggleOrderedList().run();
              close();
            }}
          />
          <MenuItem
            glyph={<TaskIcon label="" />}
            label="Task list"
            shortcut="Ctrl+Shift+9"
            active={editor.isActive('taskList')}
            onClick={() => {
              editor.chain().focus().toggleTaskList().run();
              close();
            }}
          />
        </>
      )}
    </ToolbarPopover>
  );
}

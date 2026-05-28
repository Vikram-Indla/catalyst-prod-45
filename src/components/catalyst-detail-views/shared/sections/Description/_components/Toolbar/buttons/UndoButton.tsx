import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import UndoIcon from '@atlaskit/icon/core/undo';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function UndoButton({ editor }: Props) {
  const disabled = !editor.can().undo();
  return (
    <ToolbarIconButton
      label="Undo Ctrl+Z"
      disabled={disabled}
      onClick={() => editor.chain().focus().undo().run()}
      testId="catalyst-desc-toolbar-undo"
    >
      <UndoIcon label="" />
    </ToolbarIconButton>
  );
}

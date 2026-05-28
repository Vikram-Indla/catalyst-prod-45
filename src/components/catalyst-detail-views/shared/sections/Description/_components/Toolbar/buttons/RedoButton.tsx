import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import RedoIcon from '@atlaskit/icon/core/redo';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function RedoButton({ editor }: Props) {
  const disabled = !editor.can().redo();
  return (
    <ToolbarIconButton
      label="Redo Ctrl+Y"
      disabled={disabled}
      onClick={() => editor.chain().focus().redo().run()}
      testId="catalyst-desc-toolbar-redo"
    >
      <RedoIcon label="" />
    </ToolbarIconButton>
  );
}

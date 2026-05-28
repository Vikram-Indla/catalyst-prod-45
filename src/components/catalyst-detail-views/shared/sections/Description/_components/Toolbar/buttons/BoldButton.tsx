import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import BoldIcon from '@atlaskit/icon/glyph/editor/bold';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function BoldButton({ editor }: Props) {
  const active = editor.isActive('bold');
  return (
    <ToolbarIconButton
      label="Bold Ctrl+B"
      active={active}
      onClick={() => editor.chain().focus().toggleBold().run()}
      testId="catalyst-desc-toolbar-bold"
    >
      <BoldIcon label="" />
    </ToolbarIconButton>
  );
}

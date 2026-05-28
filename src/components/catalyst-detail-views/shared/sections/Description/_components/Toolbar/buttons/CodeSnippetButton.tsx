import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import AngleBracketsIcon from '@atlaskit/icon/core/angle-brackets';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function CodeSnippetButton({ editor }: Props) {
  const active = editor.isActive('codeBlock');
  return (
    <ToolbarIconButton
      label="Code snippet ```"
      active={active}
      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      testId="catalyst-desc-toolbar-code"
    >
      <AngleBracketsIcon label="" />
    </ToolbarIconButton>
  );
}

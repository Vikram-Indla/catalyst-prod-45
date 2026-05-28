import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import LinkIcon from '@atlaskit/icon/core/link';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function LinkButton({ editor }: Props) {
  const active = editor.isActive('link');

  const handleClick = () => {
    if (active) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <ToolbarIconButton
      label="Link Ctrl+K"
      active={active}
      onClick={handleClick}
      testId="catalyst-desc-toolbar-link"
    >
      <LinkIcon label="" />
    </ToolbarIconButton>
  );
}

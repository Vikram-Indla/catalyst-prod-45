import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import BulletListIcon from '@atlaskit/icon/glyph/editor/bullet-list';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
}

export function BulletListButton({ editor }: Props) {
  const active = editor.isActive('bulletList');
  return (
    <ToolbarIconButton
      label="Bullet list Ctrl+Shift+8"
      active={active}
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      testId="catalyst-desc-toolbar-bullet"
    >
      <BulletListIcon label="" />
    </ToolbarIconButton>
  );
}

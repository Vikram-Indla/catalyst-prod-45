import { useState } from 'react';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import LinkIcon from '@atlaskit/icon/core/link';
import { ToolbarIconButton } from '../ToolbarIconButton';
import { LinkInputModal } from '@/components/shared/LinkInputModal';

interface Props {
  editor: Editor;
}

export function LinkButton({ editor }: Props) {
  const active = editor.isActive('link');
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    if (active) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setModalOpen(true);
  };

  const handleConfirm = (url: string) => {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <>
      <ToolbarIconButton
        label="Link Ctrl+K"
        active={active}
        onClick={handleClick}
        testId="catalyst-desc-toolbar-link"
      >
        <LinkIcon label="" />
      </ToolbarIconButton>
      <LinkInputModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        title="Insert link"
      />
    </>
  );
}

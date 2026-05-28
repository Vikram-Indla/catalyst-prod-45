import { useRef } from 'react';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import ImageIcon from '@atlaskit/icon/core/image';
import { ToolbarIconButton } from '../ToolbarIconButton';

interface Props {
  editor: Editor;
  onUpload?: (file: File) => Promise<string>;
}

export function ImageUploadButton({ editor, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <ToolbarIconButton
        label="Insert image"
        onClick={() => inputRef.current?.click()}
        disabled={!onUpload}
        testId="catalyst-desc-toolbar-image"
      >
        <ImageIcon label="" />
      </ToolbarIconButton>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !onUpload) return;
          try {
            const url = await onUpload(file);
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          } catch (err) {
            console.error('[ImageUploadButton] upload failed', err);
          } finally {
            if (inputRef.current) inputRef.current.value = '';
          }
        }}
      />
    </>
  );
}

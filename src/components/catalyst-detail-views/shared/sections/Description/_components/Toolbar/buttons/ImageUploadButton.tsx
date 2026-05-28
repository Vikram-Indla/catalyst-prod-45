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

          // Optimistic insert — render a local blob URL immediately so the
          // user sees the image the moment they pick it. The persistent
          // Supabase URL replaces it after upload completes. If upload
          // fails the blob URL stays (image is visible, just not saved).
          const blobUrl = URL.createObjectURL(file);
          editor
            .chain()
            .focus()
            .setImage({ src: blobUrl, alt: file.name })
            .run();

          try {
            const realUrl = await onUpload(file);
            console.info('[ImageUploadButton] upload complete →', realUrl);
            if (!realUrl) {
              throw new Error('Upload returned an empty URL');
            }
            if (realUrl !== blobUrl) {
              // Walk the doc to find the image we just inserted (matched
              // by src === blobUrl) and swap its src to the persistent URL.
              let swapped = false;
              editor.commands.command(({ state, tr }) => {
                state.doc.descendants((node, pos) => {
                  if (
                    node.type.name === 'image' &&
                    node.attrs.src === blobUrl
                  ) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      src: realUrl,
                    });
                    swapped = true;
                    return false;
                  }
                  return true;
                });
                return swapped;
              });
              console.info('[ImageUploadButton] doc src swap:', swapped);
              URL.revokeObjectURL(blobUrl);
            }
          } catch (err) {
            console.error('[ImageUploadButton] upload failed', err);
            // Remove the orphaned blob image so the user doesn't save it.
            // Any further error handling happens at save time via the
            // app's ErrorBoundary — no inline alert here.
            editor.commands.command(({ state, tr }) => {
              let removed = false;
              state.doc.descendants((node, pos) => {
                if (
                  node.type.name === 'image' &&
                  node.attrs.src === blobUrl
                ) {
                  tr.delete(pos, pos + node.nodeSize);
                  removed = true;
                  return false;
                }
                return true;
              });
              return removed;
            });
            URL.revokeObjectURL(blobUrl);
          } finally {
            if (inputRef.current) inputRef.current.value = '';
          }
        }}
      />
    </>
  );
}

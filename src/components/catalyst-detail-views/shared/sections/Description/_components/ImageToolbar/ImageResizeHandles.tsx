/**
 * ImageResizeHandles — single narrow vertical bar at the RIGHT edge of
 * the selected image, separated from the image by a small gap.
 *
 * Drag → live width update via direct DOM mutation; mouseup commits the
 * final width to the Tiptap node via setNodeMarkup.
 *
 * The handle tracks the image in real time by re-measuring on:
 *   - scroll (capture-phase, catches any scrolling ancestor)
 *   - window resize
 *   - editor transactions (alignment / attribute changes shift the image)
 *   - selection updates (selecting a different image)
 * Plus a useLayoutEffect with no deps re-runs on every render of this
 * component, which catches anything the explicit listeners miss.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor;
  imagePos: number;
}

const HANDLE_WIDTH = 2;
const HANDLE_HEIGHT = 48;
const HANDLE_GAP = 6;
const MIN_WIDTH = 60;

export function ImageResizeHandles({ editor, imagePos }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const measure = useCallback(() => {
    const dom = editor.view.nodeDOM(imagePos) as HTMLElement | null;
    const imgEl =
      dom?.tagName === 'IMG'
        ? (dom as HTMLImageElement)
        : (dom?.querySelector('img') as HTMLImageElement | null);
    imgRef.current = imgEl;
    const next = imgEl?.getBoundingClientRect() ?? null;
    // Only setState when the rect actually changed — avoids render loops.
    setRect((prev) => {
      if (!prev && !next) return prev;
      if (!prev || !next) return next;
      if (
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
  }, [editor, imagePos]);

  // Re-measure on every render of this component. Catches alignment
  // changes / attr updates / anything that shifts the image's DOM rect
  // without triggering one of the explicit listeners below.
  useLayoutEffect(() => {
    measure();
  });

  // Explicit listeners for the common cases.
  useEffect(() => {
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  useEffect(() => {
    editor.on('update', measure);
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    return () => {
      editor.off('update', measure);
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
    };
  }, [editor, measure]);

  const startDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const startX = e.clientX;
      const startWidth = img.getBoundingClientRect().width;

      const editorContent = img.closest('.catalyst-tiptap-editor');
      const maxWidth = editorContent
        ? (editorContent as HTMLElement).clientWidth - 8
        : window.innerWidth - 16;

      // Body-level cursor lock so the cursor stays as col-resize across
      // the whole window during drag, not just over the handle.
      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.max(MIN_WIDTH, Math.min(maxWidth, startWidth + delta));
        img.style.width = `${next}px`;
        img.style.maxWidth = 'none';
        setRect(img.getBoundingClientRect());
      };

      const onUp = (ev: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;

        const delta = ev.clientX - startX;
        const finalWidth = Math.max(
          MIN_WIDTH,
          Math.min(maxWidth, startWidth + delta),
        );
        editor.commands.command(({ state, tr }) => {
          const node = state.doc.nodeAt(imagePos);
          if (!node || node.type.name !== 'image') return false;
          tr.setNodeMarkup(imagePos, undefined, {
            ...node.attrs,
            width: Math.round(finalWidth),
          });
          return true;
        });
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [editor, imagePos],
  );

  if (!rect) return null;

  const top = rect.top + rect.height / 2 - HANDLE_HEIGHT / 2;
  const left = rect.right + HANDLE_GAP;

  return createPortal(
    <div
      role="slider"
      aria-label="Resize image"
      onMouseDown={startDrag}
      style={{
        position: 'fixed',
        top,
        left,
        width: HANDLE_WIDTH,
        height: HANDLE_HEIGHT,
        background: 'var(--ds-border-selected, #0C66E4)',
        borderRadius: HANDLE_WIDTH,
        cursor: 'col-resize',
        zIndex: 2147483600,
      }}
    />,
    document.body,
  );
}

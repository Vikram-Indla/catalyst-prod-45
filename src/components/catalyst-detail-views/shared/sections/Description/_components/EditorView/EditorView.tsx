/**
 * EditorView — one bordered shell that contains the toolbar at top and
 * a scrollable body underneath. Mirrors Jira's description editor box.
 *
 * The shell is a flex column with a max-height. The toolbar is a normal
 * flex child at the top (no position:sticky — it doesn't move). The body
 * has `overflow-y: auto` so when the description grows past the
 * max-height, only the body scrolls; the toolbar stays put.
 *
 * Streaming overlay handling: when `bodyOverlay` is set, the editor
 * body is hidden (display:none — Tiptap instance stays mounted) and the
 * overlay fills the body region.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { injectEditorStyles } from './editorStyles';
import { BlockDragHandle } from '../BlockDragHandle/BlockDragHandle';
import { SelectionTranslate } from '../SelectionTranslate/SelectionTranslate';
import { TableResizeBar } from '../TableResizeBar/TableResizeBar';
import { TableToolbar } from '../TableToolbar/TableToolbar';
import { TableInteractions } from '../TableInteractions/TableInteractions';
import { ColumnResizeHandles } from '../ColumnResizeHandles/ColumnResizeHandles';

interface EditorViewProps {
  editor: Editor | null;
  toolbar?: ReactNode;
  bodyOverlay?: ReactNode;
  /** Minimum body height in px. Default 220 (description default). Comments
   *  pass a smaller value (~80) for a compact 2-row starting height. */
  minHeight?: number;
  /** Optional content rendered INSIDE the bordered editor shell, below
   *  the scrolling body. Used by the comment editor for the mention-
   *  suggestion pill so it visually sits inside the editor frame. */
  footer?: ReactNode;
}

export function EditorView({
  editor,
  toolbar,
  bodyOverlay,
  minHeight = 220,
  footer,
}: EditorViewProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    injectEditorStyles();
  }, []);

  if (!editor) return null;

  const overlayActive = bodyOverlay != null;

  return (
    <div
      className={`catalyst-description-editor-shell${isTranslating ? ' is-translating' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        background: 'var(--ds-surface, #FFFFFF)',
        boxShadow: '0 1px 2px rgba(9,30,66,0.08)',
        /* Caps the editor height; when content exceeds this, the body
           scrolls internally with the toolbar staying pinned in place. */
        maxHeight: '70vh',
        minHeight,
        overflow: 'hidden',
      }}
    >
      {toolbar}
      <div
        ref={bodyRef}
        className="catalyst-description-editor-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          /* Extra left padding reserves a gutter for the drag handle
             so content position is stable whether or not it's visible. */
          padding: '12px 16px 12px 28px',
          position: 'relative',
        }}
      >
        <div style={{ display: overlayActive ? 'none' : 'block' }}>
          <EditorContent editor={editor} />
          <BlockDragHandle editor={editor} containerRef={bodyRef} />
          <SelectionTranslate
            editor={editor}
            containerRef={bodyRef}
            onTranslatingChange={setIsTranslating}
          />
          <TableResizeBar editor={editor} containerRef={bodyRef} />
          <ColumnResizeHandles editor={editor} containerRef={bodyRef} />
          <TableToolbar editor={editor} containerRef={bodyRef} />
          <TableInteractions editor={editor} containerRef={bodyRef} />
        </div>
        {overlayActive && bodyOverlay}
      </div>
      {footer && !overlayActive ? (
        <div
          className="catalyst-description-editor-footer"
          style={{
            flexShrink: 0,
            padding: '6px 16px 8px 28px',
            background: 'var(--ds-surface, #FFFFFF)',
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

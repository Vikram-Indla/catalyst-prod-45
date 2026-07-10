/**
 * BlockDragHandle — Jira-style 6-dot grip that appears in the left
 * gutter of the editor when the user hovers over a top-level block
 * (paragraph, heading, list, table, panel, image, blockquote, code,
 * etc). Click + drag the grip to reorder the block within the document.
 *
 * Mounted as a sibling of <EditorContent /> inside the editor body
 * which is position:relative. On every mousemove over the editor DOM
 * we resolve the position under the cursor (view.posAtCoords), walk up
 * to depth 1 (the immediate child of the doc node = the draggable
 * block), and pin the handle to that block's first-line coords.
 *
 * Drag wiring: on dragstart we set a NodeSelection at the block's pos
 * and set view.dragging — that's the public ProseMirror API the
 * built-in drop handler uses to perform the move. We also have to put
 * SOMETHING on dataTransfer or browsers won't actually start a drag.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface HoverState {
  pos: number;
  top: number;
}

const HANDLE_WIDTH = 16;
const HANDLE_HEIGHT = 22;

export function BlockDragHandle({ editor, containerRef }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const editorDom = editor.view.dom as HTMLElement;

    const onMouseMove = (e: MouseEvent) => {
      // Cursor on the handle itself — keep the current anchor, don't
      // try to resolve a new block under the handle's own bounds.
      if (handleRef.current && handleRef.current.contains(e.target as Node)) {
        return;
      }

      const view = editor.view;
      let result = view.posAtCoords({ left: e.clientX, top: e.clientY });
      // If the cursor is in the left gutter (outside the editor DOM)
      // the primary hit-test returns null. Project the y onto the
      // editor's left edge so we anchor to the block on that row,
      // letting the user travel from a block into the handle without
      // the handle vanishing.
      if (!result) {
        const editorRect = editorDom.getBoundingClientRect();
        result = view.posAtCoords({
          left: editorRect.left + 1,
          top: e.clientY,
        });
      }
      if (!result) return;

      const docSize = view.state.doc.content.size;
      const safePos = Math.min(Math.max(result.pos, 0), docSize);
      const $pos = view.state.doc.resolve(safePos);
      if ($pos.depth === 0) return;

      let depth = $pos.depth;
      while (depth > 1) depth--;
      const blockPos = $pos.before(depth);
      const blockNode = view.state.doc.nodeAt(blockPos);
      if (!blockNode) return;

      const coords = view.coordsAtPos(blockPos + 1);
      const containerRect = container.getBoundingClientRect();
      const top = coords.top - containerRect.top + container.scrollTop;

      setHover((prev) =>
        prev && prev.pos === blockPos && Math.abs(prev.top - top) < 1
          ? prev
          : { pos: blockPos, top },
      );
    };

    const onMouseLeave = (e: MouseEvent) => {
      // Only clear when the cursor truly leaves the body. relatedTarget
      // inside the container (incl. handle, editor DOM, padding) keeps
      // the anchor alive so the user can travel to the grip.
      const related = e.relatedTarget as Node | null;
      if (related && container.contains(related)) return;
      setHover(null);
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [editor, containerRef]);

  if (!hover || !editor.isEditable) return null;

  return (
    <div
      ref={handleRef}
      draggable
      contentEditable={false}
      onDragStart={(e) => {
        const view = editor.view;
        const doc = view.state.doc;
        const blockNode = doc.nodeAt(hover.pos);
        const blockEnd = blockNode ? hover.pos + blockNode.nodeSize : hover.pos;
        const currentSel = view.state.selection;

        // If the user already has a non-empty selection that overlaps
        // the hovered block, expand both ends out to whole top-level
        // blocks and drag that whole range — so multi-block selections
        // travel together instead of only the top block moving.
        let dragSel;
        if (
          !currentSel.empty &&
          blockNode &&
          currentSel.from < blockEnd &&
          currentSel.to > hover.pos
        ) {
          const $from = doc.resolve(currentSel.from);
          const $to = doc.resolve(Math.max(currentSel.to - 1, currentSel.from));
          let fromDepth = $from.depth;
          while (fromDepth > 1) fromDepth--;
          let toDepth = $to.depth;
          while (toDepth > 1) toDepth--;
          const expandedFrom = fromDepth >= 1 ? $from.before(fromDepth) : 0;
          const expandedTo =
            toDepth >= 1 ? $to.after(toDepth) : doc.content.size;
          dragSel = TextSelection.create(doc, expandedFrom, expandedTo);
        } else {
          dragSel = NodeSelection.create(doc, hover.pos);
        }

        view.dispatch(view.state.tr.setSelection(dragSel));
        const slice = view.state.selection.content();
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', '');
          e.dataTransfer.effectAllowed = 'move';
        }
        view.dragging = { slice, move: true };
      }}
      onDragEnd={() => {
        editor.view.dragging = null;
      }}
      style={{
        position: 'absolute',
        top: hover.top,
        left: 6,
        width: HANDLE_WIDTH,
        height: HANDLE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        color: 'var(--ds-text-subtlest)',
        background: 'transparent',
        borderRadius: 3,
        userSelect: 'none',
        zIndex: 5,
        transition: 'background-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'var(--ds-background-neutral-subtle-hovered)';
        e.currentTarget.style.color = 'var(--ds-text-subtle)';
      }}
      onMouseLeaveCapture={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--ds-text-subtlest)';
      }}
      title="Drag to reorder"
      aria-label="Drag to reorder block"
    >
      <GripIcon />
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      width="8"
      height="14"
      viewBox="0 0 8 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1" />
      <circle cx="6" cy="2" r="1" />
      <circle cx="2" cy="7" r="1" />
      <circle cx="6" cy="7" r="1" />
      <circle cx="2" cy="12" r="1" />
      <circle cx="6" cy="12" r="1" />
    </svg>
  );
}

import type { Editor } from "@tiptap/react";
import { Icon } from "@catylast/icons";
import { useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";

import {
  CATYLAST_BLOCK_DATA_TYPE,
  DragHandlePluginKey,
} from "../extensions/DragHandle";
import * as styles from "../Editor.css";

type Position = { top: number; left: number };

/**
 * Renders the gutter drag handle. Listens to the editor for transactions and
 * positions itself next to the currently-hovered top-level block. Drag-start
 * captures the source block's range, the rest of the drop logic lives in
 * `DragHandleExtension`'s ProseMirror plugin.
 */
export function DragHandleOverlay({
  editor,
  containerRef,
}: {
  editor: Editor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<Position | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      if (!editor.isEditable) {
        setPos(null);
        return;
      }
      const state = DragHandlePluginKey.getState(editor.state);
      const blockPos = state?.hoveredBlockPos ?? null;
      const container = containerRef.current;
      if (blockPos === null || !container) {
        setPos(null);
        return;
      }
      try {
        const coords = editor.view.coordsAtPos(blockPos + 1);
        const containerRect = container.getBoundingClientRect();
        // Sit the grip just to the left of the block's text. Falls back to a
        // safe inset so the handle never escapes the editor's bordered area.
        const HANDLE_WIDTH = 22;
        const HANDLE_GAP = 6;
        const blockLeft = coords.left - containerRect.left;
        const desiredLeft = blockLeft - HANDLE_WIDTH - HANDLE_GAP;
        setPos({
          top: coords.top - containerRect.top + 2,
          left: Math.max(6, desiredLeft),
        });
      } catch {
        setPos(null);
      }
    };

    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor, containerRef]);

  const handleDragStart = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!editor) return;
    const state = DragHandlePluginKey.getState(editor.state);
    const blockPos = state?.hoveredBlockPos ?? null;
    if (blockPos === null) {
      e.preventDefault();
      return;
    }

    const doc = editor.state.doc;
    const $pos = doc.resolve(blockPos);
    const node = $pos.nodeAfter;
    if (!node) {
      e.preventDefault();
      return;
    }

    // For headings, sweep forward to include the whole section — every block
    // until the next heading of equal-or-higher level. Keeps the heading and
    // its content together when reordering, matching the section-reorder
    // affordance common in block-based editors.
    let sectionEnd = blockPos + node.nodeSize;
    if (node.type.name === "heading") {
      const startLevel = (node.attrs as { level?: number }).level ?? 1;
      let cursor = sectionEnd;
      while (cursor < doc.content.size) {
        const $next = doc.resolve(cursor);
        const nextNode = $next.nodeAfter;
        if (!nextNode) break;
        if (nextNode.type.name === "heading") {
          const nextLevel = (nextNode.attrs as { level?: number }).level ?? 1;
          if (nextLevel <= startLevel) break;
        }
        cursor += nextNode.nodeSize;
      }
      sectionEnd = cursor;
    }

    const range = { from: blockPos, to: sectionEnd };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(CATYLAST_BLOCK_DATA_TYPE, JSON.stringify(range));

    const dom = editor.view.nodeDOM(blockPos) as HTMLElement | null;
    if (dom) {
      e.dataTransfer.setDragImage(dom, 12, 12);
    }

    editor.view.dispatch(
      editor.state.tr.setMeta(DragHandlePluginKey, {
        draggingBlockPos: blockPos,
      }),
    );
  };

  const handleDragEnd = () => {
    if (!editor) return;
    editor.view.dispatch(
      editor.state.tr.setMeta(DragHandlePluginKey, {
        draggingBlockPos: null,
        dropTargetPos: null,
      }),
    );
  };

  if (!pos || !editor || !editor.isEditable) return null;

  return (
    <div
      ref={handleRef}
      className={styles.dragHandle}
      style={{ top: pos.top, left: pos.left }}
      contentEditable={false}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title="Drag to move block"
      aria-label="Drag handle"
    >
      <Icon name="grip-vertical" size={16} />
    </div>
  );
}

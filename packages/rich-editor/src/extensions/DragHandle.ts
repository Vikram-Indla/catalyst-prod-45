import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type DragHandlePluginState = {
  hoveredBlockPos: number | null;
  draggingBlockPos: number | null;
  dropTargetPos: number | null;
};

const initialState: DragHandlePluginState = {
  hoveredBlockPos: null,
  draggingBlockPos: null,
  dropTargetPos: null,
};

export const DragHandlePluginKey = new PluginKey<DragHandlePluginState>(
  "catylastDragHandle",
);

const BLOCK_DATA_TYPE = "application/x-catylast-block";

/**
 * Compute the drop target position from a drag-related event. Resolves the
 * doc position under the cursor, walks up to the nearest top-level block,
 * then returns either its start or end based on which half of the block the
 * cursor is in.
 */
function computeDropTarget(view: EditorView, ev: DragEvent): number | null {
  const dropPos = view.posAtCoords({
    left: ev.clientX,
    top: ev.clientY,
  });
  if (!dropPos) return null;
  let targetPos: number;
  try {
    const $drop = view.state.doc.resolve(dropPos.pos);
    if ($drop.depth === 0) {
      targetPos = dropPos.pos;
    } else {
      targetPos = $drop.before(1);
    }
  } catch {
    return null;
  }
  const targetNode = view.state.doc.nodeAt(targetPos);
  if (!targetNode) {
    // Cursor lies past the last block — drop at end of doc.
    return view.state.doc.content.size;
  }
  let coords;
  try {
    coords = view.coordsAtPos(targetPos + 1);
  } catch {
    return targetPos;
  }
  const midY = (coords.top + coords.bottom) / 2;
  const insertBefore = ev.clientY < midY;
  return insertBefore ? targetPos : targetPos + targetNode.nodeSize;
}

/**
 * Custom block-level drag-and-drop. Tracks the top-level block under the
 * mouse so a sibling overlay can render a grip handle in the gutter, then
 * handles drop events to move blocks via ProseMirror transactions.
 *
 * The drop logic is sibling-only in v0.1 — drops above or below another
 * block at the document root. Nest-into-block is deferred.
 */
export const DragHandleExtension = Extension.create({
  name: "catylastDragHandle",

  addProseMirrorPlugins() {
    return [
      new Plugin<DragHandlePluginState>({
        key: DragHandlePluginKey,

        state: {
          init: () => initialState,
          apply: (tr, value) => {
            const meta = tr.getMeta(DragHandlePluginKey) as
              | Partial<DragHandlePluginState>
              | undefined;
            if (meta) return { ...value, ...meta };
            return value;
          },
        },

        props: {
          decorations: (state) => {
            const pluginState = DragHandlePluginKey.getState(state);
            if (!pluginState || pluginState.dropTargetPos === null) {
              return DecorationSet.empty;
            }
            const dec = Decoration.widget(
              pluginState.dropTargetPos,
              () => {
                const div = document.createElement("div");
                div.className = "catylast-editor-drop-indicator";
                return div;
              },
              { side: -1, key: "catylast-drop-indicator" },
            );
            return DecorationSet.create(state.doc, [dec]);
          },

          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) return false;
              const ev = event as MouseEvent;
              const pos = view.posAtCoords({
                left: ev.clientX,
                top: ev.clientY,
              });
              if (!pos) return false;
              try {
                const $pos = view.state.doc.resolve(pos.pos);
                if ($pos.depth === 0) return false;
                const blockPos = $pos.before(1);
                const current = DragHandlePluginKey.getState(view.state);
                if (current && current.hoveredBlockPos === blockPos) {
                  return false;
                }
                view.dispatch(
                  view.state.tr.setMeta(DragHandlePluginKey, {
                    hoveredBlockPos: blockPos,
                  }),
                );
              } catch {
                // out of doc
              }
              return false;
            },

            // mouseleave intentionally not handled — the drag handle sits in
            // the gutter outside the editor DOM, so clearing hoveredBlockPos
            // when the cursor leaves the editor would unmount the handle just
            // as the user is reaching for it. The hovered block stays cached
            // until the cursor enters a different one.

            dragover: (view, event) => {
              const ev = event as DragEvent;
              const types = ev.dataTransfer
                ? Array.from(ev.dataTransfer.types)
                : [];
              if (!types.includes(BLOCK_DATA_TYPE)) return false;

              // Must preventDefault on EVERY dragover frame for the browser
              // to consider this a valid drop zone — otherwise drop never
              // fires.
              ev.preventDefault();
              if (ev.dataTransfer) {
                ev.dataTransfer.dropEffect = "move";
              }

              const dropTargetPos = computeDropTarget(view, ev);
              if (dropTargetPos === null) return true;

              const current = DragHandlePluginKey.getState(view.state);
              if (current && current.dropTargetPos !== dropTargetPos) {
                view.dispatch(
                  view.state.tr.setMeta(DragHandlePluginKey, { dropTargetPos }),
                );
              }
              return true;
            },

            dragleave: (view, event) => {
              const ev = event as DragEvent;
              // Only clear when leaving the editor entirely. dragleave fires
              // when crossing between child elements too — relatedTarget is
              // null when leaving the document, or outside the editor DOM.
              const related = ev.relatedTarget as Node | null;
              if (related && view.dom.contains(related)) return false;
              const current = DragHandlePluginKey.getState(view.state);
              if (current && current.dropTargetPos !== null) {
                view.dispatch(
                  view.state.tr.setMeta(DragHandlePluginKey, {
                    dropTargetPos: null,
                  }),
                );
              }
              return false;
            },

            drop: (view, event) => {
              const ev = event as DragEvent;
              const data = ev.dataTransfer?.getData(BLOCK_DATA_TYPE);
              if (!data) return false;

              let range: { from: number; to: number };
              try {
                range = JSON.parse(data) as { from: number; to: number };
              } catch {
                return false;
              }

              // Compute the drop target fresh from the drop event itself.
              // Don't trust plugin state — dragover may have lagged or never
              // fired over the final position.
              const fromState =
                DragHandlePluginKey.getState(view.state)?.dropTargetPos ?? null;
              const dropTargetPos =
                computeDropTarget(view, ev) ?? fromState;

              // Always reset plugin state so the indicator clears.
              view.dispatch(
                view.state.tr.setMeta(DragHandlePluginKey, {
                  draggingBlockPos: null,
                  dropTargetPos: null,
                }),
              );

              if (dropTargetPos === null) return false;

              const sourceFrom = range.from;
              const sourceTo = range.to;
              if (sourceTo <= sourceFrom) return false;

              // Stop the browser's default drop handling and ProseMirror's
              // built-in slice insert — we own this drop.
              ev.preventDefault();
              ev.stopPropagation();

              // Don't move if the drop target sits inside the source range.
              if (dropTargetPos > sourceFrom && dropTargetPos < sourceTo) {
                return true;
              }
              // Don't move if dropping right where it already is.
              if (
                dropTargetPos === sourceFrom ||
                dropTargetPos === sourceTo
              ) {
                return true;
              }

              // Slice-based move so multi-block ranges (e.g. a heading plus
              // its section content) are kept together.
              const sourceSlice = view.state.doc.slice(
                sourceFrom,
                sourceTo,
                false,
              );
              if (sourceSlice.content.size === 0) return true;

              const tr = view.state.tr;
              tr.delete(sourceFrom, sourceTo);
              const adjustedInsertPos =
                dropTargetPos > sourceFrom
                  ? dropTargetPos - (sourceTo - sourceFrom)
                  : dropTargetPos;
              tr.insert(adjustedInsertPos, sourceSlice.content);
              view.dispatch(tr);
              return true;
            },
          },
        },
      }),
    ];
  },
});

export const CATYLAST_BLOCK_DATA_TYPE = BLOCK_DATA_TYPE;

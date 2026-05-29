/**
 * SelectionDragCursor — small Tiptap extension that turns the cursor
 * into a grab hand whenever the user hovers over an active text
 * selection. Discoverability layer for ProseMirror's built-in
 * drag-selected-text behaviour (which works natively but is invisible
 * unless the user already knows the affordance exists).
 *
 * The actual drag + drop is handled by ProseMirror itself:
 *   1. User selects text → TextSelection
 *   2. Cursor over the selection turns to "grab" (this plugin)
 *   3. User clicks + drags → PM's dragstart sets view.dragging
 *   4. Drop cursor (existing catalyst-drop-line) shows the target
 *   5. PM's drop handler moves the text
 *
 * No drag wiring here — that would duplicate PM's built-in path.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export const SelectionDragCursor = Extension.create({
  name: 'selectionDragCursor',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('selectionDragCursor'),
        view(editorView) {
          const dom = editorView.dom as HTMLElement;
          let isOverSelection = false;

          const setGrab = (on: boolean) => {
            if (on === isOverSelection) return;
            isOverSelection = on;
            // Empty string restores whatever cursor CSS / other PM
            // plugins (table column-resize etc.) have set.
            dom.style.cursor = on ? 'grab' : '';
          };

          const onMouseMove = (e: MouseEvent) => {
            const sel = editorView.state.selection;
            if (sel.empty || !(sel instanceof TextSelection)) {
              setGrab(false);
              return;
            }
            const hit = editorView.posAtCoords({
              left: e.clientX,
              top: e.clientY,
            });
            if (!hit) {
              setGrab(false);
              return;
            }
            const inside = hit.pos >= sel.from && hit.pos <= sel.to;
            setGrab(inside);
          };

          const onMouseLeave = () => setGrab(false);
          const onMouseDown = () => {
            // Becomes "grabbing" mid-drag so the cursor follows the
            // OS drag-state visually.
            if (isOverSelection) dom.style.cursor = 'grabbing';
          };
          const onDragEnd = () => {
            dom.style.cursor = '';
            isOverSelection = false;
          };

          dom.addEventListener('mousemove', onMouseMove);
          dom.addEventListener('mouseleave', onMouseLeave);
          dom.addEventListener('mousedown', onMouseDown);
          dom.addEventListener('dragend', onDragEnd);
          dom.addEventListener('drop', onDragEnd);

          return {
            destroy() {
              dom.removeEventListener('mousemove', onMouseMove);
              dom.removeEventListener('mouseleave', onMouseLeave);
              dom.removeEventListener('mousedown', onMouseDown);
              dom.removeEventListener('dragend', onDragEnd);
              dom.removeEventListener('drop', onDragEnd);
              dom.style.cursor = '';
            },
          };
        },
      }),
    ];
  },
});

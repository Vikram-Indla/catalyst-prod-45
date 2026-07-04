/**
 * marqueeSelection — Notion-style multi-block selection for the Wiki editor
 * (CAT-DOCS-NOTION-20260704-001 gap-closure P0c).
 *
 * Drag starting OUTSIDE the contenteditable (the page margins around
 * .bn-editor) draws a marquee; every top-level block intersecting it
 * joins one cross-block TextSelection. BlockNote's core machinery
 * (MultipleNodeSelection drag, formatting toolbar) already operates on
 * such selections, so reorder-together and format-together come free.
 *
 * Starting the drag outside the editable surface means we never fight
 * ProseMirror's native text selection — plain clicks and in-text drags
 * are untouched (zero regression surface).
 */
import type { EditorView } from 'prosemirror-view';
import { TextSelection } from 'prosemirror-state';

const DRAG_THRESHOLD_PX = 5;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function intersects(a: Rect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Wire marquee selection onto a container that wraps the BlockNote view.
 * Returns a cleanup function.
 */
export function attachMarqueeSelection(
  container: HTMLElement,
  getView: () => EditorView | null,
): () => void {
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let armed = false;
  let overlay: HTMLDivElement | null = null;

  const ensureOverlay = (): HTMLDivElement => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'fixed',
      zIndex: '30',
      pointerEvents: 'none',
      border: '1px solid var(--ds-border-focused)',
      background: 'var(--ds-background-selected)',
      opacity: '0.45',
      borderRadius: '2px',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(overlay);
    return overlay;
  };

  const removeOverlay = () => {
    overlay?.remove();
    overlay = null;
  };

  const selectIntersecting = (rect: Rect) => {
    const view = getView();
    if (!view) return;
    const doc = view.state.doc;
    let from = -1;
    let to = -1;
    // Walk top-level children; use their DOM rects for hit testing.
    doc.forEach((node, offset) => {
      const dom = view.nodeDOM(offset);
      if (!(dom instanceof HTMLElement)) return;
      const r = dom.getBoundingClientRect();
      if (!intersects(rect, r)) return;
      const start = offset + 1;
      const end = offset + node.nodeSize - 1;
      if (from === -1) from = start;
      to = end;
    });
    if (from === -1 || to <= from) return;
    const tr = view.state.tr.setSelection(
      TextSelection.create(doc, Math.max(1, from), Math.min(doc.content.size, to)),
    );
    view.dispatch(tr);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!armed) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD_PX && Math.abs(e.clientY - startY) < DRAG_THRESHOLD_PX) {
        return;
      }
      dragging = true;
    }
    e.preventDefault();
    const rect: Rect = {
      left: Math.min(startX, e.clientX),
      top: Math.min(startY, e.clientY),
      right: Math.max(startX, e.clientX),
      bottom: Math.max(startY, e.clientY),
    };
    const el = ensureOverlay();
    Object.assign(el.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.right - rect.left}px`,
      height: `${rect.bottom - rect.top}px`,
    });
    selectIntersecting(rect);
  };

  const onMouseUp = () => {
    if (dragging) {
      // Hand focus to the editor so keyboard/toolbar act on the selection.
      getView()?.focus();
    }
    armed = false;
    dragging = false;
    removeOverlay();
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Only from empty space: outside the editable surface and outside
    // any interactive UI (menus, side handles, buttons).
    if (target.closest('.bn-editor') || target.closest('button, a, input, [role="menu"], [role="dialog"]')) {
      return;
    }
    armed = true;
    dragging = false;
    startX = e.clientX;
    startY = e.clientY;
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
  };

  container.addEventListener('mousedown', onMouseDown);
  return () => {
    container.removeEventListener('mousedown', onMouseDown);
    onMouseUp();
  };
}

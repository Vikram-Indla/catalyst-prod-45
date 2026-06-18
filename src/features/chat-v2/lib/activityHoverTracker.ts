/**
 * activityHoverTracker — global cursor → row hit-tester.
 *
 * Replaces CSS :hover for the Activity feed because CSS :hover has a
 * documented browser quirk: when an element is freshly mounted under a
 * stationary cursor (e.g. after route navigation back to /chat), the
 * rendering engine doesn't re-evaluate :hover until the cursor moves.
 * This presents as "hover doesn't work after I navigate back" — and the
 * "open a new Chrome tab and come back" workaround only fixes it because
 * window focus forces the browser to re-hit-test.
 *
 * This module:
 *  1. Tracks the cursor position globally on pointermove (one listener
 *     for the whole app — cheap).
 *  2. Hit-tests via document.elementFromPoint(x, y) and toggles a
 *     data-cv2-cursor-on attribute on the matching .cv2-activity-row.
 *  3. Exposes refreshActivityHover() so the Activity panel can force a
 *     re-hit-test on mount, on window focus, and on visibilitychange —
 *     restoring the hovered state without requiring the user to move the
 *     cursor first.
 *
 * The CSS in tokens.css references [data-cv2-cursor-on="true"] (not
 * :hover) so this tracker is the SOLE source of truth for which row is
 * hovered. Bulletproof across route transitions.
 */

let lastX = -1;
let lastY = -1;
let currentHovered: HTMLElement | null = null;
let installed = false;

const HOVERED_ATTR = 'data-cv2-cursor-on';
const ROW_SELECTOR = '.cv2-activity-row';

function clearHovered() {
  if (currentHovered) {
    currentHovered.removeAttribute(HOVERED_ATTR);
    currentHovered = null;
  }
}

function setHovered(row: HTMLElement) {
  if (currentHovered === row) return;
  clearHovered();
  row.setAttribute(HOVERED_ATTR, 'true');
  currentHovered = row;
}

/**
 * Hit-test the last known cursor position and update the hovered row.
 * Safe to call any time — short-circuits if no cursor position is known.
 */
export function refreshActivityHover(): void {
  if (lastX < 0 || lastY < 0) return;
  // Element under the cursor might be the row itself, a descendant span,
  // an avatar, the right-info strip, etc. Walk up to the row.
  const target = document.elementFromPoint(lastX, lastY) as Element | null;
  const row = target?.closest(ROW_SELECTOR) as HTMLElement | null;
  if (row) setHovered(row);
  else clearHovered();
}

/** Install global listeners once. Idempotent. */
export function installActivityHoverTracker(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const onMove = (e: PointerEvent) => {
    lastX = e.clientX;
    lastY = e.clientY;
    refreshActivityHover();
  };
  // Capture phase so we still get events even if some descendant calls
  // stopPropagation. Passive — we don't preventDefault.
  document.addEventListener('pointermove', onMove, { capture: true, passive: true });

  // When the user leaves the document entirely, drop the hovered state.
  document.addEventListener('pointerleave', clearHovered);
  // No removeEventListener — this lives for the lifetime of the app.
}

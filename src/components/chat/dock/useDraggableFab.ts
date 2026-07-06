import { useCallback, useEffect, useRef, useState } from 'react';

const FAB_SIZE = 77;
const EDGE = 24;
// Idle window before a displaced FAB returns to its home corner. The timer is
// paused while the pointer is over the FAB and reset on every interaction, so a
// return only fires after 30s of no engagement — never mid-use (Option B).
const RETURN_MS = 30 * 1000;
const SNAP_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// Minimum pixels of movement before a pointer interaction is classified as a drag.
// 8px chosen to tolerate Mac trackpad finger-settle micro-movement without false positives.
const DRAG_THRESHOLD = 8;

export { SNAP_EASING };

function defaultPos() {
  return {
    x: window.innerWidth - FAB_SIZE - EDGE,
    y: window.innerHeight - FAB_SIZE - EDGE,
  };
}

export function useDraggableFab() {
  // Always start at the home corner. The displaced position is intentionally
  // NOT persisted — every refresh returns the FAB to bottom-right (2026-07-06).
  const [pos, setPos] = useState(defaultPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const dragOrigin = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const livePos = useRef(pos);
  const didMove = useRef(false);
  // True while the FAB sits away from its home corner (awaiting an idle return).
  const displaced = useRef(false);
  // True while the pointer is over the FAB — pauses the idle-return countdown.
  const hovering = useRef(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    livePos.current = pos;
  }, [pos]);

  // (Re)start the idle countdown. No-ops while the pointer is engaged with the
  // FAB, so a deliberate drag is never yanked back mid-use — it returns only
  // after RETURN_MS of no interaction.
  const scheduleReturn = useCallback(() => {
    clearTimeout(returnTimer.current);
    if (hovering.current) return;
    returnTimer.current = setTimeout(() => {
      setIsSnapping(true);
      setPos(defaultPos());
      displaced.current = false;
      setTimeout(() => setIsSnapping(false), 500);
    }, RETURN_MS);
  }, []);

  useEffect(() => () => clearTimeout(returnTimer.current), []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    didMove.current = false;
    clearTimeout(returnTimer.current); // interaction resets the idle countdown
    dragOrigin.current = {
      px: e.clientX, py: e.clientY,
      ox: livePos.current.x, oy: livePos.current.y,
    };
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragOrigin.current.px;
    const dy = e.clientY - dragOrigin.current.py;
    if (!didMove.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) didMove.current = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - FAB_SIZE, dragOrigin.current.ox + dx)),
      y: Math.max(0, Math.min(window.innerHeight - FAB_SIZE, dragOrigin.current.oy + dy)),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (didMove.current) {
      displaced.current = true;
      scheduleReturn(); // paused if still hovered; resumes on pointer leave
    }
  }, [scheduleReturn]);

  // Hover pauses the idle countdown; leaving resumes it (if displaced).
  const onPointerEnter = useCallback(() => {
    hovering.current = true;
    clearTimeout(returnTimer.current);
  }, []);

  const onPointerLeave = useCallback(() => {
    hovering.current = false;
    if (displaced.current) scheduleReturn();
  }, [scheduleReturn]);

  // didMove exposed so ChatDock can guard onClick without a capture-phase suppression.
  // (capture-phase stopPropagation in React 18 also kills the bubble-phase onClick on
  // the same element — the original bug causing FAB clicks to be silently dropped.)
  return {
    pos,
    isDragging,
    isSnapping,
    didMove,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerEnter, onPointerLeave },
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

const FAB_SIZE = 77;
const EDGE = 24;
const RETURN_MS = 5 * 60 * 1000;
const SNAP_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const STORAGE_KEY = 'catalyst-fab-position';

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

function loadPos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPos();
    const pos = JSON.parse(saved);
    const isValid =
      typeof pos.x === 'number' &&
      typeof pos.y === 'number' &&
      pos.x >= 0 &&
      pos.x <= window.innerWidth - FAB_SIZE &&
      pos.y >= 0 &&
      pos.y <= window.innerHeight - FAB_SIZE;
    if (isValid) return pos;
  } catch {
    // ignore
  }
  return defaultPos();
}

function savePos(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

export function useDraggableFab() {
  const [pos, setPos] = useState(loadPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const dragOrigin = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const livePos = useRef(pos);
  const didMove = useRef(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    livePos.current = pos;
    savePos(pos);
  }, [pos]);

  const scheduleReturn = useCallback(() => {
    clearTimeout(returnTimer.current);
    returnTimer.current = setTimeout(() => {
      setIsSnapping(true);
      setPos(defaultPos());
      setTimeout(() => setIsSnapping(false), 500);
    }, RETURN_MS);
  }, []);

  useEffect(() => () => clearTimeout(returnTimer.current), []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    didMove.current = false;
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
    if (didMove.current) scheduleReturn();
  }, [scheduleReturn]);

  // didMove exposed so ChatDock can guard onClick without a capture-phase suppression.
  // (capture-phase stopPropagation in React 18 also kills the bubble-phase onClick on
  // the same element — the original bug causing FAB clicks to be silently dropped.)
  return { pos, isDragging, isSnapping, didMove, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}

import { useCallback, useEffect, useRef, useState } from 'react';

const FAB_SIZE = 56;
const EDGE = 24;
const RETURN_MS = 2 * 60 * 1000;
const SNAP_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export { SNAP_EASING };

function defaultPos() {
  return {
    x: window.innerWidth - FAB_SIZE - EDGE,
    y: window.innerHeight - FAB_SIZE - EDGE,
  };
}

function snapCorner(x: number, y: number) {
  const right = x + FAB_SIZE / 2 > window.innerWidth / 2;
  const bottom = y + FAB_SIZE / 2 > window.innerHeight / 2;
  return {
    x: right ? window.innerWidth - FAB_SIZE - EDGE : EDGE,
    y: bottom ? window.innerHeight - FAB_SIZE - EDGE : EDGE,
  };
}

export function useDraggableFab() {
  const [pos, setPos] = useState(defaultPos);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const dragOrigin = useRef({ px: 0, py: 0, ox: 0, oy: 0 });
  const livePos = useRef(pos);
  const didMove = useRef(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { livePos.current = pos; }, [pos]);

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
    if (!didMove.current && Math.hypot(dx, dy) > 4) didMove.current = true;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - FAB_SIZE, dragOrigin.current.ox + dx)),
      y: Math.max(0, Math.min(window.innerHeight - FAB_SIZE, dragOrigin.current.oy + dy)),
    });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    const moved = didMove.current;
    if (moved) {
      setIsSnapping(true);
      setPos(snapCorner(livePos.current.x, livePos.current.y));
      setTimeout(() => setIsSnapping(false), 500);
      scheduleReturn();
    }
    return moved; // caller can use this to suppress click
  }, [scheduleReturn]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // suppress click if pointer moved (drag release)
    if (didMove.current) e.stopPropagation();
  }, []);

  return { pos, isDragging, isSnapping, handlers: { onPointerDown, onPointerMove, onPointerUp, onClickCapture } };
}

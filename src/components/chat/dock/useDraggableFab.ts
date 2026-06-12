/**
 * useDraggableFab — corner-snapping draggable FAB hook.
 *
 * - Drag to any screen quadrant → snaps to nearest corner on release
 * - After 2 minutes at a non-default corner → springs back to bottom-right
 * - Exposes dragVelocity for directional stretch/deform visual on the icon
 * - Click (no drag) passes through to the native onClick handler unchanged
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

export type FabCorner = 'br' | 'bl' | 'tr' | 'tl';

const MARGIN = 24;
const FAB_SIZE = 56;
const AUTO_RETURN_MS = 120_000; // 2 minutes
const DEFAULT_CORNER: FabCorner = 'br';
const DRAG_THRESHOLD_PX = 5;
const SPRING = 'top 0.5s cubic-bezier(0.34,1.56,0.64,1), left 0.5s cubic-bezier(0.34,1.56,0.64,1)';

function cornerXY(corner: FabCorner): [number, number] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  switch (corner) {
    case 'br': return [vw - MARGIN - FAB_SIZE, vh - MARGIN - FAB_SIZE];
    case 'bl': return [MARGIN,                 vh - MARGIN - FAB_SIZE];
    case 'tr': return [vw - MARGIN - FAB_SIZE, MARGIN];
    case 'tl': return [MARGIN,                 MARGIN];
  }
}

function nearestCorner(x: number, y: number): FabCorner {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + FAB_SIZE / 2;
  const cy = y + FAB_SIZE / 2;
  if (cx < vw / 2 && cy < vh / 2) return 'tl';
  if (cx >= vw / 2 && cy < vh / 2) return 'tr';
  if (cx < vw / 2) return 'bl';
  return 'br';
}

export interface DraggableFabResult {
  fabStyle: CSSProperties;
  isDragging: boolean;
  /** Frame-to-frame pointer delta while dragging — used for directional deformation */
  dragVelocity: [number, number];
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}

export function useDraggableFab(): DraggableFabResult {
  const [xy, setXY] = useState<[number, number]>(() => cornerXY(DEFAULT_CORNER));
  const [corner, setCorner] = useState<FabCorner>(DEFAULT_CORNER);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVelocity, setDragVelocity] = useState<[number, number]>([0, 0]);

  // Ref mirror so onPointerUp can read latest xy without stale closure
  const xyRef = useRef<[number, number]>(xy);
  useEffect(() => { xyRef.current = xy; }, [xy]);

  const cornerRef = useRef<FabCorner>(corner);
  useEffect(() => { cornerRef.current = corner; }, [corner]);

  const dragRef = useRef<{
    startPx: number; startPy: number;
    startFx: number; startFy: number;
    moved: boolean;
  } | null>(null);

  const prevPointer = useRef<[number, number]>([0, 0]);
  const autoReturnRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (autoReturnRef.current) {
      clearTimeout(autoReturnRef.current);
      autoReturnRef.current = null;
    }
  }, []);

  // Keep FAB glued to its corner when the viewport resizes
  useEffect(() => {
    const onResize = () => {
      if (!dragRef.current?.moved) {
        setXY(cornerXY(cornerRef.current));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    // Only primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startPx: e.clientX, startPy: e.clientY,
      startFx: rect.left,  startFy: rect.top,
      moved: false,
    };
    prevPointer.current = [e.clientX, e.clientY];
    clearTimer();
  }, [clearTimer]);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const dr = dragRef.current;
    if (!dr) return;

    const dx = e.clientX - dr.startPx;
    const dy = e.clientY - dr.startPy;
    const vdx = e.clientX - prevPointer.current[0];
    const vdy = e.clientY - prevPointer.current[1];
    prevPointer.current = [e.clientX, e.clientY];

    // Threshold so small taps don't accidentally start dragging
    if (!dr.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!dr.moved) { dr.moved = true; setIsDragging(true); }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nx = Math.max(0, Math.min(vw - FAB_SIZE, dr.startFx + dx));
    const ny = Math.max(0, Math.min(vh - FAB_SIZE, dr.startFy + dy));
    setXY([nx, ny]);
    setDragVelocity([vdx, vdy]);
  }, []);

  const onPointerUp = useCallback((_e: ReactPointerEvent<HTMLButtonElement>) => {
    const dr = dragRef.current;
    dragRef.current = null;

    if (!dr?.moved) {
      // Pure click — clear drag state, native onClick fires normally
      setIsDragging(false);
      setDragVelocity([0, 0]);
      return;
    }

    setIsDragging(false);
    setDragVelocity([0, 0]);

    // Snap to nearest corner (spring animation via CSS transition)
    const [cx, cy] = xyRef.current;
    const snapped = nearestCorner(cx, cy);
    setCorner(snapped);
    setXY(cornerXY(snapped));

    // Schedule auto-return only when not already at default corner
    if (snapped !== DEFAULT_CORNER) {
      autoReturnRef.current = setTimeout(() => {
        setCorner(DEFAULT_CORNER);
        setXY(cornerXY(DEFAULT_CORNER));
      }, AUTO_RETURN_MS);
    }
  }, []);

  const fabStyle: CSSProperties = {
    position: 'fixed',
    top: xy[1],
    left: xy[0],
    right: 'auto',
    bottom: 'auto',
    transition: isDragging ? 'none' : SPRING,
    touchAction: 'none',
  };

  return { fabStyle, isDragging, dragVelocity, onPointerDown, onPointerMove, onPointerUp };
}

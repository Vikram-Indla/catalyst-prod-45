import { useCallback, useRef, useState } from 'react';

export const DEFAULT_W = 460;
export const DEFAULT_H = 720;
const MIN_W = 320;
const MIN_H = 400;

interface DockState {
  x: number; y: number;
  w: number; h: number;
}

type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw';

interface StartSnapshot {
  mx: number; my: number;
  x: number;  y: number;
  w: number;  h: number;
  corner?: ResizeCorner;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function resolveInitial(panel: HTMLElement): DockState {
  const r = panel.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/**
 * Combined drag-to-move + corner-resize hook for the chat dock.
 *
 * Usage:
 *   const { dockStyle, dragHandleProps, resizeHandleProps, resetLayout } = useDockInteraction();
 *
 *   <div className="cc-dock" style={dockStyle}>
 *     <div {...dragHandleProps}>   // header
 *     <div {...resizeHandleProps('nw')} className="cc-dock__resize nw" />
 *     <div {...resizeHandleProps('ne')} className="cc-dock__resize ne" />
 *     <div {...resizeHandleProps('sw')} className="cc-dock__resize sw" />
 *     <div {...resizeHandleProps('se')} className="cc-dock__resize se" />
 *   </div>
 */
export function useDockInteraction() {
  const [state, setState] = useState<DockState | null>(null);
  const active = useRef(false);
  const snap = useRef<StartSnapshot>({ mx: 0, my: 0, x: 0, y: 0, w: DEFAULT_W, h: DEFAULT_H });

  // ── Drag-to-move (header) ────────────────────────────────────────────────

  const onDragDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as Element).closest('button,a,input,[role="tab"],[role="button"]')) return;
    const panel = (e.currentTarget as HTMLElement).closest<HTMLElement>('.cc-dock');
    if (!panel) return;
    const s = resolveInitial(panel);
    active.current = true;
    snap.current = { mx: e.clientX, my: e.clientY, ...s };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    const { mx, my, x, y, w, h } = snap.current;
    const nx = clamp(x + (e.clientX - mx), 0, window.innerWidth - w);
    const ny = clamp(y + (e.clientY - my), 0, window.innerHeight - h);
    setState(s => ({ w: s?.w ?? w, h: s?.h ?? h, x: nx, y: ny }));
  }, []);

  const onDragUp = useCallback(() => { active.current = false; }, []);

  // ── Corner resize ────────────────────────────────────────────────────────

  const onResizeDown = useCallback((corner: ResizeCorner) => (e: React.PointerEvent<HTMLElement>) => {
    const panel = (e.currentTarget as HTMLElement).closest<HTMLElement>('.cc-dock');
    if (!panel) return;
    const s = resolveInitial(panel);
    active.current = true;
    snap.current = { mx: e.clientX, my: e.clientY, ...s, corner };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!active.current || !snap.current.corner) return;
    const { mx, my, x, y, w, h, corner } = snap.current;
    const dx = e.clientX - mx;
    const dy = e.clientY - my;

    let nx = x, ny = y, nw = w, nh = h;

    if (corner === 'se') { nw = w + dx; nh = h + dy; }
    if (corner === 'sw') { nw = w - dx; nx = x + dx; nh = h + dy; }
    if (corner === 'ne') { nw = w + dx; nh = h - dy; ny = y + dy; }
    if (corner === 'nw') { nw = w - dx; nx = x + dx; nh = h - dy; ny = y + dy; }

    // Clamp size
    const maxW = window.innerWidth - nx;
    const maxH = window.innerHeight - ny;
    nw = clamp(nw, MIN_W, maxW);
    nh = clamp(nh, MIN_H, maxH);
    // Re-clamp pos after size clamp
    nx = clamp(nx, 0, window.innerWidth - nw);
    ny = clamp(ny, 0, window.innerHeight - nh);

    setState({ x: nx, y: ny, w: nw, h: nh });
  }, []);

  const onResizeUp = useCallback(() => { active.current = false; }, []);

  // ── Reset ────────────────────────────────────────────────────────────────

  const resetLayout = useCallback(() => { setState(null); }, []);

  // ── Styles ───────────────────────────────────────────────────────────────

  const dockStyle: React.CSSProperties = state
    ? { left: state.x, top: state.y, right: 'auto', bottom: 'auto', width: state.w, height: state.h }
    : {};

  const dragHandleProps = { onPointerDown: onDragDown, onPointerMove: onDragMove, onPointerUp: onDragUp };

  const resizeHandleProps = (corner: ResizeCorner) => ({
    onPointerDown: onResizeDown(corner),
    onPointerMove: onResizeMove,
    onPointerUp: onResizeUp,
    onDoubleClick: resetLayout,
  });

  return { dockStyle, dragHandleProps, resizeHandleProps, resetLayout };
}

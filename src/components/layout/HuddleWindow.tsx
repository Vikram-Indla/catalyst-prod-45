// src/components/layout/HuddleWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore } from '@/store/huddleStore';

/**
 * HuddleWindow — large draggable + resizable Slack-style huddle surface.
 * Replaces the FAB + standalone screen window as THE call UI while open.
 * - windowState 'open'      : floating window (this component).
 * - windowState 'minimized' : hidden here; the compact HuddleFab shows instead.
 * - windowState 'maximized' : full-viewport.
 * Mounted at app-shell scope (survives route changes), like the FAB.
 */
const POS_KEY = 'huddle-window-pos';
const SIZE_KEY = 'huddle-window-size';
type Pos = { top: number; left: number };
type Size = { w: number; h: number };
function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch { /* ignore */ }
  return fallback;
}

export function HuddleWindow() {
  const active = useHuddleStore((s) => s.active);
  const windowState = useHuddleStore((s) => s.windowState);
  const setWindowState = useHuddleStore((s) => s.setWindowState);

  const [pos, setPos] = useState<Pos>(() => load(POS_KEY, { top: 72, left: 120 }));
  const [size] = useState<Size>(() => load(SIZE_KEY, { w: 900, h: 560 }));
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // persist size on resize (normal mode only)
  useEffect(() => {
    if (windowState !== 'open') return;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      try { localStorage.setItem(SIZE_KEY, JSON.stringify({ w: el.offsetWidth, h: el.offsetHeight })); } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [windowState]);

  // drag via the title bar
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; const el = wrapRef.current;
    if (!d || !el || e.buttons === 0) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, d.ox + dx))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, d.oy + dy))}px`;
  }, []);
  const endDrag = useCallback(() => {
    const d = dragRef.current; const el = wrapRef.current; dragRef.current = null;
    if (!d || !d.moved || !el) return;
    const r = el.getBoundingClientRect();
    const next = { top: Math.max(8, r.top), left: Math.max(8, r.left) };
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  if (!active || windowState === 'minimized') return null;
  const maximized = windowState === 'maximized';

  const frameStyle: React.CSSProperties = maximized
    ? { position: 'fixed', inset: 16, zIndex: 120 }
    : { position: 'fixed', top: pos.top, left: pos.left, width: size.w, height: size.h, minWidth: 560, minHeight: 380, resize: 'both', zIndex: 120 };

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label={`Huddle with ${active.conversationName}`}
      style={{
        ...frameStyle,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'var(--ds-surface, #FFFFFF)',
        borderRadius: maximized ? 12 : 14,
        border: '1px solid var(--ds-border, #DFE1E6)',
        boxShadow: '0 24px 64px rgba(9,30,66,.34)',
      }}
    >
      {/* title bar */}
      <div
        onPointerDown={maximized ? undefined : onPointerDown}
        onPointerMove={maximized ? undefined : onPointerMove}
        onPointerUp={maximized ? undefined : endDrag}
        onPointerCancel={maximized ? undefined : endDrag}
        style={{
          flex: '0 0 auto', height: 44, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', cursor: maximized ? 'default' : 'grab', touchAction: 'none',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface-overlay, #FFFFFF)',
        }}
      >
        <span aria-hidden>🎧</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Huddle with {active.conversationName}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          <button type="button" data-huddle-btn title="Minimize" onClick={() => setWindowState('minimized')} style={winBtn}>—</button>
          {maximized
            ? <button type="button" data-huddle-btn title="Restore" onClick={() => setWindowState('open')} style={winBtn}>❐</button>
            : <button type="button" data-huddle-btn title="Maximize" onClick={() => setWindowState('maximized')} style={winBtn}>▢</button>}
        </span>
      </div>

      {/* body: stage (Task 7) | thread (Task 8) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div data-huddle-stage style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          {/* stage content added in Task 7 */}
        </div>
        {/* thread panel added in Task 8 */}
      </div>

      {/* control bar added in Task 9 */}
    </div>
  );
}

const winBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-surface-sunken, #F7F8F9)', color: 'var(--ds-text, #172B4D)', fontSize: 14,
};

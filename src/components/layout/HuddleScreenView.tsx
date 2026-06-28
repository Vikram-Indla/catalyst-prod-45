// src/components/layout/HuddleScreenView.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore, getHuddleRemoteScreen, getHuddleLocalScreen } from '@/store/huddleStore';

/**
 * HuddleScreenView — the shared-screen window during a huddle.
 * Three modes (store.screenWindow):
 *  - 'normal'    : floating, click-drag (title bar), resizable window.
 *  - 'minimized' : hidden here; a restore chip appears in the call FAB.
 *  - 'maximized' : full-page modal.
 * Shows the REMOTE screen (priority) or a muted preview of your own share.
 */

const POS_KEY = 'huddle-screen-pos';
const SIZE_KEY = 'huddle-screen-size';
type Pos = { top: number; left: number };
type Size = { w: number; h: number };

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch { /* ignore */ }
  return fallback;
}

export function HuddleScreenView() {
  const active = useHuddleStore((s) => s.active);
  const mode = useHuddleStore((s) => s.screenWindow);
  const setMode = useHuddleStore((s) => s.setScreenWindow);
  const stopScreen = useHuddleStore((s) => s.stopScreen);

  const remoteSharing = !!active?.remoteSharing;
  const localSharing = !!active?.screenSharing;
  const showRemote = remoteSharing;
  const visible = remoteSharing || localSharing;

  const [pos, setPos] = useState<Pos>(() => load(POS_KEY, { top: 120, left: 24 }));
  const [size, setSize] = useState<Size>(() => load(SIZE_KEY, { w: 460, h: 300 }));
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // bind the right stream to the <video>
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const stream = showRemote ? getHuddleRemoteScreen() : localSharing ? getHuddleLocalScreen() : null;
    v.srcObject = stream ?? null;
    if (stream) void v.play().catch(() => { /* autoplay guard */ });
  }, [showRemote, localSharing, remoteSharing, mode]);

  // persist size when the user resizes the normal window
  useEffect(() => {
    if (mode !== 'normal') return;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const next = { w: el.offsetWidth, h: el.offsetHeight };
      try { localStorage.setItem(SIZE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  // ---- click-drag (title bar only, left button only) ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;                                   // left click only
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; const el = wrapRef.current;
    if (!d || !el || e.buttons === 0) return;                     // must hold the button
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

  if (!visible || mode === 'minimized') return null;

  const title = showRemote ? `${active?.conversationName ?? 'Peer'} — screen` : 'You are sharing your screen';
  const maximized = mode === 'maximized';

  const videoEl = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block', minHeight: 0 }} // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
    />
  );

  const titleBar = (
    <div
      onPointerDown={maximized ? undefined : onPointerDown}
      onPointerMove={maximized ? undefined : onPointerMove}
      onPointerUp={maximized ? undefined : endDrag}
      onPointerCancel={maximized ? undefined : endDrag}
      style={{
        flex: '0 0 auto', height: 36, display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 10px', cursor: maximized ? 'default' : 'grab', touchAction: 'none',
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        borderBottom: '1px solid var(--ds-border, #DFE1E6)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-icon-success, #22A06B)', flex: '0 0 auto' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {localSharing && (
          <button type="button" data-huddle-btn onClick={() => { void stopScreen(); }}
            style={{ border: 'none', cursor: 'pointer', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600,
              background: 'var(--ds-background-danger-bold, #C9372C)', color: 'var(--ds-surface, #FFFFFF)', marginRight: 4 }}>
            Stop
          </button>
        )}
        <button type="button" data-huddle-btn title="Minimize" onClick={() => setMode('minimized')} style={winBtn}><MinIcon /></button>
        {maximized
          ? <button type="button" data-huddle-btn title="Restore" onClick={() => setMode('normal')} style={winBtn}><RestoreIcon /></button>
          : <button type="button" data-huddle-btn title="Maximize" onClick={() => setMode('maximized')} style={winBtn}><MaxIcon /></button>}
      </span>
    </div>
  );

  if (maximized) {
    return (
      <div role="dialog" aria-label="Shared screen (maximized)"
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,30,66,.75)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
          display: 'flex', flexDirection: 'column', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
          background: '#000', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}> // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
          {titleBar}
          {videoEl}
        </div>
      </div>
    );
  }

  // normal: floating, draggable, resizable
  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="Shared screen"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 65,
        width: size.w, height: size.h, minWidth: 240, minHeight: 160,
        resize: 'both', overflow: 'hidden',
        background: '#000', borderRadius: 12, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
        border: '1.5px solid var(--ds-border, #DFE1E6)',
        boxShadow: '0 12px 34px rgba(9,30,66,.28)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
        display: 'flex', flexDirection: 'column',
      }}
    >
      {titleBar}
      {videoEl}
    </div>
  );
}

const winBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-surface-sunken, #F7F8F9)', color: 'var(--ds-text, #172B4D)',
};

const MinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
);
const MaxIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
);
const RestoreIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" /><rect x="4" y="8" width="12" height="12" rx="1" /></svg>
);

// src/components/layout/HuddleWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore, getHuddleRemoteScreen, getHuddleLocalScreen, sendHuddleMarker, onHuddleMarker } from '@/store/huddleStore';
import { Avatar } from '@/components/ads';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';
import { useMessages } from '@/hooks/chat/useMessages';
import { Composer } from '@/features/chat-v2/components/Composer/Composer';

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

  const chatPanelOpen = useHuddleStore((s) => s.chatPanelOpen);
  const { messages, sendMessage } = useMessages(active?.conversationId ?? null);
  // huddle started this session — only show messages from now on, like Slack.
  const sessionStartRef = useRef<string>(new Date().toISOString());
  useEffect(() => { sessionStartRef.current = new Date().toISOString(); }, [active?.huddleId]);
  const sessionMessages = messages.filter(
    (m) => m.eventType !== 'huddle_summary' && m.createdAt >= sessionStartRef.current,
  );

  // stage state
  const markerPen = useHuddleStore((s) => s.markerPen);
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const participants = huddle?.participants ?? [];
  const remoteSharing = !!active?.remoteSharing;
  const localSharing = !!active?.screenSharing;
  const showRemote = remoteSharing;
  const screenVisible = remoteSharing || localSharing;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<{ id: string; color: string; points: { x: number; y: number }[]; t: number }[]>([]);
  const drawingRef = useRef<{ id: string; color: string; points: { x: number; y: number }[]; t: number } | null>(null);
  const lastSendRef = useRef(0);

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

  // receive remote markers → upsert by id
  useEffect(() => onHuddleMarker((m) => {
    const s = m as { id: string; color: string; points: { x: number; y: number }[] };
    if (!s || !s.id || !Array.isArray(s.points)) return;
    const arr = strokesRef.current;
    const i = arr.findIndex((x) => x.id === s.id);
    const next = { id: s.id, color: s.color || '#C9372C', points: s.points, t: Date.now() };
    if (i >= 0) arr[i] = next; else arr.push(next);
  }), []);

  // redraw loop with fade-out
  useEffect(() => {
    const FADE_HOLD = 2500, FADE_OUT = 700;
    const contentRect = (W: number, H: number) => {
      const v = videoRef.current;
      const vw = v?.videoWidth || 0, vh = v?.videoHeight || 0;
      if (!vw || !vh) return { x: 0, y: 0, w: W, h: H };
      const s = Math.min(W / vw, H / vh);
      const cw = vw * s, ch = vh * s;
      return { x: (W - cw) / 2, y: (H - ch) / 2, w: cw, h: ch };
    };
    let raf = 0;
    const loop = () => {
      const cv = canvasRef.current;
      if (cv) {
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          const now = Date.now();
          strokesRef.current = strokesRef.current.filter((s) => now - s.t < FADE_HOLD + FADE_OUT);
          const cr = contentRect(w, h);
          for (const s of strokesRef.current) {
            const age = now - s.t;
            ctx.globalAlpha = age < FADE_HOLD ? 1 : Math.max(0, 1 - (age - FADE_HOLD) / FADE_OUT);
            ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            s.points.forEach((p, idx) => {
              const x = cr.x + p.x * cr.w, y = cr.y + p.y * cr.h;
              if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // bind the right screen stream to the <video>
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const stream = showRemote ? getHuddleRemoteScreen() : localSharing ? getHuddleLocalScreen() : null;
    v.srcObject = stream ?? null;
    if (stream) void v.play().catch(() => { /* autoplay guard */ });
  }, [showRemote, localSharing, remoteSharing, windowState]);

  const normPt = useCallback((e: React.PointerEvent) => {
    const cv = canvasRef.current!; const r = cv.getBoundingClientRect();
    const v = videoRef.current; const vw = v?.videoWidth || 0, vh = v?.videoHeight || 0;
    const s = vw && vh ? Math.min(r.width / vw, r.height / vh) : 1;
    const cw = vw ? vw * s : r.width, ch = vh ? vh * s : r.height;
    const cx = (r.width - cw) / 2, cy = (r.height - ch) / 2;
    return { x: (e.clientX - r.left - cx) / cw, y: (e.clientY - r.top - cy) / ch };
  }, []);
  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if (!markerPen) return;
    e.stopPropagation();
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const stroke = { id, color: '#22A06B', points: [normPt(e)], t: Date.now() };
    drawingRef.current = stroke; strokesRef.current.push(stroke);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, [markerPen, normPt]);
  const onCanvasMove = useCallback((e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (!markerPen || !d || e.buttons === 0) return;
    d.points.push(normPt(e)); d.t = Date.now();
    const now = Date.now();
    if (now - lastSendRef.current > 50) { lastSendRef.current = now; sendHuddleMarker({ id: d.id, color: d.color, points: d.points }); }
  }, [markerPen, normPt]);
  const onCanvasUp = useCallback(() => {
    const d = drawingRef.current;
    if (d) { sendHuddleMarker({ id: d.id, color: d.color, points: d.points }); drawingRef.current = null; }
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
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: 12 }}>
            {/* screen-share tile (only when someone shares) */}
            {screenVisible && (
              <div style={{ flex: 2, minWidth: 0, position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block', minHeight: 0 }} />
                <canvas ref={canvasRef}
                  onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasUp}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                    pointerEvents: markerPen ? 'auto' : 'none', cursor: markerPen ? 'crosshair' : 'default', touchAction: 'none' }} />
                <span style={{ position: 'absolute', left: 12, bottom: 12, padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(9,30,66,.55)', color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
                  {showRemote ? `${active.conversationName} — screen` : 'You are sharing'}
                </span>
              </div>
            )}
            {/* participant tile(s) */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--ds-surface, #FFFFFF)', borderRadius: 12, border: '1px solid var(--ds-border, #DFE1E6)' }}>
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {participants.length > 0
                  ? <Avatar size="xxlarge" name={participants[participants.length - 1].name || active.conversationName} src={participants[participants.length - 1].avatarUrl || undefined} />
                  : <Avatar size="xxlarge" name={active.conversationName} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                  {participants[participants.length - 1]?.name || active.conversationName}
                </span>
              </span>
            </div>
          </div>
        </div>
        {chatPanelOpen && (
          <div style={{ flex: '0 0 360px', minWidth: 0, display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}>
            <div style={{ flex: '0 0 auto', padding: '8px 16px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              fontWeight: 700, fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>Thread</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessionMessages.length === 0 ? (
                <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13, lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ds-text, #172B4D)' }}>Every huddle has a thread.</strong>
                  {' '}Send messages, files, and links to everyone in the huddle. They are saved in this conversation, so you can read them after the huddle ends.
                </div>
              ) : (
                sessionMessages.map((m) => (
                  <div key={m.id} style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ds-text, #172B4D)' }}>{m.authorName ?? ''}</span>
                    <span style={{ marginLeft: 8, color: 'var(--ds-text, #172B4D)', whiteSpace: 'pre-wrap' }}>{m.bodyText}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
              <Composer
                placeholder="Message"
                conversationId={active.conversationId}
                onSend={(md) => { void sendMessage(md); }}
              />
            </div>
          </div>
        )}
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

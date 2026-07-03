// src/components/layout/HuddleWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore, getHuddleRemoteScreen, getHuddleLocalScreen, sendHuddleMarker, onHuddleMarker } from '@/store/huddleStore';
import { Avatar } from '@/components/ads';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';
import { useMessages } from '@/hooks/chat/useMessages';
import { useThreadMessages } from '@/hooks/chat/useThreadMessages';
import { Composer } from '@/features/chat-v2/components/Composer/Composer';
import { MessageList } from '@/features/chat-v2/components/MessagePanel/MessageList';

/**
 * HuddleWindow — large draggable + resizable Slack-style huddle surface.
 * Replaces the FAB + standalone screen window as THE call UI while open.
 * - windowState 'open'      : floating window (this component).
 * - windowState 'minimized' : hidden here; the compact HuddleFab shows instead.
 * - windowState 'maximized' : full-viewport.
 * Mounted at app-shell scope (survives route changes), like the FAB.
 */
const POS_KEY = 'huddle-window-pos-br';
const SIZE_KEY = 'huddle-window-size';
const WIN_MARGIN = 24;
function bottomRight(w: number, h: number): { top: number; left: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  return { top: Math.max(8, vh - h - WIN_MARGIN), left: Math.max(8, vw - w - WIN_MARGIN) };
}
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

  const [size] = useState<Size>(() => load(SIZE_KEY, { w: 900, h: 560 }));
  const [pos, setPos] = useState<Pos>(() => {
    const stored = load<Pos | null>(POS_KEY, null);
    return stored ?? bottomRight(Math.max(size.w, 560), Math.max(size.h, 380));
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // After the window mounts, clamp its position into the viewport using its REAL
  // rendered size (min-width/height can make it larger than `size`), so it can
  // never end up mostly off-screen in the bottom-right corner.
  useEffect(() => {
    if (!active || windowState !== 'open') return;
    const el = wrapRef.current;
    if (!el) return;
    const w = el.offsetWidth || size.w;
    const h = el.offsetHeight || size.h;
    setPos((p) => ({
      left: Math.max(8, Math.min(window.innerWidth - w - 8, p.left)),
      top: Math.max(8, Math.min(window.innerHeight - h - 8, p.top)),
    }));
  }, [active?.huddleId, windowState]); // eslint-disable-line react-hooks/exhaustive-deps

  const chatPanelOpen = useHuddleStore((s) => s.chatPanelOpen);
  // In-huddle messages thread under the "Huddle is happening" event row. They show
  // here AND in the main conversation (as the event row's replies). Sent as replies
  // (parent_id) so they belong to the huddle, not the plain DM feed.
  const huddleEventId = active?.huddleEventId ?? null;
  const { sendMessage, toggleReaction } = useMessages(active?.conversationId ?? null);
  const { messages: sessionMessages } = useThreadMessages(active?.conversationId ?? null, huddleEventId);

  // Unread dot on the "Chat" button: a new thread message arrived while the panel
  // was closed. Cleared on open; reset per huddle.
  const [threadSeenCount, setThreadSeenCount] = useState(0);
  useEffect(() => { setThreadSeenCount(0); }, [active?.huddleId]);
  useEffect(() => {
    if (chatPanelOpen) setThreadSeenCount(sessionMessages.length);
  }, [chatPanelOpen, sessionMessages.length]);
  const hasThreadUnread = !chatPanelOpen && sessionMessages.length > threadSeenCount;

  // stage state
  const markerPen = useHuddleStore((s) => s.markerPen);
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const participants = huddle?.participants ?? [];
  const remoteSharing = !!active?.remoteSharing;
  const localSharing = !!active?.screenSharing;
  const showRemote = remoteSharing;
  const screenVisible = remoteSharing || localSharing;

  // Participant tiles — square (rounded-rect), Slack-style. 'stage' = centered in
  // the left area when nobody shares; 'rail' = docked at the top of the right rail
  // when a screen share takes the full left.
  const renderParticipantTiles = (variant: 'stage' | 'rail') => {
    const list = participants.length > 0
      ? participants
      : [{ userId: 'self', name: active!.conversationName, avatarUrl: '' }];
    // Square tiles (aspect-ratio, not fixed height) so a portrait photo never
    // stretches into a tall sliver when the window is narrow.
    const tileSize: React.CSSProperties = variant === 'stage'
      ? { flex: '1 1 0', minWidth: 0, maxWidth: 280, aspectRatio: '1 / 1', maxHeight: 280 }
      : { flex: 1, minWidth: 0, maxWidth: 160, aspectRatio: '1 / 1', maxHeight: 160 };
    return (
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap',
        ...(variant === 'stage' ? { flex: 1, minWidth: 0, padding: 12 } : { padding: 12 }),
      }}>
        {list.map((p) => (
          <div key={p.userId} style={{
            ...tileSize, position: 'relative', overflow: 'hidden', borderRadius: 12,
            background: 'var(--ds-surface)', border: '1px solid var(--ds-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {p.avatarUrl
              ? <img src={p.avatarUrl} alt={p.name || ''}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Avatar size="xxlarge" name={p.name || active!.conversationName} />}
            {/* ads-scanner:ignore-next-line — Jira-parity video overlay rgba+white, no ADS token */}
            <span style={{ position: 'absolute', left: 12, bottom: 12, padding: '4px 10px', borderRadius: 8,
              background: 'rgba(9,30,66,.55)', color: 'var(--ds-text-inverse)', fontSize: 12, fontWeight: 600 }}>
              {p.name || active!.conversationName}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const startScreen = useHuddleStore((s) => s.startScreen);
  const stopScreen = useHuddleStore((s) => s.stopScreen);
  const leave = useHuddleStore((s) => s.leave);
  const toggleChatPanel = useHuddleStore((s) => s.toggleChatPanel);
  const muted = !!active?.micMuted;
  const sharing = !!active?.screenSharing;

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
    const next = { id: s.id, color: s.color || '#C9372C' /* ads-scanner:ignore-line — canvas annotation red, no ADS token */, points: s.points, t: Date.now() };
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
    const stroke = { id, color: '#22A06B' /* ads-scanner:ignore-line — canvas annotation green, no ADS token */, points: [normPt(e)], t: Date.now() };
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
  // ads-scanner:ignore-next-line — video stage requires true-black bg, no ADS token
  const VIDEO_BG = '#000';

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
        background: 'var(--ds-surface)',
        borderRadius: maximized ? 12 : 14,
        border: '1px solid var(--ds-border)',
        boxShadow: '0 24px 64px rgba(9,30,66,.34)', /* ads-scanner:ignore-line — Jira-parity overlay shadow, no ADS token */
      }}
    >
      {/* title bar */}
      <div
        onPointerDown={maximized ? undefined : onPointerDown}
        onPointerMove={maximized ? undefined : onPointerMove}
        onPointerUp={maximized ? undefined : endDrag}
        onPointerCancel={maximized ? undefined : endDrag}
        style={{
          flex: '0 0 auto', height: 44, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', cursor: maximized ? 'default' : 'grab', touchAction: 'none',
          borderBottom: '1px solid var(--ds-border)',
          background: 'var(--ds-surface-overlay)',
        }}
      >
        <span aria-hidden>🎧</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ds-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Huddle with {active.conversationName}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          <button type="button" data-huddle-btn title="Minimize" onClick={() => setWindowState('minimized')} style={winBtn}>—</button>
          {maximized
            ? <button type="button" data-huddle-btn title="Restore" onClick={() => setWindowState('open')} style={winBtn}>❐</button>
            : <button type="button" data-huddle-btn title="Maximize" onClick={() => setWindowState('maximized')} style={winBtn}>▢</button>}
        </span>
      </div>

      {/* body: stage (Task 7) | thread (Task 8) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div data-huddle-stage style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--ds-surface-sunken)' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: 12 }}>
            {/* sharing → screen takes the full left; nobody sharing → participant tiles centered */}
            {screenVisible ? (
              <div style={{ flex: 1, minWidth: 0, position: 'relative', background: VIDEO_BG, borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: VIDEO_BG, display: 'block', minHeight: 0 }} />
                <canvas ref={canvasRef}
                  onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasUp}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                    pointerEvents: markerPen ? 'auto' : 'none', cursor: markerPen ? 'crosshair' : 'default', touchAction: 'none' }} />
                {/* ads-scanner:ignore-next-line — Jira-parity video overlay rgba+white, no ADS token */}
                <span style={{ position: 'absolute', left: 12, bottom: 12, padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(9,30,66,.55)', color: 'var(--ds-text-inverse)', fontSize: 12, fontWeight: 600 }}>
                  {showRemote ? `${active.conversationName} — screen` : 'You are sharing'}
                </span>
              </div>
            ) : (
              renderParticipantTiles('stage')
            )}
          </div>
        </div>
        {(screenVisible || chatPanelOpen) && (
          <div style={{ flex: '0 0 360px', minWidth: 0, display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid var(--ds-border)', background: 'var(--ds-surface)' }}>
            {/* while sharing, participant tiles dock at the top of the rail */}
            {screenVisible && (
              <div style={{ flex: '0 0 auto', borderBottom: '1px solid var(--ds-border)' }}>
                {renderParticipantTiles('rail')}
              </div>
            )}
            {chatPanelOpen && (
            <>
            <div style={{ flex: '0 0 auto', padding: '8px 16px', borderBottom: '1px solid var(--ds-border)',
              fontWeight: 700, fontSize: 14, color: 'var(--ds-text)' }}>Thread</div>
            {sessionMessages.length === 0 ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16,
                color: 'var(--ds-text-subtlest)', fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--ds-text)' }}>Every huddle has a thread.</strong>
                {' '}Send messages, files, and links to everyone in the huddle. They are saved in this conversation, so you can read them after the huddle ends.
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Canonical chat rendering (avatars, names, timestamps, grouping) —
                    same MessageList the main panel uses, so the huddle thread matches. */}
                <MessageList
                  messages={sessionMessages}
                  onOpenThread={() => { /* threads can't nest inside a huddle thread */ }}
                  onToggleReaction={(id, emoji) => { void toggleReaction(id, emoji); }}
                  followLatest
                />
              </div>
            )}
            <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--ds-border)' }}>
              <Composer
                placeholder="Message"
                conversationId={active.conversationId}
                onSend={(md) => { void sendMessage(md, huddleEventId ? { parentId: huddleEventId } : undefined); }}
              />
            </div>
            </>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: '0 0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderTop: '1px solid var(--ds-border)', background: 'var(--ds-surface-overlay)' }}>
        <button type="button" data-huddle-btn onClick={toggleMute} aria-pressed={muted} title={muted ? 'Unmute' : 'Mute'}
          style={ctrlBtn(muted ? 'var(--ds-background-warning)' : 'var(--ds-surface-sunken)')}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" data-huddle-btn disabled={remoteSharing}
          onClick={() => { if (!remoteSharing) void (sharing ? stopScreen() : startScreen()); }}
          aria-pressed={sharing}
          title={remoteSharing ? 'Other participant is sharing' : sharing ? 'Stop sharing' : 'Share screen'}
          style={{ ...ctrlBtn(sharing ? 'var(--ds-background-selected)' : 'var(--ds-surface-sunken)'),
            opacity: remoteSharing ? 0.45 : 1, cursor: remoteSharing ? 'not-allowed' : 'pointer' }}>
          {sharing ? 'Stop share' : 'Share screen'}
        </button>
        <button type="button" data-huddle-btn onClick={toggleChatPanel} aria-pressed={chatPanelOpen} title="Toggle chat"
          style={{ ...ctrlBtn(chatPanelOpen ? 'var(--ds-background-selected)' : 'var(--ds-surface-sunken)'), position: 'relative' }}>
          Chat
          {hasThreadUnread && (
            <span aria-label="New messages" style={{
              position: 'absolute', top: 6, right: 8, width: 8, height: 8, borderRadius: '50%',
              background: 'var(--ds-background-danger-bold)', boxShadow: '0 0 0 2px var(--ds-surface-overlay)',
            }} />
          )}
        </button>
        <button type="button" data-huddle-btn onClick={leave} title="Leave huddle"
          style={{ ...ctrlBtn('var(--ds-background-danger-bold)'), color: '#FFFFFF' }}>
          Leave
        </button>
      </div>
    </div>
  );
}

const winBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-surface-sunken)', color: 'var(--ds-text)', fontSize: 14,
};

function ctrlBtn(bg: string): React.CSSProperties {
  return {
    height: 40, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
    background: bg, color: 'var(--ds-text)',
  };
}

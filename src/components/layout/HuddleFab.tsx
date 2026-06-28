// src/components/layout/HuddleFab.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useHuddleStore, getHuddleRemoteStream } from '@/store/huddleStore';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';

/**
 * HuddleFab — draggable floating call widget (replaces the old header strip).
 * - Collapsed: avatar + live audio equalizer. Hover → name/timer + Mute + Leave.
 * - Draggable anywhere; snaps to the nearest horizontal edge so hover-expansion
 *   always grows inward (never off-screen). Position persists in localStorage.
 * - Equalizer bars are driven by the REAL remote audio level (Web Audio
 *   AnalyserNode), updated via rAF directly on the DOM (no React re-render).
 * - Survives route changes (mounted at app-shell scope, store lives there too).
 */

const POS_KEY = 'huddle-fab-pos';
type Pos = { top: number; left?: number; right?: number };

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw) as Pos;
  } catch { /* ignore */ }
  return { top: 84, right: 24 }; // default: top-right, just below the header
}

export function HuddleFab() {
  const active = useHuddleStore((s) => s.active);
  const leave = useHuddleStore((s) => s.leave);
  const startScreen = useHuddleStore((s) => s.startScreen);
  const stopScreen = useHuddleStore((s) => s.stopScreen);
  const windowState = useHuddleStore((s) => s.windowState);
  const setWindowState = useHuddleStore((s) => s.setWindowState);
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const participants = huddle?.participants ?? [];

  const [pos, setPos] = useState<Pos>(loadPos);

  const wrapRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<SVGPathElement | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const connecting = !!active && active.connectionState !== 'connected';
  const sharing = !!active?.screenSharing;
  const remoteSharing = !!active?.remoteSharing;

  // equalizer driven by real remote audio level
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let srcNode: MediaStreamAudioSourceNode | null = null;
    let data: Uint8Array | null = null;
    let curStream: MediaStream | null = null;

    const loop = () => {
      const stream = getHuddleRemoteStream();
      if (stream && stream !== curStream) {
        try {
          ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
          srcNode?.disconnect();
          srcNode = ctx.createMediaStreamSource(stream);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          srcNode.connect(analyser);
          data = new Uint8Array(analyser.frequencyBinCount);
          curStream = stream;
        } catch { /* AudioContext may be unavailable */ }
      }
      const st = useHuddleStore.getState().active;
      const isMuted = !!st?.micMuted;
      const isConnected = st?.connectionState === 'connected';
      let level = 0;
      if (analyser && data && isConnected) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        level = Math.min(1, sum / data.length / 70);
      }
      // flowing waveform — amplitude tracks the audio level, flat-ish when silent
      const path = waveRef.current;
      if (path) {
        const W = 40, H = 24, mid = H / 2, N = 28;
        const amp = !isConnected || isMuted ? 0.8 : 2 + level * 9;
        const phase = Date.now() / 110;
        let d = '';
        for (let i = 0; i <= N; i++) {
          const x = (i / N) * W;
          const y = mid + amp * Math.sin(i * 0.7 + phase);
          d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        }
        path.setAttribute('d', d);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      try { srcNode?.disconnect(); } catch { /* ignore */ }
      try { ctx?.close(); } catch { /* ignore */ }
    };
  }, [active?.huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- drag + edge-snap ----
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return; // not from Mute/Leave
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = wrapRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    el.classList.add('huddle-fab-dragging');
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, d.ox + dx));
    const top = Math.max(8, Math.min(window.innerHeight - h - 8, d.oy + dy));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.right = 'auto';
  }, []);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    const el = wrapRef.current;
    dragRef.current = null;
    el?.classList.remove('huddle-fab-dragging');
    if (!d || !el) return;
    if (!d.moved) { setWindowState('open'); return; } // click (no drag) → reopen the window
    // snap to nearest horizontal edge so the panel grows inward
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    let next: Pos;
    if (center > window.innerWidth / 2) {
      next = { top: Math.max(8, r.top), right: Math.max(8, window.innerWidth - r.right) };
    } else {
      next = { top: Math.max(8, r.top), left: Math.max(8, r.left) };
    }
    el.style.left = next.left != null ? `${next.left}px` : 'auto';
    el.style.right = next.right != null ? `${next.right}px` : 'auto';
    el.style.top = `${next.top}px`;
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, [setWindowState]); // setWindowState is a stable Zustand action

  if (!active || windowState !== 'minimized') return null;

  const green = 'var(--ds-icon-success, #22A06B)';

  // Screen-share toggle — disabled while the remote peer is sharing (only one screen at a time).
  const screenShareBtn = !connecting ? (
    <button
      type="button"
      data-huddle-btn
      disabled={remoteSharing}
      onClick={() => { if (!remoteSharing) void (sharing ? stopScreen() : startScreen()); }}
      aria-pressed={sharing}
      title={remoteSharing ? 'Other participant is sharing' : sharing ? 'Stop sharing screen' : 'Share screen'}
      style={{
        ...iconBtnStyle(sharing ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface-sunken, #F7F8F9)', sharing ? 'var(--ds-text-selected, #0C66E4)' : 'var(--ds-text, #172B4D)'),
        opacity: remoteSharing ? 0.45 : 1,
        cursor: remoteSharing ? 'not-allowed' : 'pointer',
      }}
    >
      <ScreenIcon />
    </button>
  ) : null;

  const declineBtn = (
    <button
      type="button"
      data-huddle-btn
      onClick={leave}
      title="Leave huddle"
      style={iconBtnStyle('var(--ds-background-danger-bold, #C9372C)', 'var(--ds-text-inverse, #FFFFFF)')}
    >
      <PhoneDownIcon />
    </button>
  );

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="Active huddle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left != null ? pos.left : 'auto',
        right: pos.right != null ? pos.right : 'auto',
        zIndex: 60,
        touchAction: 'none',
        cursor: 'grab',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        height: 56,
        padding: '0 8px',
        borderRadius: 999,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: `1.5px solid ${connecting ? 'var(--ds-border, #DFE1E6)' : 'var(--ds-border-success, #4BCE97)'}`,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,.18)), 0 2px 6px var(--ds-shadow-raised, rgba(9,30,66,.12))',
        transition: 'gap .18s ease, padding .18s ease, border-radius .18s ease',
        userSelect: 'none',
      }}
    >
      {/* participant avatars (stacked) — falls back to one generic avatar */}
      <span style={{ position: 'relative', flex: '0 0 auto', display: 'inline-flex', alignItems: 'center' }}>
        {participants.length > 0 ? (
          participants.map((p, i) => (
            <span key={p.userId} title={p.name || undefined}
              style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: '50%', boxShadow: '0 0 0 2px var(--ds-surface-overlay, #FFFFFF)' }}>
              <Avatar size="medium" name={p.name || undefined} src={p.avatarUrl || undefined} />
            </span>
          ))
        ) : (
          <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%' }}>
            <Avatar size="medium" />
            {!connecting && (
              <span aria-hidden style={{
                position: 'absolute', insetInlineStart: -3, insetBlockStart: -3, insetInlineEnd: -3, insetBlockEnd: -3,
                borderRadius: '50%', border: `2px solid ${green}`, pointerEvents: 'none',
              }} />
            )}
          </span>
        )}
      </span>

      {/* connecting spinner (both states) */}
      {connecting && (
        <span style={{ margin: '0 10px', display: 'inline-flex' }}><Spinner size="small" /></span>
      )}

      {/* compact strip quick actions — screen share + decline */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        {screenShareBtn}
        {declineBtn}
      </span>
    </div>
  );
}

function iconBtnStyle(bg: string, color = 'var(--ds-text, #172B4D)'): React.CSSProperties {
  return {
    width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, flex: '0 0 auto',
  };
}

const ScreenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
);
const PhoneDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 15.5c-2.5.8-5.2 1.2-9 1.2s-6.5-.4-9-1.2v-3c0-.6.4-1.1 1-1.3 1-.3 2-.5 3-.6.6-.1 1.1.3 1.2.9l.3 1.6c2.1.4 4.3.4 6.4 0l.3-1.6c.1-.6.6-1 1.2-.9 1 .1 2 .3 3 .6.6.2 1 .7 1 1.3v3z" />
  </svg>
);

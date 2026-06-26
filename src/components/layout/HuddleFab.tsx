// src/components/layout/HuddleFab.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@atlaskit/avatar';
import Spinner from '@atlaskit/spinner';
import { useHuddleStore, getHuddleRemoteStream } from '@/store/huddleStore';

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
  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<Pos>(loadPos);
  const [seconds, setSeconds] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const connecting = !!active && active.connectionState !== 'connected';
  const muted = !!active?.micMuted;

  // call duration timer (resets each huddle)
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active?.huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const bars = barRefs.current;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        if (!b) continue;
        const base = 4;
        const h = !isConnected || isMuted
          ? base
          : base + level * 16 * (0.55 + 0.45 * Math.abs(Math.sin(Date.now() / 130 + i)));
        b.style.height = `${Math.max(4, h).toFixed(1)}px`;
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
    if (!d || !d.moved || !el) return;
    // snap to nearest horizontal edge so hover grows inward
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
  }, []);

  if (!active) return null;

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const green = 'var(--ds-icon-success, #22A06B)';

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="Active huddle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        gap: hovered ? 12 : 0,
        height: 56,
        padding: hovered ? '0 12px 0 8px' : '0 8px',
        borderRadius: hovered ? 16 : 999,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: `1.5px solid ${connecting ? 'var(--ds-border, #DFE1E6)' : 'var(--ds-border-success, #4BCE97)'}`,
        boxShadow: '0 8px 28px rgba(9,30,66,.18), 0 2px 6px rgba(9,30,66,.12)',
        transition: 'gap .18s ease, padding .18s ease, border-radius .18s ease',
        userSelect: 'none',
      }}
    >
      {/* avatar */}
      <span style={{ position: 'relative', flex: '0 0 auto', display: 'inline-flex', borderRadius: '50%' }}>
        <Avatar size="medium" />
        {!connecting && (
          <span aria-hidden style={{
            position: 'absolute', insetInlineStart: -3, insetBlockStart: -3, insetInlineEnd: -3, insetBlockEnd: -3,
            borderRadius: '50%', border: `2px solid ${green}`, pointerEvents: 'none',
          }} />
        )}
      </span>

      {/* connecting spinner OR equalizer */}
      {connecting ? (
        <span style={{ margin: '0 10px', display: 'inline-flex' }}><Spinner size="small" /></span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 24, margin: '0 8px 0 12px' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              ref={(el) => { barRefs.current[i] = el; }}
              style={{ width: 3, height: 4, borderRadius: 2, background: muted ? 'var(--ds-text-subtlest, #6B778C)' : green }}
            />
          ))}
        </span>
      )}

      {/* meta + actions — only when hovered */}
      {hovered && (
        <>
          <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden' }}>
            <button
              type="button"
              data-huddle-btn
              onClick={() => navigate('/chat')}
              style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {connecting ? 'Connecting…' : active.conversationName}
            </button>
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', fontVariantNumeric: 'tabular-nums' }}>
              {connecting ? '—' : `${mm}:${ss}`}
            </span>
          </span>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              data-huddle-btn
              onClick={toggleMute}
              aria-pressed={muted}
              title={muted ? 'Unmute' : 'Mute'}
              style={iconBtnStyle(muted ? 'var(--ds-background-warning, #FFF7D6)' : 'var(--ds-surface-sunken, #F7F8F9)')}
            >
              {muted ? <MicOffIcon /> : <MicIcon />}
            </button>
            <button
              type="button"
              data-huddle-btn
              onClick={leave}
              title="Leave huddle"
              style={iconBtnStyle('var(--ds-background-danger-bold, #C9372C)', '#FFFFFF')}
            >
              <PhoneDownIcon />
            </button>
          </span>
        </>
      )}
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

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 9v2a3 3 0 0 0 5 2M15 11V6a3 3 0 0 0-6 0M5 11a7 7 0 0 0 11 5M12 18v3M3 3l18 18" />
  </svg>
);
const PhoneDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 15.5c-2.5.8-5.2 1.2-9 1.2s-6.5-.4-9-1.2v-3c0-.6.4-1.1 1-1.3 1-.3 2-.5 3-.6.6-.1 1.1.3 1.2.9l.3 1.6c2.1.4 4.3.4 6.4 0l.3-1.6c.1-.6.6-1 1.2-.9 1 .1 2 .3 3 .6.6.2 1 .7 1 1.3v3z" />
  </svg>
);

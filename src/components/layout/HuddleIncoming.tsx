// src/components/layout/HuddleIncoming.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '@atlaskit/avatar';
import { useIncomingHuddle } from '@/hooks/chat/useIncomingHuddle';
import { startRing, stopRing } from '@/lib/chat/huddle/ringtone';

/**
 * HuddleIncoming — ringing popup shown to a member when someone starts a huddle
 * in their conversation (they didn't start it and aren't in it yet). Plays a
 * ringtone, pulses, and is draggable + hover-expandable like the call FAB.
 * Accept → joins the huddle (call FAB takes over). Decline → dismiss.
 */

const POS_KEY = 'huddle-incoming-pos';
type Pos = { top: number; left?: number; right?: number };

function loadPos(): Pos {
  try { const raw = localStorage.getItem(POS_KEY); if (raw) return JSON.parse(raw) as Pos; } catch { /* ignore */ }
  return { top: 48, right: 24 };
}

export function HuddleIncoming() {
  const { incoming, accept, decline } = useIncomingHuddle();
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<Pos>(loadPos);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // play ringtone + close the Caty chat dock while an incoming call is pending
  useEffect(() => {
    if (!incoming) return;
    startRing();
    window.dispatchEvent(new CustomEvent('huddle:incoming-ring'));
    return () => stopRing();
  }, [incoming?.huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // pulsing ring (rAF — no CSS keyframes / injected styles)
  useEffect(() => {
    if (!incoming) return;
    let raf = 0;
    const loop = () => {
      const el = ringRef.current;
      if (el) {
        const p = 0.5 + 0.5 * Math.sin(Date.now() / 260);
        el.style.transform = `scale(${(1 + p * 0.5).toFixed(3)})`;
        el.style.opacity = (0.7 - p * 0.6).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [incoming?.huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; const el = wrapRef.current; if (!d || !el) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, d.ox + dx))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, d.oy + dy))}px`;
    el.style.right = 'auto';
  }, []);
  const endDrag = useCallback(() => {
    const d = dragRef.current; const el = wrapRef.current; dragRef.current = null;
    if (!d || !d.moved || !el) return;
    const r = el.getBoundingClientRect(); const center = r.left + r.width / 2;
    const next: Pos = center > window.innerWidth / 2
      ? { top: Math.max(8, r.top), right: Math.max(8, window.innerWidth - r.right) }
      : { top: Math.max(8, r.top), left: Math.max(8, r.left) };
    el.style.left = next.left != null ? `${next.left}px` : 'auto';
    el.style.right = next.right != null ? `${next.right}px` : 'auto';
    el.style.top = `${next.top}px`;
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  if (!incoming) return null;
  const green = 'var(--ds-icon-success)';

  return (
    <div
      ref={wrapRef}
      role="alertdialog"
      aria-label={`Incoming huddle from ${incoming.callerName}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', top: pos.top,
        left: pos.left != null ? pos.left : 'auto',
        right: pos.right != null ? pos.right : 'auto',
        zIndex: 70, touchAction: 'none', cursor: 'grab', userSelect: 'none',
        display: 'inline-flex', alignItems: 'center', gap: hovered ? 14 : 0,
        padding: hovered ? '12px 14px' : 10,
        borderRadius: hovered ? 16 : 999,
        background: 'var(--ds-surface-overlay)',
        border: `1.5px solid var(--ds-border-success)`,
        boxShadow: '0 8px 28px rgba(9,30,66,.20), 0 2px 6px rgba(9,30,66,.12)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
        transition: 'gap .18s ease, padding .18s ease, border-radius .18s ease',
      }}
    >
      <span style={{ position: 'relative', flex: '0 0 auto', display: 'inline-flex', borderRadius: '50%' }}>
        <Avatar size="medium" />
        <span ref={ringRef} aria-hidden style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${green}`, pointerEvents: 'none',
        }} />
      </span>

      {hovered && (
        <>
          <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden' }}>
            <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incoming.callerName}
            </span>
            <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: green }} /> Incoming huddle…
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button type="button" data-huddle-btn onClick={decline} title="Decline"
              style={roundBtn('var(--ds-background-danger-bold)')}>
              <PhoneDownIcon />
            </button>
            <button type="button" data-huddle-btn onClick={accept} title="Accept"
              style={roundBtn(green)}>
              <PhoneIcon />
            </button>
          </span>
        </>
      )}
    </div>
  );
}

function roundBtn(bg: string): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color: 'var(--ds-surface)', flex: '0 0 auto',
  };
}

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.6 9.8a16 16 0 0 0 6 6l1.4-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
  </svg>
);
const PhoneDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 15.5c-2.5.8-5.2 1.2-9 1.2s-6.5-.4-9-1.2v-3c0-.6.4-1.1 1-1.3 1-.3 2-.5 3-.6.6-.1 1.1.3 1.2.9l.3 1.6c2.1.4 4.3.4 6.4 0l.3-1.6c.1-.6.6-1 1.2-.9 1 .1 2 .3 3 .6.6.2 1 .7 1 1.3v3z" />
  </svg>
);

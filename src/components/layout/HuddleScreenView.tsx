// src/components/layout/HuddleScreenView.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore, getHuddleRemoteScreen, getHuddleLocalScreen } from '@/store/huddleStore';

/**
 * HuddleScreenView — floating, draggable, resizable window that shows the
 * shared screen during an active huddle. Prefers the REMOTE peer's screen
 * (what you watch); falls back to a muted preview of your own share so you
 * know it's live. Hidden when nobody is sharing.
 */

const POS_KEY = 'huddle-screen-pos';
type Pos = { top: number; left: number };

function loadPos(): Pos {
  try { const raw = localStorage.getItem(POS_KEY); if (raw) return JSON.parse(raw) as Pos; } catch { /* ignore */ }
  return { top: 120, left: 24 };
}

export function HuddleScreenView() {
  const active = useHuddleStore((s) => s.active);
  const stopScreen = useHuddleStore((s) => s.stopScreen);
  const remoteSharing = !!active?.remoteSharing;
  const localSharing = !!active?.screenSharing;
  const showRemote = remoteSharing;            // remote takes priority
  const visible = remoteSharing || localSharing;

  const [pos, setPos] = useState<Pos>(loadPos);
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
  }, [showRemote, localSharing, remoteSharing]);

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

  if (!visible) return null;

  const title = showRemote
    ? `${active?.conversationName ?? 'Peer'} — screen`
    : 'You are sharing your screen';

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="Shared screen"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 65,
        width: 460, height: 300, minWidth: 240, minHeight: 160,
        resize: 'both', overflow: 'hidden',
        background: '#000', borderRadius: 12,
        border: '1.5px solid var(--ds-border, #DFE1E6)',
        boxShadow: '0 12px 34px rgba(9,30,66,.28)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* title bar = drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          flex: '0 0 auto', height: 34, display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px', cursor: 'grab', touchAction: 'none',
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ds-icon-success, #22A06B)', flex: '0 0 auto' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </span>
        {localSharing && (
          <button
            type="button"
            data-huddle-btn
            onClick={() => { void stopScreen(); }}
            style={{
              marginLeft: 'auto', border: 'none', cursor: 'pointer', borderRadius: 6,
              padding: '3px 10px', fontSize: 12, fontWeight: 600,
              background: 'var(--ds-background-danger-bold, #C9372C)', color: '#FFFFFF',
            }}
          >
            Stop
          </button>
        )}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!showRemote}
        style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
      />
    </div>
  );
}

// src/components/chat/IncomingHuddleFab.tsx
/**
 * IncomingHuddleFab — the vibrating incoming-call FAB, extracted from ChatDock
 * so it can be mounted GLOBALLY (in CatalystShell) and therefore ring on EVERY
 * route, including the full-screen /chat page where the ChatDock is hidden.
 *
 * Renders nothing unless there's a live incoming (ringing) or snoozed huddle.
 * While ringing it vibrates (rAF, bypassing the prefers-reduced-motion CSS
 * reset); hovering opens the decline/snooze/accept fan. Shares the FAB position
 * with the ChatDock launcher (same useDraggableFab storage key) — the launcher
 * hides itself while a call is active, so only one FAB shows at a time.
 */
import React from 'react';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { useIncomingHuddle } from '@/hooks/chat/useIncomingHuddle';
import { startRing, stopRing } from '@/lib/chat/huddle/ringtone';
import { useDraggableFab } from './dock/useDraggableFab';
import { DockCallRing } from './dock/DockCallRing';
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import './dock/dock.css';

export function IncomingHuddleFab() {
  const { incoming, snoozedCall, accept, decline, snooze } = useIncomingHuddle();
  const ringing = !!incoming;
  const snoozed = !!snoozedCall;
  const callActive = ringing || snoozed;

  const { pos, isDragging, isSnapping, didMove, handlers } = useDraggableFab();
  const [ringHovered, setRingHovered] = React.useState(false);
  const discRef = React.useRef<HTMLSpanElement>(null);
  const pulseRef = React.useRef<HTMLSpanElement>(null);
  const closeRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openRing = React.useCallback(() => {
    if (closeRef.current) { clearTimeout(closeRef.current); closeRef.current = null; }
    setRingHovered(true);
  }, []);
  const closeRing = React.useCallback(() => {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setRingHovered(false), 220);
  }, []);

  // Ringtone while ringing (not while snoozed).
  React.useEffect(() => {
    if (!ringing) { setRingHovered(false); return; }
    startRing();
    window.dispatchEvent(new CustomEvent('huddle:incoming-ring'));
    return () => stopRing();
  }, [ringing, incoming?.huddleId]);

  // rAF vibrate + expanding ring — inline transforms bypass the global
  // prefers-reduced-motion reset in index.css.
  React.useEffect(() => {
    if (!ringing) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const disc = discRef.current;
      const ring = pulseRef.current;
      if (disc) {
        disc.style.transform = ringHovered
          ? 'translate(0,0) rotate(0deg)'
          : `translate(${(Math.sin(t * 40) * 1.4).toFixed(2)}px, ${(Math.cos(t * 36) * 0.9).toFixed(2)}px) rotate(${(Math.sin(t * 38) * 3).toFixed(2)}deg)`;
      }
      if (ring) {
        const p = (t % 1.25) / 1.25;
        ring.style.transform = `scale(${(0.9 + p * 0.85).toFixed(3)})`;
        ring.style.opacity = (0.65 * (1 - p)).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (discRef.current) discRef.current.style.transform = '';
    };
  }, [ringing, ringHovered]);

  if (!callActive) return null;

  const fanOpen = callActive && ringHovered;

  return (
    <>
      <button
        type="button"
        className={`cc-fab${isDragging ? ' cc-fab--dragging' : ''}${isSnapping ? ' cc-fab--snapping' : ''}${ringing && !fanOpen ? ' cc-fab--ringing' : ''}${snoozed ? ' cc-fab--snoozed' : ''}`}
        style={{ top: pos.y, left: pos.x }}
        onClick={() => { /* actions live in the hover fan; click is a no-op (drag only) */ if (didMove.current) return; }}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onMouseEnter={openRing}
        onMouseLeave={closeRing}
        aria-label={snoozed
          ? `Snoozed call from ${snoozedCall?.callerName ?? 'someone'}. Hover to answer.`
          : `Incoming call from ${incoming?.callerName ?? 'someone'}. Hover to answer.`}
        title={snoozed ? `Snoozed call from ${snoozedCall?.callerName ?? 'someone'}` : `Incoming call from ${incoming?.callerName ?? 'someone'}`}
      >
        <span className="cc-wake-disc" ref={discRef}>
          {ringing && <span className="cc-fab__ring" ref={pulseRef} aria-hidden />}
          {snoozed && (
            <span className="cc-fab__snooze-badge" aria-hidden title="Snoozed call">
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2M9 2h6M10 5.5 8 3" />
              </svg>
            </span>
          )}
          <CatyPulseIcon size={28} />
        </span>
      </button>
      <DockCallRing
        centerX={pos.x + 38.5}
        centerY={pos.y + 38.5}
        open={fanOpen}
        variant={ringing ? 'ringing' : 'snoozed'}
        onOpen={openRing}
        onClose={closeRing}
        onDecline={() => { setRingHovered(false); decline(); }}
        onSnooze={() => { setRingHovered(false); snooze(); }}
        onAccept={() => { setRingHovered(false); accept(); }}
      />
    </>
  );
}

export default IncomingHuddleFab;

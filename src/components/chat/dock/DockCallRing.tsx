// src/components/chat/dock/DockCallRing.tsx
import React from 'react';

/**
 * DockCallRing — incoming-huddle actions that fan out around the chat FAB while
 * it vibrates. Hovering the FAB reveals three round icon buttons: decline
 * (left), snooze (top), accept (right). The container is click-through
 * (pointer-events: none) EXCEPT the buttons themselves, so the FAB underneath
 * stays draggable.
 */

type Props = {
  centerX: number;
  centerY: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDecline: () => void;
  onSnooze: () => void;
  onAccept: () => void;
};

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

// 0deg = right, -90deg = up, 180deg = left (screen y-down).
// decline/accept sit wide + smaller; snooze rides on top.
const ACTIONS = [
  { key: 'decline', angle: 180, r: 58, size: 38, iconSize: 17, title: 'Decline', bg: 'var(--ds-background-danger-bold)', Icon: PhoneDownIcon },
  { key: 'snooze', angle: -90, r: 48, size: 44, iconSize: 20, title: 'Snooze 1 hour', bg: 'var(--ds-background-neutral-bold)', Icon: SnoozeIcon },
  { key: 'accept', angle: 0, r: 58, size: 38, iconSize: 17, title: 'Accept', bg: 'var(--ds-background-success-bold)', Icon: PhoneIcon },
] as const;

export function DockCallRing({ centerX, centerY, open, onOpen, onClose, onDecline, onSnooze, onAccept }: Props) {
  const handlers: Record<string, () => void> = { decline: onDecline, snooze: onSnooze, accept: onAccept };
  const fanRef = React.useRef<HTMLDivElement>(null);

  // rAF entrance: swing the fan in around the FAB centre. Inline transforms
  // bypass the global prefers-reduced-motion CSS-animation reset in index.css.
  React.useEffect(() => {
    if (!open) return;
    const el = fanRef.current;
    if (!el) return;
    let raf = 0;
    const t0 = performance.now();
    const DUR = 240;
    const loop = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.style.transform = `rotate(${(-55 * (1 - e)).toFixed(2)}deg) scale(${(0.55 + 0.45 * e).toFixed(3)})`;
      el.style.opacity = e.toFixed(3);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: centerX,
        top: centerY,
        width: 0,
        height: 0,
        zIndex: 601,
        pointerEvents: 'none',
      }}
    >
      <div className="cc-ring-fan" ref={fanRef} style={{ opacity: 0 }}>
        {ACTIONS.map((a) => {
          const p = polar(a.r, a.angle);
          const { Icon } = a;
          return (
            <button
              key={a.key}
              type="button"
              title={a.title}
              aria-label={a.title}
              onMouseEnter={onOpen}
              onMouseLeave={onClose}
              onClick={handlers[a.key]}
              style={{
                position: 'absolute',
                left: p.x - a.size / 2,
                top: p.y - a.size / 2,
                width: a.size,
                height: a.size,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: a.bg,
                color: 'var(--ds-text-inverse)',
                boxShadow: 'var(--ds-shadow-overlay)',
                pointerEvents: 'auto',
              }}
            >
              <Icon size={a.iconSize} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhoneIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.6 9.8a16 16 0 0 0 6 6l1.4-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function PhoneDownIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15.5c-2.5.8-5.2 1.2-9 1.2s-6.5-.4-9-1.2v-3c0-.6.4-1.1 1-1.3 1-.3 2-.5 3-.6.6-.1 1.1.3 1.2.9l.3 1.6c2.1.4 4.3.4 6.4 0l.3-1.6c.1-.6.6-1 1.2-.9 1 .1 2 .3 3 .6.6.2 1 .7 1 1.3v3z" />
    </svg>
  );
}
function SnoozeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6M10 5.5 8 3" />
    </svg>
  );
}

export default DockCallRing;

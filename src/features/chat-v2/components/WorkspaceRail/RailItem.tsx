import React, { useRef, useState } from 'react';

interface RailItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badgeCount?: number;
  onClick?: () => void;
  /** When provided, this renders into a portal on hover (after a short open
   *  delay). Receives the trigger's bounding rect, a dismiss callback, and
   *  cancelClose / scheduleClose so the rendered preview can keep itself
   *  alive while the cursor hovers it (vs. the rail button). Only invoked
   *  when the rail item is NOT active. */
  renderHoverPreview?: (
    anchorRect: DOMRect,
    helpers: { dismiss: () => void; cancelClose: () => void; scheduleClose: () => void },
  ) => React.ReactNode;
}

const OPEN_DELAY_MS = 260;
const CLOSE_DELAY_MS = 140;

export function RailItem({
  icon,
  label,
  active = false,
  badgeCount,
  onClick,
  renderHoverPreview,
}: RailItemProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hovered, setHovered] = useState(false);

  const clearTimers = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleOpen = () => {
    if (active || !renderHoverPreview) return;
    clearTimers();
    openTimerRef.current = window.setTimeout(() => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setAnchorRect(r);
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => {
      setAnchorRect(null);
    }, CLOSE_DELAY_MS);
  };

  const dismiss = () => {
    clearTimers();
    setAnchorRect(null);
  };

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setHovered(false); dismiss(); onClick?.(); }}
        onMouseEnter={() => {
          setHovered(true);
          scheduleOpen();
        }}
        onMouseLeave={() => {
          setHovered(false);
          scheduleClose();
        }}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: 52,
          padding: '8px 4px',
          background: !active && hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--cv2-radius-md)',
          // The rail itself is always dark (purple) regardless of theme, so
          // never resolve to a theme-aware text color here — it would invert to
          // near-black in light mode and disappear against the dark pocket.
          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.78)',
          cursor: 'pointer',
          transition: 'background var(--cv2-transition-fast)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--cv2-radius-md)',
            background: active ? 'var(--cv2-bg-rail-active)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontFamily: 'var(--cv2-font)',
            fontSize: 'var(--cv2-fs-rail-label)',
            fontWeight: active ? 600 : 500,
            color: 'inherit',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </span>
        {!!badgeCount && badgeCount > 0 && (
          <span
            aria-label={`${badgeCount} unread`}
            style={{
              position: 'absolute',
              top: 2,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              background: 'var(--cv2-unread)',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
      {anchorRect && renderHoverPreview &&
        renderHoverPreview(anchorRect, { dismiss, cancelClose, scheduleClose })}
    </>
  );
}

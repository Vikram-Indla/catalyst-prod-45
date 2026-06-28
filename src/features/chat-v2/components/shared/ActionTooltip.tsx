import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ActionTooltipProps {
  anchorEl: HTMLElement | null;
  label: string;
  shortcut?: string;
  visible: boolean;
}

/**
 * Slack-style hover tooltip — dark pill with label on top and an
 * optional keyboard-shortcut chip below. Portaled so it isn't clipped
 * by overflowed containers.
 */
export function ActionTooltip({ anchorEl, label, shortcut, visible }: ActionTooltipProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!visible || !anchorEl) return;
    setRect(anchorEl.getBoundingClientRect());
    const onScroll = () => setRect(anchorEl.getBoundingClientRect());
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [visible, anchorEl]);

  if (!visible || !rect) return null;

  const centerX = rect.left + rect.width / 2;
  const top = rect.top - 8;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        top,
        left: centerX,
        transform: 'translate(-50%, -100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
        zIndex: 'var(--cv2-tooltip-z, 1200)' as any,
      }}
    >
      <div
        style={{
          padding: '6px 10px',
// TODO: ads-unmapped — #1D1D1F context unclear
          background: '#1D1D1F',
          color: 'var(--ds-text-inverse, #FFFFFF)',
          borderRadius: 6,
          fontFamily: 'var(--cv2-font)',
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 16px var(--ds-shadow-raised, rgba(0,0,0,0.35))',
        }}
      >
        {label}
      </div>
      {shortcut && (
        <div
          style={{
            padding: '2px 8px',
// TODO: ads-unmapped — #1D1D1F context unclear
            background: '#1D1D1F',
            color: 'var(--ds-text-inverse, #FFFFFF)',
            borderRadius: 4,
            fontFamily: 'var(--cv2-font)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {shortcut}
        </div>
      )}
    </div>,
    document.body,
  );
}

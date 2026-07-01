/**
 * DesignPopover — Jira-parity design (Figma) affordance on a kanban card.
 *
 * Trigger: brush icon that sits alongside the priority/flag icons in the
 * card footer. Icon stroke is subtle by default and flips to the ADS
 * brand blue when hovered or the popover is open.
 *
 * On click, opens a small popover listing every ph_designs row for the
 * issue — file name (parsed from the URL) rendered as a blue link that
 * opens the Figma file in a new tab + a "Last updated <relative>" caption.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';

/* Inline SVG modelled on Jira's design brush glyph (Screenshot 2026-07-01
   215231). Angled handle down-left, wide fanning bristles up-right — no
   lucide-react icon matches this shape exactly. Uses currentColor so the
   caller can drive stroke via the color prop. */
const JiraBrushIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    {/* Handle — diagonal from top-right toward center. */}
    <path
      d="M20.7 3.3a1 1 0 0 0-1.4 0l-7.6 7.6 1.4 1.4 7.6-7.6a1 1 0 0 0 0-1.4z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Brush head + fanning bristles toward bottom-left. */}
    <path
      d="M12 12l-3 3c-1 1-2 1-3 1-1 0-2 0-3 1 1 1 3 2 5 2 3 0 5-2 5-5 0-1 0-2-1-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
import { figmaFileName, type CardDesignRow } from '../data/useCardDesigns';

interface Props {
  designs: CardDesignRow[];
  size?: number;
}

const MARGIN = 8;
const GAP = 6;
const HOVER_CLOSE_DELAY = 180;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60)   return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60)   return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)    return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30)   return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12)    return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

export const DesignPopover: React.FC<Props> = ({ designs, size = 16 }) => {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Delay-close timer so the user can move the cursor across the gap
  // between the brush icon and the popover portal without dismissing.
  const closeTimer = useRef<number | null>(null);
  const cancelPendingClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const close = useCallback(() => {
    cancelPendingClose();
    setOpen(false);
    setPos(null);
  }, [cancelPendingClose]);
  const scheduleClose = useCallback(() => {
    cancelPendingClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
      setPos(null);
    }, HOVER_CLOSE_DELAY);
  }, [cancelPendingClose]);
  const requestOpen = useCallback(() => {
    cancelPendingClose();
    setOpen(true);
  }, [cancelPendingClose]);
  useEffect(() => () => cancelPendingClose(), [cancelPendingClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);

  const recompute = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    const p = popRef.current?.getBoundingClientRect();
    if (!a || !p) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = a.right - p.width;
    if (left < MARGIN) left = MARGIN;
    if (left + p.width > vw - MARGIN) left = vw - p.width - MARGIN;
    let top = a.bottom + GAP;
    if (top + p.height > vh - MARGIN) top = Math.max(MARGIN, a.top - GAP - p.height);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => { if (open) recompute(); }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(recompute);
    if (popRef.current) ro.observe(popRef.current);
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, recompute]);

  const brushColor = open
    ? token('color.icon.brand', 'var(--ds-icon-brand)')
    : token('color.icon.subtle', 'var(--ds-icon-subtle)');

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`${designs.length} design${designs.length === 1 ? '' : 's'} attached`}
        title="Designs"
        onMouseEnter={requestOpen}
        onMouseLeave={scheduleClose}
        onFocus={requestOpen}
        onClick={(e) => { e.stopPropagation(); open ? close() : requestOpen(); }}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, padding: 0,
          border: 'none', background: 'transparent', cursor: 'pointer',
        }}
      >
        <JiraBrushIcon size={size} color={brushColor} />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={cancelPendingClose}
          onMouseLeave={scheduleClose}
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            minWidth: 260, maxWidth: 340,
            padding: '8px 0',
            background: token('elevation.surface.overlay', 'var(--ds-surface-overlay)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 6,
            boxShadow: token('elevation.shadow.overlay', 'var(--ds-shadow-overlay)'),
            zIndex: 9999,
          }}
        >
          {designs.map((d) => {
            const name = figmaFileName(d.url);
            return (
              <div
                key={d.id}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '6px 12px',
                }}
              >
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    fontSize: 'var(--ds-font-size-300)',
                    color: token('color.text.brand', 'var(--ds-text-brand)'),
                    textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {name}
                </a>
                <span style={{
                  fontSize: 'var(--ds-font-size-100)',
                  color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
                }}>
                  Last updated {relativeTime(d.updated_at)}
                </span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};

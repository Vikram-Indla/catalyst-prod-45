/**
 * WebLinkRow — single saved web link rendered in the Web Links section.
 *
 * Spec:
 *   - Link icon + display label (link_text, or URL hostname if no text)
 *   - Hover: gray background + X icon at the row's right end to unlink
 *   - Hover (300ms dwell): floating card with
 *       • link icon + clickable blue URL (a bit larger)
 *       • description (link_text)
 *       • "Copy link" button — gray hover, copies URL to clipboard
 *
 * The hover card is rendered via React portal with position:fixed so it
 * escapes any ancestor overflow:hidden / overflow:auto clipping
 * (cv-drawer-body in fullPageMode etc.), same pattern as the
 * InlineCreateWithAI dropdown.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LinkIcon from '@atlaskit/icon/core/link';
import CopyIcon from '@atlaskit/icon/core/copy';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { catalystToast } from '@/lib/catalystToast';
import type { WebLinkRow as WebLinkRowData } from './useWebLinks';

const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 100;

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export interface WebLinkRowProps {
  link: WebLinkRowData;
  onUnlink: (id: string) => Promise<void> | void;
}

export function WebLinkRow({ link, onUnlink }: WebLinkRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowHovered, setRowHovered] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardRect, setCardRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyHovered, setCopyHovered] = useState(false);

  const hasLinkText = !!(link.link_text && link.link_text.trim().length > 0);
  const label = hasLinkText ? link.link_text! : hostFromUrl(link.url);
  // Card top-line label: link_text wins; only fall back to the URL
  // when no link_text was provided. Spec point #3.
  const cardTopLabel = hasLinkText ? link.link_text! : link.url;

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimerRef.current = setTimeout(() => setCardOpen(true), HOVER_OPEN_DELAY_MS);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setCardOpen(false), HOVER_CLOSE_DELAY_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Track + recompute the card's portal position from the row's bounding rect.
  useLayoutEffect(() => {
    if (!cardOpen) {
      setCardRect(null);
      return;
    }
    const updatePosition = () => {
      const el = rowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCardRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [cardOpen]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      catalystToast.success('Link copied');
    } catch {
      catalystToast.error('Failed to copy link');
    }
  }, [link.url]);

  return (
    <>
      <div
        ref={rowRef}
        onMouseEnter={() => { setRowHovered(true); scheduleOpen(); }}
        onMouseLeave={() => { setRowHovered(false); scheduleClose(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 4,
          // Saved row gets a discrete card affordance — gray border +
          // light elevation shadow. Hover deepens the background.
          background: rowHovered
            ? 'var(--ds-background-neutral-hovered, #F1F2F4)'
            : 'var(--cp-bg-elevated, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          boxShadow: '0 1px 2px var(--ds-background-neutral-subtle-pressed, rgba(9, 30, 66, 0.08))',
          transition: 'background 0.12s, box-shadow 0.12s',
          cursor: 'default',
        }}
      >
        <LinkIcon label="" color="var(--ds-text-subtle, #505258)" />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setLinkHovered(true)}
          onMouseLeave={() => setLinkHovered(false)}
          style={{
            // Sized to content (not flex:1) so the hover hit-area is the
            // text itself, not the entire row width. `0 1 auto` lets it
            // shrink-truncate when the text is longer than the row.
            flex: '0 1 auto',
            minWidth: 0,
            maxWidth: '100%',
            fontSize: 'var(--ds-font-size-400)',
            color: linkHovered
              ? 'var(--ds-text-subtle, #6B6E76)'
              : 'var(--ds-text, #292A2E)',
            textDecoration: linkHovered ? 'underline' : 'none',
            textDecorationColor: linkHovered ? 'var(--ds-text, #000000)' : 'transparent',
            textUnderlineOffset: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          {label}
        </a>
        {/* Spacer pushes the X to the right end without giving the
            anchor a wide hit-area. */}
        <div style={{ flex: 1, minWidth: 0 }} />
        {rowHovered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void onUnlink(link.id);
            }}
            title="Unlink"
            aria-label="Unlink web link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 3,
              color: 'var(--ds-text-subtle, #505258)',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <CrossIcon size="small" label="" primaryColor="var(--ds-text-subtle, #505258)" />
          </button>
        )}
      </div>

      {cardOpen && cardRect && createPortal(
        <div
          onMouseEnter={() => { clearTimers(); setCardOpen(true); }}
          onMouseLeave={scheduleClose}
          style={{
            position: 'fixed',
            top: cardRect.top,
            left: cardRect.left,
            width: cardRect.width,
            maxWidth: 420,
            background: 'var(--cp-bg-elevated, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 6,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 12px rgba(9,30,66,0.15), 0 0 1px rgba(9,30,66,0.31))',
            padding: 12,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontFamily: 'var(--cp-font-body)',
          }}
          role="tooltip"
        >
          {/* Header: link icon + link_text in blue (fallback to URL).
              Spec point #3: prefer the user's link_text over the raw URL. */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ flexShrink: 0, marginTop: 2 }}>
              <LinkIcon label="" color="var(--ds-link, #0052CC)" />
            </span>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 600,
                color: 'var(--ds-link, #0052CC)',
                textDecoration: 'none',
                wordBreak: 'break-word',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              {cardTopLabel}
            </a>
          </div>

          {/* Static descriptive blurb (spec point #6). */}
          <div
            style={{
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--ds-text-subtle, #505258)',
              lineHeight: '18px',
              wordBreak: 'break-word',
            }}
          >
            This domain is for use in documentation examples without needing
            permission. Avoid use in operations.
          </div>

          {/* Footer: Copy link button */}
          <div style={{ borderTop: '1px solid var(--ds-border-subtle, #EBECF0)', paddingTop: 8 }}>
            <button
              type="button"
              onClick={handleCopyUrl}
              onMouseEnter={() => setCopyHovered(true)}
              onMouseLeave={() => setCopyHovered(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                border: 'none',
                background: copyHovered
                  ? 'var(--ds-background-neutral-hovered, #F1F2F4)'
                  : 'transparent',
                color: 'var(--ds-text, #292A2E)',
                fontSize: 'var(--ds-font-size-300)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'background 0.12s',
              }}
            >
              <CopyIcon label="" color="var(--ds-text-subtle, #505258)" />
              Copy link
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default WebLinkRow;

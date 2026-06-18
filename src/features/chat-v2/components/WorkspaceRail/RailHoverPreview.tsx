/**
 * RailHoverPreview — Slack-style hover popover anchored to a rail icon.
 *
 * Shows on hover (with a short open delay so quick mouse passes don't trigger
 * it) when the user is NOT currently on that rail item's view. Currently used
 * by the Activity rail item to surface the top unread items without leaving
 * the current view.
 *
 * Positioned to the right of the rail (which itself sits at the left edge of
 * the shell), with a viewport-aware clamp on the vertical axis.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import type { ActivityItem } from '../../hooks/useActivityFeed';

interface RailHoverPreviewProps {
  /** Bounding rect of the rail item the popover anchors to. */
  anchorRect: DOMRect;
  /** Top N items to render in the preview. */
  items: ActivityItem[];
  /** Total unread count (shown as a badge in the header). */
  totalUnread: number;
  /** Section title (e.g. "Activity", "DMs"). */
  title: string;
  /** Called when the user clicks the "Open" CTA or any item. */
  onOpen: () => void;
  /** Stay-open / dismiss hooks so the parent can keep the popover alive while
   *  the cursor is over it. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const POPOVER_W = 320;
const MAX_ITEMS = 5;

export function RailHoverPreview({
  anchorRect,
  items,
  totalUnread,
  title,
  onOpen,
  onMouseEnter,
  onMouseLeave,
}: RailHoverPreviewProps) {
  const vh = window.innerHeight;
  // Anchor 8px to the right of the rail item. Clamp vertically inside the
  // viewport with a 12px margin.
  const left = anchorRect.right + 8;
  const desiredTop = anchorRect.top;
  const estimatedHeight = 64 + Math.min(items.length, MAX_ITEMS) * 64 + 44;
  let top = desiredTop;
  if (top + estimatedHeight > vh - 12) top = Math.max(12, vh - estimatedHeight - 12);

  const visible = items.slice(0, MAX_ITEMS);

  return createPortal(
    <div
      role="dialog"
      aria-label={`${title} preview`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top,
        left,
        width: POPOVER_W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        zIndex: 'var(--cv2-popover-z, 1100)' as never,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--cv2-border)',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--cv2-text-strong)',
          }}
        >
          {title}
        </span>
        {totalUnread > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 18,
              padding: '0 6px',
              borderRadius: 9,
              background: 'var(--cv2-unread)',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>
      {visible.length === 0 ? (
        <div
          style={{
            padding: '20px 14px',
            fontSize: 13,
            color: 'var(--cv2-text-muted)',
            textAlign: 'center',
          }}
        >
          You’re all caught up.
        </div>
      ) : (
        <ul style={{ margin: 0, padding: '4px 0', listStyle: 'none' }}>
          {visible.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={onOpen}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                  padding: '8px 14px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <PresenceAvatar
                  name={item.authorName}
                  avatarUrl={item.authorAvatarUrl}
                  size={28}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--cv2-text-strong)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.authorName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--cv2-text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.body || (item.kind === 'thread' ? 'Untitled' : '')}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--cv2-border)',
          background: 'var(--cv2-bg-panel)',
        }}
      >
        <button
          type="button"
          onClick={onOpen}
          style={{
            width: '100%',
            height: 28,
            background: 'transparent',
            color: 'var(--cv2-text-link)',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Open {title}
        </button>
      </div>
    </div>,
    document.body,
  );
}

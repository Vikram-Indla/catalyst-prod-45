/**
 * ChatBookmarksPanel — middle-pane content when IconRail.activeKey === 'saved'.
 * Lists the caller's personal bookmarks (chat_bookmarks). Click → open
 * source conversation. Toggle removes bookmark.
 */
import React from 'react';
import { useMyBookmarks, useToggleBookmark } from '@/hooks/chat/usePinsBookmarks';

export interface ChatBookmarksPanelProps {
  onOpenConversation?: (conversationId: string) => void;
}

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ChatBookmarksPanel({ onOpenConversation }: ChatBookmarksPanelProps) {
  const { data: bookmarks = [], isLoading } = useMyBookmarks();
  const toggleBookmark = useToggleBookmark();

  return (
    <div className="cc-convlist">
      <div className="cc-cl-head">
        <div className="cc-cl-head__ttl">Saved</div>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>
        {isLoading && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
            Loading…
          </div>
        )}
        {!isLoading && bookmarks.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
            Nothing saved yet. Click the bookmark icon on any message to save it for later.
          </div>
        )}
        {bookmarks.map((b) => (
          <div
            key={b.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            }}
          >
            <button
              type="button"
              onClick={() => onOpenConversation?.(b.conversation_id)}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                <span style={{ fontWeight: 500 }}>Saved message</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>
                  {relative(b.created_at)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--ds-text-subtle, #44546F)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {b.note ?? 'Open conversation to view'}
              </div>
            </button>
            <button
              type="button"
              aria-label="Remove bookmark"
              onClick={() =>
                toggleBookmark.mutate({
                  conversationId: b.conversation_id,
                  messageId: b.message_id,
                  currentlyBookmarked: true,
                })
              }
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'var(--ds-text-subtle, #44546F)',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatBookmarksPanel;

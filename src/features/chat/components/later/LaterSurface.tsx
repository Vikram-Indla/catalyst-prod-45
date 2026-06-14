import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Avatar from '@atlaskit/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useMyBookmarks, useToggleBookmark } from '@/hooks/chat/usePinsBookmarks';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './later.css';

const db = supabase as unknown as { from: (t: string) => any };

// ── Types ──────────────────────────────────────────────────────────────────

interface LaterItem {
  bookmarkId: string;
  messageId: string;
  conversationId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  conversationTitle: string;
  preview: string;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

// ── Hydration: bookmarks -> message body + author + conversation ────────────

async function hydrateBookmarks(
  bookmarks: Array<{ id: string; message_id: string; conversation_id: string; created_at: string }>,
): Promise<LaterItem[]> {
  if (bookmarks.length === 0) return [];

  const messageIds = bookmarks.map(b => b.message_id);

  // Message bodies
  const { data: msgRows } = await db
    .from('chat_messages')
    .select('id, body_text, author_id, created_at, conversation_id')
    .in('id', messageIds);

  const msgById = new Map<string, any>();
  for (const m of (msgRows ?? []) as any[]) msgById.set(m.id, m);

  // Authors + conversations — only for messages we actually resolved
  const authorIds = new Set<string>();
  const convIds = new Set<string>();
  for (const m of (msgRows ?? []) as any[]) {
    if (m.author_id) authorIds.add(m.author_id);
    if (m.conversation_id) convIds.add(m.conversation_id);
  }

  const authorsById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  const convsById = new Map<string, { title: string | null }>();

  if (authorIds.size > 0) {
    const { data: authors } = await db
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(authorIds));
    for (const a of (authors ?? []) as any[]) authorsById.set(a.id, a);
  }
  if (convIds.size > 0) {
    const { data: convs } = await db
      .from('chat_conversations')
      .select('id, title')
      .in('id', Array.from(convIds));
    for (const c of (convs ?? []) as any[]) convsById.set(c.id, c);
  }

  const items: LaterItem[] = [];
  for (const b of bookmarks) {
    const msg = msgById.get(b.message_id);
    if (!msg) continue; // message gone — skip rather than fabricate

    const author = msg.author_id ? authorsById.get(msg.author_id) : undefined;
    const conv = convsById.get(msg.conversation_id);
    items.push({
      bookmarkId: b.id,
      messageId: b.message_id,
      conversationId: msg.conversation_id ?? b.conversation_id,
      authorName: author?.full_name ?? 'Unknown',
      authorAvatarUrl: author?.avatar_url ?? null,
      conversationTitle: conv?.title ?? 'a conversation',
      preview: msg.body_text ?? '',
      createdAt: b.created_at,
    });
  }

  return items;
}

// ── LaterSurface ─────────────────────────────────────────────────────────────

interface Props {
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  /** True when the Later view is currently shown */
  isActive?: boolean;
}

export function LaterSurface({ onOpenConversation, isActive = false }: Props) {
  const { data: bookmarks = [], isLoading: bookmarksLoading } = useMyBookmarks();
  const toggleBookmark = useToggleBookmark();

  const bookmarkKey = useMemo(
    () => bookmarks.map(b => `${b.id}:${b.message_id}`).join(','),
    [bookmarks],
  );

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['chat', 'later', 'hydrated', bookmarkKey],
    queryFn: () => hydrateBookmarks(bookmarks),
    enabled: !bookmarksLoading,
  });

  const isLoading = bookmarksLoading || (bookmarks.length > 0 && itemsLoading);

  const handleRemove = (e: React.MouseEvent, item: LaterItem) => {
    e.stopPropagation();
    toggleBookmark.mutate({
      conversationId: item.conversationId,
      messageId: item.messageId,
      currentlyBookmarked: true,
    });
  };

  return (
    <div className="c-chat-later c-later" data-surface="later" aria-label="Later">
      {/* Header */}
      <header className="c-later__hdr">
        <h2 className="c-later__title">Later</h2>
      </header>

      {/* Content */}
      <div className="c-later__scroll">
        {isLoading && (
          <div className="c-feed__skeleton" aria-hidden="true">
            {[['60%', '80%'], ['45%', '70%'], ['75%', '55%']].map((lines, i) => (
              <div key={i} className="c-skel-row" style={{ padding: '0 24px' }}>
                <div className="c-skel-avatar" />
                <div className="c-skel-lines">
                  {lines.map((w, j) => <div key={j} className="c-skel-line" style={{ width: w }} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="c-later__empty">
            <span className="c-later__empty__icon" aria-hidden="true">🔖</span>
            <p>Nothing saved yet</p>
            <p style={{ color: 'var(--c-chat-text-subtlest)' }}>
              Save messages to find them here later.
            </p>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <>
            <div className="c-later__section">Saved</div>
            {items.map(item => (
              <div
                key={item.bookmarkId}
                className="c-later-item"
                onClick={() => onOpenConversation(item.conversationId, item.messageId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenConversation(item.conversationId, item.messageId);
                  }
                }}
                aria-label={`Saved message from ${item.authorName} in ${item.conversationTitle}`}
              >
                <div className="c-later-item__avatar">
                  <Avatar
                    name={item.authorName}
                    src={item.authorAvatarUrl ?? undefined}
                    size="medium"
                    appearance="circle"
                  />
                </div>
                <div className="c-later-item__body">
                  <div className="c-later-item__meta">
                    <span className="c-later-item__who">{item.authorName}</span>
                    <span className="c-later-item__ts">{getRelativeTime(item.createdAt)}</span>
                  </div>
                  <div className="c-later-item__where">in {item.conversationTitle}</div>
                  {item.preview && (
                    <div className="c-later-item__preview">
                      {item.preview.length > 120 ? `${item.preview.slice(0, 120)}…` : item.preview}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="c-later-item__remove"
                  onClick={e => handleRemove(e, item)}
                  aria-label="Remove from later"
                  title="Remove from later"
                >
                  Remove
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

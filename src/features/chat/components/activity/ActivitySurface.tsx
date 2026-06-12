import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './activity.css';

// ── Types ──────────────────────────────────────────────────────────────────

type ActivityKind = 'mention' | 'reaction' | 'reply' | 'all';

interface ActivityItem {
  id: string;
  kind: 'mention' | 'reaction' | 'reply';
  actorName: string;
  actorAvatarUrl: string | null;
  conversationTitle: string;
  conversationId: string;
  messageId: string;
  preview: string;
  createdAt: string;
  isRead: boolean;
}

// ── DB layer ───────────────────────────────────────────────────────────────

const db = supabase as unknown as { from: (t: string) => any };

async function fetchActivity(userId: string): Promise<ActivityItem[]> {
  try {
    const items: ActivityItem[] = [];

    // ── Resolve self name for mention detection ────────────────────────────
    let selfName = '';
    {
      const { data } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      selfName = (data as any)?.full_name ?? '';
    }

    // ── 1. Replies to user's messages ──────────────────────────────────────
    const { data: replyRows } = await db
      .from('chat_messages')
      .select(`
        id, body_text, created_at, author_id, conversation_id, parent_id,
        parent:chat_messages!parent_id(author_id)
      `)
      .not('parent_id', 'is', null)
      .eq('parent.author_id', userId)
      .neq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    // ── 2. Mentions via @name in body_text ────────────────────────────────
    const mentionRows: any[] = [];
    if (selfName) {
      const { data } = await db
        .from('chat_messages')
        .select('id, body_text, created_at, author_id, conversation_id')
        .ilike('body_text', `%@${selfName}%`)
        .neq('author_id', userId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) mentionRows.push(...(data as any[]));
    }

    // ── 3. Reactions on user's own messages ────────────────────────────────
    const reactionItems: Array<{
      reactorId: string;
      emoji: string;
      messageId: string;
      bodyText: string;
      conversationId: string;
      createdAt: string;
    }> = [];
    {
      const { data: ownMsgs } = await db
        .from('chat_messages')
        .select('id, body_text, conversation_id, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ownMsgs && (ownMsgs as any[]).length > 0) {
        const ownIds = (ownMsgs as any[]).map((m: any) => m.id);
        const ownMsgMap = new Map<string, any>();
        for (const m of ownMsgs as any[]) ownMsgMap.set(m.id, m);

        const { data: rrows } = await db
          .from('chat_message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', ownIds)
          .neq('user_id', userId);

        if (rrows) {
          for (const r of rrows as any[]) {
            const msg = ownMsgMap.get(r.message_id);
            if (msg) {
              reactionItems.push({
                reactorId: r.user_id,
                emoji: r.emoji,
                messageId: r.message_id,
                bodyText: msg.body_text ?? '',
                conversationId: msg.conversation_id,
                createdAt: msg.created_at,
              });
            }
          }
        }
      }
    }

    // ── Batch-resolve authors and conversations ────────────────────────────
    const allAuthorIds = new Set<string>();
    const allConvIds = new Set<string>();

    for (const r of (replyRows ?? []) as any[]) {
      allAuthorIds.add(r.author_id);
      allConvIds.add(r.conversation_id);
    }
    for (const r of mentionRows) {
      allAuthorIds.add(r.author_id);
      allConvIds.add(r.conversation_id);
    }
    for (const ri of reactionItems) {
      allAuthorIds.add(ri.reactorId);
      allConvIds.add(ri.conversationId);
    }

    const authorsById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    const convsById = new Map<string, { title: string }>();

    if (allAuthorIds.size > 0) {
      const { data: authors } = await db
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(allAuthorIds));
      if (authors) {
        for (const a of authors as any[]) authorsById.set(a.id, a);
      }
    }
    if (allConvIds.size > 0) {
      const { data: convs } = await db
        .from('chat_conversations')
        .select('id, title')
        .in('id', Array.from(allConvIds));
      if (convs) {
        for (const c of convs as any[]) convsById.set(c.id, c);
      }
    }

    // ── Build reply items ──────────────────────────────────────────────────
    if (replyRows) {
      for (const r of replyRows as any[]) {
        const author = authorsById.get(r.author_id);
        const conv = convsById.get(r.conversation_id);
        items.push({
          id: `reply-${r.id}`,
          kind: 'reply',
          actorName: author?.full_name ?? 'Someone',
          actorAvatarUrl: author?.avatar_url ?? null,
          conversationTitle: conv?.title ?? 'a conversation',
          conversationId: r.conversation_id,
          messageId: r.id,
          preview: r.body_text ?? '',
          createdAt: r.created_at,
          isRead: false,
        });
      }
    }

    // ── Build mention items ────────────────────────────────────────────────
    for (const r of mentionRows) {
      const author = authorsById.get(r.author_id);
      const conv = convsById.get(r.conversation_id);
      items.push({
        id: `mention-${r.id}`,
        kind: 'mention',
        actorName: author?.full_name ?? 'Someone',
        actorAvatarUrl: author?.avatar_url ?? null,
        conversationTitle: conv?.title ?? 'a conversation',
        conversationId: r.conversation_id,
        messageId: r.id,
        preview: r.body_text ?? '',
        createdAt: r.created_at,
        isRead: false,
      });
    }

    // ── Build reaction items ───────────────────────────────────────────────
    for (const ri of reactionItems) {
      const actor = authorsById.get(ri.reactorId);
      const conv = convsById.get(ri.conversationId);
      items.push({
        id: `reaction-${ri.reactorId}-${ri.emoji}-${ri.messageId}`,
        kind: 'reaction',
        actorName: actor?.full_name ?? 'Someone',
        actorAvatarUrl: actor?.avatar_url ?? null,
        conversationTitle: conv?.title ?? 'a conversation',
        conversationId: ri.conversationId,
        messageId: ri.messageId,
        preview: ri.bodyText,
        createdAt: ri.createdAt,
        isRead: false,
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getRelativeTimeForTest(iso: string): string {
  return getRelativeTime(iso);
}

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

const KIND_ICON: Record<string, string> = {
  mention: '💬',
  reaction: '😄',
  reply: '↩️',
};

const KIND_LABEL: Record<string, string> = {
  mention: 'mentioned you',
  reaction: 'reacted to your message',
  reply: 'replied to your message',
};

// ── Tab definitions ────────────────────────────────────────────────────────

const TABS: { id: ActivityKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mention', label: 'Mentions' },
  { id: 'reply', label: 'Replies' },
  { id: 'reaction', label: 'Reactions' },
];

// ── ActivitySurface ────────────────────────────────────────────────────────

interface Props {
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  /** Called whenever the unread count changes (for AppRail badge) */
  onUnreadCount?: (count: number) => void;
}

export function ActivitySurface({ onOpenConversation, onUnreadCount }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<ActivityKind>('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['chat', 'activity', user?.id],
    queryFn: () => (user?.id ? fetchActivity(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Bubble unread count up to AppRail badge
  useEffect(() => {
    if (!onUnreadCount) return;
    const unread = items.filter(i => !i.isRead).length;
    onUnreadCount(unread);
  }, [items, onUnreadCount]);

  const filtered = tab === 'all' ? items : items.filter(i => i.kind === tab);

  return (
    <div className="c-chat-activity c-activity" aria-label="Activity">
      {/* Header */}
      <header className="c-activity__hdr">
        <h2 className="c-activity__title">Activity</h2>
      </header>

      {/* Tabs */}
      <div className="c-activity__tabs" role="tablist" aria-label="Activity filters">
        {TABS.map(t => (
          <button
            key={t.id}
            className="c-activity__tab"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="c-activity__scroll" role="tabpanel">
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

        {!isLoading && filtered.length === 0 && (
          <div className="c-activity__empty">
            <span className="c-activity__empty__icon">🔔</span>
            <p>No {tab === 'all' ? '' : tab} activity yet.</p>
            <p style={{ color: 'var(--c-chat-text-subtlest)' }}>
              {tab === 'all'
                ? "You'll see mentions, replies, and reactions here."
                : `You'll see ${tab}s here when they arrive.`}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            <div className="c-act-section">Recent</div>
            {filtered.map(item => (
              <div
                key={item.id}
                className="c-act-item"
                data-unread={String(item.isRead === false)}
                onClick={() => onOpenConversation(item.conversationId, item.messageId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenConversation(item.conversationId, item.messageId);
                  }
                }}
                aria-label={`${item.actorName} ${KIND_LABEL[item.kind]} in ${item.conversationTitle}`}
              >
                <div className="c-act-item__icon" aria-hidden="true">
                  {KIND_ICON[item.kind]}
                </div>
                <div className="c-act-item__body">
                  <div className="c-act-item__meta">
                    <span className="c-act-item__who">{item.actorName}</span>
                    <span className="c-act-item__ts">{getRelativeTime(item.createdAt)}</span>
                  </div>
                  <div className="c-act-item__where">
                    {KIND_LABEL[item.kind]} in {item.conversationTitle}
                  </div>
                  {item.preview && (
                    <div className="c-act-item__preview">
                      {item.preview.length > 120 ? `${item.preview.slice(0, 120)}…` : item.preview}
                    </div>
                  )}
                </div>
                {!item.isRead && <div className="c-act-item__dot" aria-label="Unread" />}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

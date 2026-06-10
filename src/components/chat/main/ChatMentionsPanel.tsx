/**
 * ChatMentionsPanel — Activity feed pane (IconRail key 'activity').
 * All / DMs / Mentions / Threads tabs, all wired to real data.
 */
import React, { useMemo, useState } from 'react';
import { useChatMentions, useMarkMentionRead } from '@/hooks/chat/useChatMentions';
import { useConversations } from '@/hooks/chat/useConversations';
import { useThreadActivity } from '@/hooks/chat/useThreadActivity';
import { MentionToken } from './MentionToken';

export interface ChatMentionsPanelProps {
  /** Called with the chat_messages.id of the mention so the host can open it. */
  onOpenMessage?: (messageId: string) => void;
}

type ActivityTab = 'all' | 'dms' | 'mentions' | 'threads';

const TABS: Array<{ key: ActivityTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'dms', label: 'DMs' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'threads', label: 'Threads' },
];

const MENTION_RE = /(@[A-Za-z][A-Za-z .'-]*)/g;

function renderExcerpt(text: string): React.ReactNode[] {
  return text.split(MENTION_RE).map((part, i) =>
    MENTION_RE.test(part) ? (
      <MentionToken key={`m-${i}`} raw={part} />
    ) : (
      <React.Fragment key={`t-${i}`}>{part}</React.Fragment>
    ),
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = (x: Date) => x.toDateString();
  if (key(d) === key(today)) return 'Today';
  if (key(d) === key(yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
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

export function ChatMentionsPanel({ onOpenMessage }: ChatMentionsPanelProps) {
  const { data: mentions = [], isLoading: mentionsLoading } = useChatMentions();
  const { conversations, isLoading: convsLoading } = useConversations();
  const { data: threadItems = [], isLoading: threadsLoading } = useThreadActivity();
  const markRead = useMarkMentionRead();
  const [tab, setTab] = useState<ActivityTab>('all');

  const dmConversations = useMemo(
    () => conversations.filter((c) => c.kind === 'dm').slice(0, 30),
    [conversations],
  );

  const isLoading =
    tab === 'dms' ? convsLoading
    : tab === 'threads' ? threadsLoading
    : mentionsLoading;

  const emptyCopy: Record<ActivityTab, string> = {
    all: 'No activity yet. Mentions, thread replies and DM activity show here.',
    dms: 'No DM conversations yet.',
    mentions: "No mentions yet. You'll see @mentions of your name here.",
    threads: 'No thread activity yet.',
  };

  // Unified "All" feed — merge mentions + DM previews + thread replies, newest first
  const allFeedItems = useMemo(() => {
    type FeedItem = { id: string; kind: 'mention' | 'dm' | 'thread'; time: string; title: string; excerpt: string; entityId: string; unread: boolean };
    const items: FeedItem[] = [];
    for (const m of mentions) {
      items.push({ id: `m-${m.id}`, kind: 'mention', time: m.createdAt, title: m.entityKey ?? 'Mention', excerpt: m.entityTitle ?? '', entityId: m.entityId, unread: !m.readAt });
    }
    for (const c of dmConversations) {
      if (c.lastMessageAt) {
        items.push({ id: `d-${c.id}`, kind: 'dm', time: c.lastMessageAt, title: c.title, excerpt: c.lastMessagePreview ?? '', entityId: c.id, unread: c.unreadCount > 0 });
      }
    }
    for (const t of threadItems) {
      items.push({ id: `t-${t.id}`, kind: 'thread', time: t.createdAt, title: t.conversationTitle ?? 'Thread', excerpt: `${t.authorName}: ${t.bodyText.slice(0, 100)}`, entityId: t.conversationId, unread: false });
    }
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [mentions, dmConversations, threadItems]);

  let lastDay = '';

  return (
    <div className="cc-convlist cc-activity">
      <div className="cc-cl-head">
        <div className="cc-cl-head__ttl">Activity</div>
      </div>

      <div className="cc-activity__tabs" role="tablist" aria-label="Activity filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`cc-activity__tab${tab === t.key ? ' is-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="cc-cl-scroll">
        {isLoading && <div className="cc-empty">Loading…</div>}

        {/* DMs tab — real DM conversations */}
        {!isLoading && tab === 'dms' && (
          dmConversations.length === 0 ? (
            <div className="cc-empty">{emptyCopy.dms}</div>
          ) : (
            dmConversations.map((c) => (
              <div key={c.id} className="cc-activity__card">
                <button
                  type="button"
                  className="cc-activity__cardmain"
                  onClick={() => onOpenMessage?.(c.id)}
                >
                  <div className="cc-activity__context">
                    <span className="cc-activity__kind">DM</span>
                    <span className="cc-activity__chip">{c.title}</span>
                    {c.lastMessageAt && (
                      <span className="cc-activity__time">{relative(c.lastMessageAt)}</span>
                    )}
                  </div>
                  {c.lastMessagePreview && (
                    <div className="cc-activity__excerpt">{c.lastMessagePreview}</div>
                  )}
                </button>
              </div>
            ))
          )
        )}

        {/* Threads tab — real thread replies */}
        {!isLoading && tab === 'threads' && (
          threadItems.length === 0 ? (
            <div className="cc-empty">{emptyCopy.threads}</div>
          ) : (
            threadItems.map((item) => (
              <div key={item.id} className="cc-activity__card">
                <button
                  type="button"
                  className="cc-activity__cardmain"
                  onClick={() => onOpenMessage?.(item.conversationId)}
                >
                  <div className="cc-activity__context">
                    <span className="cc-activity__kind">Thread reply</span>
                    {item.conversationTitle && (
                      <span className="cc-activity__chip">{item.conversationTitle}</span>
                    )}
                    <span className="cc-activity__time">{relative(item.createdAt)}</span>
                  </div>
                  <div className="cc-activity__excerpt">
                    <strong>{item.authorName}</strong>: {item.bodyText.slice(0, 120)}
                  </div>
                </button>
              </div>
            ))
          )
        )}

        {/* Mentions tab — mentions feed only */}
        {!isLoading && tab === 'mentions' && (() => {
          if (mentions.length === 0) return <div className="cc-empty">{emptyCopy.mentions}</div>;
          return mentions.map((m) => {
            const unread = !m.readAt;
            const day = dayLabel(m.createdAt);
            const showDivider = day !== lastDay;
            lastDay = day;
            return (
              <React.Fragment key={m.id}>
                {showDivider && (
                  <div className="cc-divider cc-activity__day">
                    <div className="cc-divider__rule" />
                    <div className="cc-divider__pill">{day}</div>
                    <div className="cc-divider__rule" />
                  </div>
                )}
                <div className={`cc-activity__card${unread ? ' is-unread' : ''}`}>
                  <button type="button" className="cc-activity__cardmain" onClick={() => { markRead.mutate(m.id); onOpenMessage?.(m.entityId); }}>
                    <div className="cc-activity__context">
                      <span className="cc-activity__kind">Mention</span>
                      {m.entityKey && <span className="cc-activity__chip">{m.entityKey}</span>}
                      <span className="cc-activity__time">{relative(m.createdAt)}</span>
                    </div>
                    <div className="cc-activity__excerpt">{renderExcerpt(m.entityTitle ?? '')}</div>
                  </button>
                  <div className="cc-activity__actions">
                    {unread && (
                      <button type="button" className="cc-activity__action" aria-label="Mark read" title="Mark read" onClick={() => markRead.mutate(m.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
                      </button>
                    )}
                    <button type="button" className="cc-activity__action" aria-label="Open" title="Open" onClick={() => { markRead.mutate(m.id); onOpenMessage?.(m.entityId); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}

        {/* All tab — unified feed: mentions + DM previews + thread replies */}
        {!isLoading && tab === 'all' && (() => {
          if (allFeedItems.length === 0) return <div className="cc-empty">{emptyCopy.all}</div>;
          return allFeedItems.map((item) => {
            const day = dayLabel(item.time);
            const showDivider = day !== lastDay;
            lastDay = day;
            const kindLabel = item.kind === 'mention' ? 'Mention' : item.kind === 'dm' ? 'DM' : 'Thread reply';
            return (
              <React.Fragment key={item.id}>
                {showDivider && (
                  <div className="cc-divider cc-activity__day">
                    <div className="cc-divider__rule" />
                    <div className="cc-divider__pill">{day}</div>
                    <div className="cc-divider__rule" />
                  </div>
                )}
                <div className={`cc-activity__card${item.unread ? ' is-unread' : ''}`}>
                  <button type="button" className="cc-activity__cardmain" onClick={() => onOpenMessage?.(item.entityId)}>
                    <div className="cc-activity__context">
                      <span className="cc-activity__kind">{kindLabel}</span>
                      <span className="cc-activity__chip">{item.title}</span>
                      <span className="cc-activity__time">{relative(item.time)}</span>
                    </div>
                    {item.excerpt && <div className="cc-activity__excerpt">{item.excerpt}</div>}
                  </button>
                </div>
              </React.Fragment>
            );
          });
        })()}
      </div>
    </div>
  );
}

export default ChatMentionsPanel;

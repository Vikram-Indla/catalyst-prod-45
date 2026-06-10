/**
 * ChatMentionsPanel — Activity feed pane (IconRail key 'activity').
 * Slack-equivalent layout: tabs (All / DMs / Mentions / Threads), card-style
 * rows with context line, excerpt with @mention tokens highlighted, date
 * dividers between day groups, unread accent border, hover actions
 * (open / mark read). Read source — notifications via useChatMentions.
 *
 * Mentions are the only activity kind with a backing feed today; the
 * DMs / Threads tabs render their empty states until those feeds exist.
 */
import React, { useMemo, useState } from 'react';
import { useChatMentions, useMarkMentionRead } from '@/hooks/chat/useChatMentions';
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
  const { data: mentions = [], isLoading } = useChatMentions();
  const markRead = useMarkMentionRead();
  const [tab, setTab] = useState<ActivityTab>('all');

  const rows = useMemo(() => {
    if (tab === 'dms' || tab === 'threads') return [];
    return mentions;
  }, [tab, mentions]);

  const emptyCopy: Record<ActivityTab, string> = {
    all: 'No activity yet. Mentions, thread replies and DM activity show here.',
    dms: 'No DM activity yet.',
    mentions: "No mentions yet. You'll see @mentions of your name here.",
    threads: 'No thread activity yet.',
  };

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
        {!isLoading && rows.length === 0 && (
          <div className="cc-empty">{emptyCopy[tab]}</div>
        )}
        {rows.map((m) => {
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
                <button
                  type="button"
                  className="cc-activity__cardmain"
                  onClick={() => {
                    markRead.mutate(m.id);
                    onOpenMessage?.(m.entityId);
                  }}
                >
                  <div className="cc-activity__context">
                    <span className="cc-activity__kind">Mention</span>
                    {m.entityKey && <span className="cc-activity__chip">{m.entityKey}</span>}
                    <span className="cc-activity__time">{relative(m.createdAt)}</span>
                  </div>
                  <div className="cc-activity__excerpt">{renderExcerpt(m.entityTitle ?? '')}</div>
                </button>
                <div className="cc-activity__actions">
                  {unread && (
                    <button
                      type="button"
                      className="cc-activity__action"
                      aria-label="Mark read"
                      title="Mark read"
                      onClick={() => markRead.mutate(m.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="cc-activity__action"
                    aria-label="Open"
                    title="Open"
                    onClick={() => {
                      markRead.mutate(m.id);
                      onOpenMessage?.(m.entityId);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ChatMentionsPanel;

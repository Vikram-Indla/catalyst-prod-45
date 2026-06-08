/**
 * ChatMentionsPanel — middle-pane content when IconRail.activeKey === 'mentions'.
 * Lists chat @mention notifications for the current user, newest first.
 * Clicking a row opens the source conversation; mark-read fires on click.
 *
 * Reuses styling primitives from the conversation list (.cc-convlist /
 * .cc-cl-*) so the panel slots into the existing 300px column with no new
 * CSS surface. Read source — notifications table via useChatMentions.
 */
import React from 'react';
import { useChatMentions, useMarkMentionRead } from '@/hooks/chat/useChatMentions';

export interface ChatMentionsPanelProps {
  /**
   * Called with the chat_messages.id of the mention so the host can
   * resolve the conversation_id and select it. Kept generic because the
   * mention row carries the message id; the host resolves through the
   * useMessages or conversations cache.
   */
  onOpenMessage?: (messageId: string) => void;
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

  return (
    <div className="cc-convlist">
      <div className="cc-cl-head">
        <div className="cc-cl-head__ttl">Mentions</div>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>
        {isLoading && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
            Loading…
          </div>
        )}
        {!isLoading && mentions.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--ds-text-subtle, #44546F)' }}>
            No mentions yet. You'll see @<wbr/>mentions of your name here.
          </div>
        )}
        {mentions.map((m) => {
          const unread = !m.readAt;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                markRead.mutate(m.id);
                if (onOpenMessage) onOpenMessage(m.entityId);
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                background: unread ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: unread ? 'var(--ds-icon-brand, #0C66E4)' : 'transparent',
                  marginTop: 7,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--ds-text, #172B4D)',
                  }}
                >
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.entityKey || 'Chat mention'}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>
                    {relative(m.createdAt)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--ds-text-subtle, #44546F)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {m.entityTitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChatMentionsPanel;

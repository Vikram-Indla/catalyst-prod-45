import React from 'react';
import type { ChatMessage } from '@/types/chat';
import { formatHuddleDuration } from '@/lib/chat/huddle/formatHuddleDuration';
import { ThreadReplyMeta } from './ThreadReplyMeta';

/** Centered system row in the thread. Two states:
 *  - huddle_live    → "🎧 Huddle is happening" (call in progress; replies thread here)
 *  - huddle_summary → "🎧 A huddle happened — You and {name} were in the huddle for 1m". */
export function HuddleEventRow({
  message,
  onOpenThread,
}: {
  message: ChatMessage;
  onOpenThread?: (messageId: string) => void;
}) {
  const meta = (message.eventMeta ?? {}) as { duration_seconds?: number; with_name?: string };
  const withName = (meta.with_name || '').trim();
  const isLive = message.eventType === 'huddle_live';
  const dur = formatHuddleDuration(Number(meta.duration_seconds ?? 0));
  const title = isLive ? 'Huddle is happening' : 'A huddle happened';
  const detail = isLive
    ? (withName ? `You and ${withName} are in the huddle.` : 'You are in the huddle.')
    : (withName ? `You and ${withName} were in the huddle for ${dur}.` : `In the huddle for ${dur}.`);
  return (
    <div
      role="note"
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        padding: '8px 20px', margin: '0px 0',
        color: 'var(--cv2-text-muted, var(--ds-text-subtle))',
        fontFamily: 'var(--cv2-font)', fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{
          flex: '0 0 auto', width: 28, height: 28, borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--ds-surface-sunken)',
        }}>🎧</span>
        <span>
          <strong style={{ color: 'var(--ds-text)' }}>{title}</strong>
          {'  '}{detail}
        </span>
      </div>
      {onOpenThread && message.replyCount > 0 && (
        <div style={{ paddingLeft: 36 }}>
          <ThreadReplyMeta
            replyCount={message.replyCount}
            lastReplyIso={message.lastReplyAt}
            onOpen={() => onOpenThread(message.id)}
          />
        </div>
      )}
    </div>
  );
}

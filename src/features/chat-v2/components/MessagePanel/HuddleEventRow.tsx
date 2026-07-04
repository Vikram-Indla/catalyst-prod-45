import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import type { ChatMessage } from '@/types/chat';
import { formatHuddleDuration } from '@/lib/chat/huddle/formatHuddleDuration';
import { useAuth } from '@/hooks/useAuth';
import { ThreadReplyMeta } from './ThreadReplyMeta';

/** Centered system row in the thread. Rendered PER-VIEWER:
 *  - huddle_live    → "🎧 Huddle is happening" (call in progress; replies thread here)
 *  - huddle_summary, I joined     → "🎧 A huddle happened — You (and X) were in the huddle for 1m"
 *  - huddle_summary, I DIDN'T join → "🎧 You missed a huddle [MISSED] — {caller} was in the huddle for 1m" */
export function HuddleEventRow({
  message,
  onOpenThread,
}: {
  message: ChatMessage;
  onOpenThread?: (messageId: string) => void;
}) {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const meta = (message.eventMeta ?? {}) as {
    duration_seconds?: number;
    with_name?: string;
    caller_name?: string;
    participants?: { id: string; name: string }[];
  };
  const withName = (meta.with_name || '').trim();
  const isLive = message.eventType === 'huddle_live';
  const dur = formatHuddleDuration(Number(meta.duration_seconds ?? 0));
  const participants = meta.participants ?? [];
  const iJoined = !myId || participants.length === 0 ? true : participants.some((p) => p.id === myId);
  const others = participants.filter((p) => p.id !== myId).map((p) => p.name);
  const missed = !isLive && participants.length > 0 && !iJoined;

  let title: string;
  let detail: string;
  if (isLive) {
    title = 'Huddle is happening';
    detail = withName ? `You and ${withName} are in the huddle.` : 'You are in the huddle.';
  } else if (missed) {
    const caller = (meta.caller_name || withName || 'Someone').trim();
    title = 'You missed a huddle';
    detail = `${caller} was in the huddle for ${dur}.`;
  } else {
    title = 'A huddle happened';
    detail = others.length
      ? `You and ${others.join(', ')} were in the huddle for ${dur}.`
      : `You were in a huddle for ${dur}.`;
  }
  return (
    <div
      role="note"
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        padding: '8px 20px', margin: '0px 0',
        color: 'var(--cv2-text-muted, var(--ds-text-subtle))',
        fontFamily: 'var(--cv2-font)', font: 'var(--ds-font-body-small)',
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
          {missed && <>{' '}<Lozenge appearance="removed">Missed</Lozenge></>}
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

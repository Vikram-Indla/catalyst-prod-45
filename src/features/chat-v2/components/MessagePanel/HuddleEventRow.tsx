import React from 'react';
import type { ChatMessage } from '@/types/chat';
import { formatHuddleDuration } from '@/lib/chat/huddle/formatHuddleDuration';

/** Centered system row in the thread: "🎧 A huddle happened — You and {name} were in the huddle for 1m". */
export function HuddleEventRow({ message }: { message: ChatMessage }) {
  const meta = (message.eventMeta ?? {}) as { duration_seconds?: number; with_name?: string };
  const dur = formatHuddleDuration(Number(meta.duration_seconds ?? 0));
  const withName = (meta.with_name || '').trim();
  const detail = withName
    ? `You and ${withName} were in the huddle for ${dur}.`
    : `In the huddle for ${dur}.`;
  return (
    <div
      role="note"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 20px', margin: '2px 0',
        color: 'var(--cv2-text-muted, var(--ds-text-subtle, #44546F))',
        fontFamily: 'var(--cv2-font)', fontSize: 13,
      }}
    >
      <span aria-hidden style={{
        flex: '0 0 auto', width: 28, height: 28, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
      }}>🎧</span>
      <span>
        <strong style={{ color: 'var(--ds-text, #172B4D)' }}>A huddle happened</strong>
        {'  '}{detail}
      </span>
    </div>
  );
}

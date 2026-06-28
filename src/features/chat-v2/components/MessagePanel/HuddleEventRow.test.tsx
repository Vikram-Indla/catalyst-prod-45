import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuddleEventRow } from './HuddleEventRow';
import type { ChatMessage } from '@/types/chat';

function msg(meta: Record<string, unknown>): ChatMessage {
  return {
    id: 'm1', conversationId: 'c1', parentId: null, authorId: 'me', authorName: 'Me',
    authorAvatarUrl: null, bodyText: 'A huddle happened', bodyAdf: null,
    createdAt: new Date().toISOString(), editedAt: null, deletedAt: null,
    scheduledFor: null, deliveredAt: null, reactions: [], replyCount: 0,
    lastReplyAt: null, isAlsoInChannel: false,
    eventType: 'huddle_summary', eventMeta: meta,
  } as ChatMessage;
}

describe('HuddleEventRow', () => {
  it('shows the duration and other participant', () => {
    render(<HuddleEventRow message={msg({ duration_seconds: 62, with_name: 'Zulqarnain' })} />);
    expect(screen.getByText(/A huddle happened/i)).toBeTruthy();
    expect(screen.getByText(/Zulqarnain/)).toBeTruthy();
    expect(screen.getByText(/1m/)).toBeTruthy();
  });
});

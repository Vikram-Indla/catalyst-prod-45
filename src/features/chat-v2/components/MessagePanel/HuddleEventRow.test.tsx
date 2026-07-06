import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
// HuddleEventRow calls useAuth; mock it so the test is self-contained and
// doesn't rely on another test file's mock leaking into the shared run.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
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
  it('shows the duration and the other participant from the participants list', () => {
    // Current component reads names from eventMeta.participants (→ "others"),
    // not with_name (which is only used for the live / missed branches).
    render(
      <HuddleEventRow
        message={msg({
          duration_seconds: 62,
          participants: [
            { id: 'me', name: 'Me' },
            { id: 'z', name: 'Zulqarnain' },
          ],
        })}
      />,
    );
    expect(screen.getByText(/A huddle happened/i)).toBeTruthy();
    expect(screen.getByText(/Zulqarnain/)).toBeTruthy();
    expect(screen.getByText(/1m/)).toBeTruthy();
  });

  it('falls back to "You were in a huddle" when no other participants are recorded', () => {
    render(<HuddleEventRow message={msg({ duration_seconds: 62 })} />);
    expect(screen.getByText(/You were in a huddle for 1m/i)).toBeTruthy();
  });
});

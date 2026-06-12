/**
 * chat-data.test.ts — TDD (failing-first) unit tests for the Catalyst
 * Chat data contract. These exercise PURE mapping/util functions only —
 * no live network, no Supabase. The functions under test are owned by
 * the data-layer agent and will live in `@/lib/chat/chatMappers`. Until
 * that module exists these imports fail, which is the intended red state.
 *
 * Contract under test:
 *   1. mapConversationRow: DB row → ChatConversation (with unreadCount)
 *   2. mapMessageRows: excludes soft-deleted (deleted_at != null) rows
 *   3. aggregateReactions: groups by emoji with count + reactedByMe
 *   4. groupPeopleByPresence: order = available,busy,away,offline,on_leave
 *   5. isConversationArchivable: idle > 21 days → true
 */
import { describe, it, expect } from 'vitest';
import {
  mapConversationRow,
  mapMessageRows,
  aggregateReactions,
  groupPeopleByPresence,
  isConversationArchivable,
} from '@/lib/chat/chatMappers';
import type {
  ChatConversation,
  ChatMessage,
  ChatPerson,
} from '@/types/chat';

describe('mapConversationRow', () => {
  it('maps a DB row to ChatConversation with unreadCount', () => {
    const row = {
      id: 'c1',
      kind: 'ticket',
      ticket_key: 'BAU-5757',
      project_key: 'BAU',
      title: 'Payment gateway timeout',
      is_archived: false,
      last_message_at: '2026-06-03T09:00:00Z',
      last_message_preview: 'No 504s observed.',
      unread_count: 3,
    };

    const result: ChatConversation = mapConversationRow(row);

    expect(result).toEqual({
      id: 'c1',
      kind: 'ticket',
      ticketKey: 'BAU-5757',
      projectKey: 'BAU',
      title: 'Payment gateway timeout',
      isArchived: false,
      lastMessageAt: '2026-06-03T09:00:00Z',
      lastMessagePreview: 'No 504s observed.',
      unreadCount: 3,
    });
  });

  it('defaults unreadCount to 0 when the row omits it', () => {
    const row = {
      id: 'c2',
      kind: 'channel',
      ticket_key: null,
      project_key: null,
      title: 'general',
      is_archived: false,
      last_message_at: null,
      last_message_preview: null,
    };
    expect(mapConversationRow(row).unreadCount).toBe(0);
  });
});

describe('mapMessageRows', () => {
  it('excludes soft-deleted rows (deleted_at != null)', () => {
    const rows = [
      {
        id: 'm1',
        conversation_id: 'c1',
        parent_id: null,
        author_id: 'u1',
        author_name: 'Aisha',
        body_text: 'Approved.',
        created_at: '2026-06-03T08:00:00Z',
        deleted_at: null,
      },
      {
        id: 'm2',
        conversation_id: 'c1',
        parent_id: null,
        author_id: 'u2',
        author_name: 'Syed',
        body_text: 'oops',
        created_at: '2026-06-03T08:05:00Z',
        deleted_at: '2026-06-03T08:06:00Z',
      },
    ];

    const result: ChatMessage[] = mapMessageRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('returns empty array for no rows', () => {
    expect(mapMessageRows([])).toEqual([]);
  });
});

describe('aggregateReactions', () => {
  it('aggregates by emoji with count and reactedByMe', () => {
    const rows = [
      { emoji: '🔥', user_id: 'me' },
      { emoji: '🔥', user_id: 'u2' },
      { emoji: '👏', user_id: 'u2' },
    ];

    const result = aggregateReactions(rows, 'me');

    expect(result).toEqual([
      { emoji: '🔥', count: 2, reactedByMe: true },
      { emoji: '👏', count: 1, reactedByMe: false },
    ]);
  });

  it('marks reactedByMe false when current user has not reacted', () => {
    const result = aggregateReactions([{ emoji: '👍', user_id: 'u2' }], 'me');
    expect(result).toEqual([{ emoji: '👍', count: 1, reactedByMe: false }]);
  });
});

describe('groupPeopleByPresence', () => {
  it('orders groups on_set, remote, away, on_leave', () => {
    const people: ChatPerson[] = [
      { id: 'p1', name: 'Away One', role: null, avatarUrl: null, presence: 'away', presenceNote: null },
      { id: 'p2', name: 'On Leave', role: null, avatarUrl: null, presence: 'on_leave', presenceNote: null },
      { id: 'p3', name: 'In Office One', role: null, avatarUrl: null, presence: 'on_set', presenceNote: null },
      { id: 'p4', name: 'Remote One', role: null, avatarUrl: null, presence: 'remote', presenceNote: null },
    ];

    const groups = groupPeopleByPresence(people);

    expect(groups.map((g) => g.presence)).toEqual([
      'on_set',
      'remote',
      'away',
      'on_leave',
    ]);
  });

  it('omits presence groups that have no people', () => {
    const people: ChatPerson[] = [
      { id: 'p1', name: 'Remote One', role: null, avatarUrl: null, presence: 'remote', presenceNote: null },
    ];
    const groups = groupPeopleByPresence(people);
    expect(groups.map((g) => g.presence)).toEqual(['remote']);
  });
});

describe('isConversationArchivable', () => {
  const now = new Date('2026-06-03T00:00:00Z');

  it('flags a conversation idle more than 21 days', () => {
    const lastMessageAt = '2026-05-10T00:00:00Z'; // 24 days idle
    expect(isConversationArchivable(lastMessageAt, now)).toBe(true);
  });

  it('does not flag a conversation idle 21 days or less', () => {
    const lastMessageAt = '2026-05-15T00:00:00Z'; // 19 days idle
    expect(isConversationArchivable(lastMessageAt, now)).toBe(false);
  });

  it('does not flag a conversation with no last message', () => {
    expect(isConversationArchivable(null, now)).toBe(false);
  });
});

/**
 * Chat feature — pure utility tests.
 *
 * Tests buildGroups (message grouping algorithm) and getRelativeTime
 * (activity surface timestamp formatting). Both are pure functions
 * exported with a *ForTest suffix per codebase convention.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGroupsForTest } from '../components/feed/MessageFeed';
import { getRelativeTimeForTest } from '../components/activity/ActivitySurface';
import type { ChatMessage } from '@/types/chat';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeMsg(
  overrides: Partial<ChatMessage> & { id: string; authorId: string; createdAt: string },
): ChatMessage {
  return {
    conversationId: 'conv-1',
    parentId: null,
    authorName: `User ${overrides.authorId}`,
    authorAvatarUrl: null,
    bodyText: 'hello',
    bodyAdf: null,
    editedAt: null,
    deletedAt: null,
    reactions: [],
    replyCount: 0,
    ...overrides,
  };
}

const T0 = '2026-01-15T10:00:00.000Z'; // base time
const plus = (ms: number) => new Date(new Date(T0).getTime() + ms).toISOString();

// ── buildGroups ────────────────────────────────────────────────────────────

describe('buildGroups', () => {
  it('empty messages → empty groups', () => {
    expect(buildGroupsForTest([], 0)).toEqual([]);
  });

  it('single message → one group', () => {
    const msgs = [makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 })];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(1);
    expect(groups[0].authorId).toBe('u1');
  });

  it('consecutive messages from same author within 5 min → one group', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: plus(60_000) }),   // +1 min
      makeMsg({ id: 'm3', authorId: 'u1', createdAt: plus(120_000) }),  // +2 min
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(3);
  });

  it('same author after > 5 min gap → new group', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: plus(6 * 60_000) }), // +6 min
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups).toHaveLength(2);
  });

  it('different authors → new group each time', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u2', createdAt: plus(30_000) }),
      makeMsg({ id: 'm3', authorId: 'u1', createdAt: plus(60_000) }),
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups).toHaveLength(3);
    expect(groups.map(g => g.authorId)).toEqual(['u1', 'u2', 'u1']);
  });

  it('day boundary → new group with dayLabel set', () => {
    // Use noon UTC so the dates are unambiguously different in any timezone (UTC±12)
    const day1 = '2026-01-15T12:00:00.000Z';
    const day2 = '2026-01-16T12:00:00.000Z';
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: day1 }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: day2 }),
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups).toHaveLength(2);
    expect(groups[0].dayLabel).not.toBeNull(); // first message always gets dayLabel
    expect(groups[1].dayLabel).not.toBeNull(); // day changed → new group with label
  });

  it('unreadCount=0 → no unreadAbove flags', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: plus(30_000) }),
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups.every(g => !g.unreadAbove)).toBe(true);
  });

  it('unreadCount=1 → last message group has unreadAbove', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u2', createdAt: plus(30_000) }),
    ];
    const groups = buildGroupsForTest(msgs, 1);
    // Last message (index 1) starts a new group (different author) — unreadAbove on that group
    expect(groups[1].unreadAbove).toBe(true);
    expect(groups[0].unreadAbove).toBe(false);
  });

  it('messages from same author with unread in the middle of the group', () => {
    // 3 messages from u1 in rapid succession, last 2 are unread
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0 }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: plus(30_000) }),
      makeMsg({ id: 'm3', authorId: 'u1', createdAt: plus(60_000) }),
    ];
    // unreadCount=2 means last 2 messages are unread → unreadStartIdx = 1
    const groups = buildGroupsForTest(msgs, 2);
    expect(groups).toHaveLength(1); // all in one group
    expect(groups[0].unreadAbove).toBe(true); // index 1 is in this group
  });

  it('preserves message order within a group', () => {
    const msgs = [
      makeMsg({ id: 'm1', authorId: 'u1', createdAt: T0, bodyText: 'first' }),
      makeMsg({ id: 'm2', authorId: 'u1', createdAt: plus(30_000), bodyText: 'second' }),
    ];
    const groups = buildGroupsForTest(msgs, 0);
    expect(groups[0].messages[0].bodyText).toBe('first');
    expect(groups[0].messages[1].bodyText).toBe('second');
  });
});

// ── getRelativeTime ────────────────────────────────────────────────────────

describe('getRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('< 1 min → "just now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:30Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('just now');
  });

  it('5 min ago → "5m ago"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:05:00Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('5m ago');
  });

  it('2 hours ago → "2h ago"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('2h ago');
  });

  it('3 days ago → "3d ago"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-18T10:00:00Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('3d ago');
  });

  it('59 min ago → still "Xm ago" not hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:59:00Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('59m ago');
  });

  it('23 hours ago → still "Xh ago" not days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-16T09:00:00Z'));
    expect(getRelativeTimeForTest('2026-01-15T10:00:00Z')).toBe('23h ago');
  });
});

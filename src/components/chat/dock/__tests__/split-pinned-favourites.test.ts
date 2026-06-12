/**
 * split-pinned-favourites.test.ts — grouping logic for the Pinned + Favourites
 * directory sections (2026-06-11).
 *   - Pinned = isPinned
 *   - Favourites = isStarred AND NOT isPinned (pin wins)
 *   - excluded = ids of everything bucketed (so normal sections skip them)
 */
import { describe, it, expect } from 'vitest';
import { splitPinnedFavourites } from '../DockDirectory';
import type { ChatConversation } from '@/types/chat';

const conv = (id: string, over: Partial<ChatConversation> = {}): ChatConversation => ({
  id,
  kind: 'dm',
  ticketKey: null,
  ticketType: null,
  projectKey: null,
  projectName: null,
  title: id,
  isArchived: false,
  lastMessageAt: null,
  lastMessagePreview: null,
  unreadCount: 0,
  ...over,
});

describe('splitPinnedFavourites', () => {
  it('buckets pinned and starred separately', () => {
    const live = [
      conv('a', { isPinned: true }),
      conv('b', { isStarred: true }),
      conv('c'),
    ];
    const { pinned, favourites, excluded } = splitPinnedFavourites(live);
    expect(pinned.map((c) => c.id)).toEqual(['a']);
    expect(favourites.map((c) => c.id)).toEqual(['b']);
    expect([...excluded].sort()).toEqual(['a', 'b']);
  });

  it('pin wins over star — a pinned+starred conversation is not duplicated', () => {
    const live = [conv('x', { isPinned: true, isStarred: true })];
    const { pinned, favourites, excluded } = splitPinnedFavourites(live);
    expect(pinned.map((c) => c.id)).toEqual(['x']);
    expect(favourites).toHaveLength(0);
    expect([...excluded]).toEqual(['x']);
  });

  it('returns empty buckets and empty excluded set when nothing is flagged', () => {
    const { pinned, favourites, excluded } = splitPinnedFavourites([conv('a'), conv('b')]);
    expect(pinned).toHaveLength(0);
    expect(favourites).toHaveLength(0);
    expect(excluded.size).toBe(0);
  });
});

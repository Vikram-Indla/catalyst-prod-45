/**
 * split-pinned-favourites.test.ts — grouping logic for the Pinned directory
 * section.
 *
 * The separate "Favourites" (starred) directory section was RETIRED — the
 * dock render reads only `filtered.pinned`, there is no Favourites section,
 * and starred conversations stay in their normal DMs/Channels sections (the
 * per-row star action still works). splitPinnedFavourites reflects this:
 *   - Pinned = isPinned
 *   - favourites = [] (feature retired; the field is kept for call-site shape)
 *   - excluded = pinned ids only (so the normal sections skip the pinned ones)
 * These tests document the CURRENT contract, not the retired one.
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
  it('buckets pinned only; starred stays in its normal section', () => {
    const live = [
      conv('a', { isPinned: true }),
      conv('b', { isStarred: true }),
      conv('c'),
    ];
    const { pinned, favourites, excluded } = splitPinnedFavourites(live);
    expect(pinned.map((c) => c.id)).toEqual(['a']);
    // Favourites retired — starred 'b' is not bucketed and not excluded.
    expect(favourites).toHaveLength(0);
    expect([...excluded]).toEqual(['a']);
  });

  it('a pinned+starred conversation buckets under Pinned only', () => {
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

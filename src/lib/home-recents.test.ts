import { describe, it, expect } from 'vitest';
import { MAX_VISIBLE_PER_GROUP, sliceVisible } from './home-recents';

describe('sliceVisible — per-space recent-row cap', () => {
  it('caps at MAX_VISIBLE_PER_GROUP and reports the hidden remainder', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const { visible, hiddenCount } = sliceVisible(items, false);
    expect(visible).toEqual([1, 2, 3]);
    expect(hiddenCount).toBe(6 - MAX_VISIBLE_PER_GROUP);
  });

  it('returns every item with zero hidden when showAll is true', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const { visible, hiddenCount } = sliceVisible(items, true);
    expect(visible).toEqual(items);
    expect(hiddenCount).toBe(0);
  });

  it('does not append a remainder when the group is at or under the cap', () => {
    const items = [1, 2, 3];
    const { visible, hiddenCount } = sliceVisible(items, false);
    expect(visible).toEqual([1, 2, 3]);
    expect(hiddenCount).toBe(0);
  });

  it('caps at 3', () => {
    expect(MAX_VISIBLE_PER_GROUP).toBe(3);
  });
});

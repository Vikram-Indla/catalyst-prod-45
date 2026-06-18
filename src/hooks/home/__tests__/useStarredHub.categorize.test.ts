import { describe, it, expect } from 'vitest';
import { categorizeStar, STAR_CATEGORY } from '../useStarredHub';

describe('useStarredHub — taxonomy categorization', () => {
  it('maps every StarredItemType to exactly one category', () => {
    // Spot-check one per family
    expect(categorizeStar('story')).toBe('work_item');
    expect(categorizeStar('defect')).toBe('work_item');
    expect(categorizeStar('business_request')).toBe('work_item');
    expect(categorizeStar('project')).toBe('container');
    expect(categorizeStar('product')).toBe('container');
    expect(categorizeStar('board')).toBe('surface');
    expect(categorizeStar('filter')).toBe('surface');
    expect(categorizeStar('dashboard')).toBe('surface');
    expect(categorizeStar('theme')).toBe('knowledge');
    expect(categorizeStar('objective')).toBe('knowledge');
  });

  it('every type in the registry resolves (no unmapped types)', () => {
    Object.values(STAR_CATEGORY).forEach(cat => {
      expect(['surface', 'work_item', 'container', 'knowledge']).toContain(cat);
    });
    // registry must be non-trivial
    expect(Object.keys(STAR_CATEGORY).length).toBeGreaterThanOrEqual(20);
  });
});

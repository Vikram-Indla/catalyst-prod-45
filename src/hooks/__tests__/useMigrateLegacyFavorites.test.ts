import { describe, it, expect } from 'vitest';
import { legacyFavoriteRow } from '../useMigrateLegacyFavorites';

describe('legacyFavoriteRow', () => {
  it('maps a surface path to its canonical type with route + humanised label', () => {
    expect(legacyFavoriteRow('/project-hub/BAU/backlog')).toEqual({
      item_id: '/project-hub/BAU/backlog',
      item_type: 'backlog',
      metadata: { label: 'Backlog', route: '/project-hub/BAU/backlog' },
    });
  });

  it('maps an arbitrary nav path to the generic page type', () => {
    expect(legacyFavoriteRow('/planhub/capacity')).toEqual({
      item_id: '/planhub/capacity',
      item_type: 'page',
      metadata: { label: 'Capacity', route: '/planhub/capacity' },
    });
  });

  it('humanises a dashed route word', () => {
    expect(legacyFavoriteRow('/planhub/capacity-planner').metadata.label).toBe('Capacity planner');
  });

  it('handles trailing slash and query string', () => {
    const row = legacyFavoriteRow('/project-hub/BAU/dashboard/?x=1');
    expect(row.item_type).toBe('dashboard');
    expect(row.metadata.label).toBe('Dashboard');
  });
});

/**
 * OBSOLETE — safe to delete (and the enclosing __tests__ folder if empty).
 * Written 2026-06-12 against the wrong component (AllWorkToolbar). The backlog
 * saved-filters control is BacklogSavedFiltersDropdown in BacklogPage.atlaskit,
 * which is already wired via useFiltersForProject. No production code imports
 * anything from here. Left inert (no external import) so it cannot break the suite.
 */
import { describe, it, expect } from 'vitest';

describe.skip('savedFiltersQuery (obsolete placeholder)', () => {
  it('is a no-op pending file deletion', () => {
    expect(true).toBe(true);
  });
});

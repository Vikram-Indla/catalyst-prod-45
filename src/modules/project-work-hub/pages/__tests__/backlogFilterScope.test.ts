import { describe, it, expect } from 'vitest';
import { isFilterRelevantToBacklog, type BacklogFilterScopeInput } from '../backlogFilterScope';

const base: BacklogFilterScopeInput = {
  jql_query: null,
  project_key: null,
  user_id: null,
  owner_id: null,
  starred_by_user_ids: [],
};
const ME = 'user-me';

describe('isFilterRelevantToBacklog', () => {
  it('includes my own filters (creator or owner)', () => {
    expect(isFilterRelevantToBacklog({ ...base, owner_id: ME }, 'BAU', ME)).toBe(true);
    expect(isFilterRelevantToBacklog({ ...base, user_id: ME }, 'BAU', ME)).toBe(true);
  });

  it('includes filters I have starred', () => {
    expect(isFilterRelevantToBacklog({ ...base, starred_by_user_ids: [ME] }, 'BAU', ME)).toBe(true);
  });

  it('includes filters scoped to the project via project_key', () => {
    expect(isFilterRelevantToBacklog({ ...base, project_key: 'bau' }, 'BAU', ME)).toBe(true);
  });

  it('includes filters whose JQL references the project key', () => {
    expect(
      isFilterRelevantToBacklog({ ...base, jql_query: 'project = "BAU" AND status = Backlog' }, 'BAU', ME),
    ).toBe(true);
    expect(isFilterRelevantToBacklog({ ...base, jql_query: 'key = BAU-123' }, 'BAU', ME)).toBe(true);
    expect(isFilterRelevantToBacklog({ ...base, jql_query: 'project = bau' }, 'BAU', ME)).toBe(true);
  });

  it("excludes someone else's cross-project filter (the 129-dump problem)", () => {
    expect(
      isFilterRelevantToBacklog(
        { ...base, owner_id: 'someone-else', jql_query: 'project = "MIM" AND issuetype = Bug' },
        'BAU',
        ME,
      ),
    ).toBe(false);
  });

  it('does not match the key as a substring of another token', () => {
    expect(isFilterRelevantToBacklog({ ...base, jql_query: 'project = "BAUXTER"' }, 'BAU', ME)).toBe(false);
  });

  it('returns false when there is no signed-in user and nothing project-related', () => {
    expect(isFilterRelevantToBacklog({ ...base, owner_id: 'someone-else' }, 'BAU', null)).toBe(false);
  });
});

/**
 * Bucket D — last-accessed project localStorage helpers.
 *
 * setLastProjectId / getLastProjectId must be exported so the project-hub
 * shell can write the current project UUID whenever the user navigates
 * into a project context. The Create modal reads it to pre-select.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setLastProjectId, getLastProjectId } from '../useCreateStory';

beforeEach(() => {
  localStorage.clear();
});

describe('lastProject round-trip (Bucket D)', () => {
  it('stores and retrieves per user', () => {
    setLastProjectId('user-1', 'proj-uuid-abc');
    expect(getLastProjectId('user-1')).toBe('proj-uuid-abc');
  });

  it('different users are isolated', () => {
    setLastProjectId('user-1', 'proj-a');
    setLastProjectId('user-2', 'proj-b');
    expect(getLastProjectId('user-1')).toBe('proj-a');
    expect(getLastProjectId('user-2')).toBe('proj-b');
  });

  it('undefined userId returns empty string', () => {
    expect(getLastProjectId(undefined)).toBe('');
  });

  it('unknown userId returns empty string', () => {
    setLastProjectId('user-1', 'proj-a');
    expect(getLastProjectId('user-99')).toBe('');
  });
});

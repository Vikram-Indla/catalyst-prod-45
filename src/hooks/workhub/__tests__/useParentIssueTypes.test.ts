import { describe, it, expect } from 'vitest';
import { buildParentTypeMap } from '../useParentIssueTypes';

describe('buildParentTypeMap', () => {
  it('maps issue_key to issue_type', () => {
    const m = buildParentTypeMap([
      { issue_key: 'BAU-4435', issue_type: 'Story' },
      { issue_key: 'BAU-100', issue_type: 'Epic' },
    ]);
    expect(m.get('BAU-4435')).toBe('Story');
    expect(m.get('BAU-100')).toBe('Epic');
  });

  it('skips rows with missing key or type (never invents a default)', () => {
    const m = buildParentTypeMap([
      { issue_key: 'BAU-1', issue_type: null },
      { issue_key: null, issue_type: 'Epic' },
      { issue_key: 'BAU-2', issue_type: 'Feature' },
    ]);
    expect(m.has('BAU-1')).toBe(false);
    expect(m.size).toBe(1);
    expect(m.get('BAU-2')).toBe('Feature');
  });

  it('returns empty map for empty input', () => {
    expect(buildParentTypeMap([]).size).toBe(0);
  });
});

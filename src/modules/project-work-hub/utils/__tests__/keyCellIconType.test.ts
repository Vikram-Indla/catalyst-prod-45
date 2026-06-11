import { describe, it, expect } from 'vitest';
import { keyCellIconType } from '../backlog.utils';

describe('keyCellIconType', () => {
  it('renders the TRUE issue_type, not the collapsed BacklogType', () => {
    expect(keyCellIconType({ issue_type: 'Sub-task', type: 'story' })).toBe('Sub-task');
    expect(keyCellIconType({ issue_type: 'Backend', type: 'story' })).toBe('Backend');
    expect(keyCellIconType({ issue_type: 'Frontend', type: 'story' })).toBe('Frontend');
    expect(keyCellIconType({ issue_type: 'Feature', type: 'story' })).toBe('Feature');
  });

  it('passes Story / QA Bug / Production Incident through correctly', () => {
    expect(keyCellIconType({ issue_type: 'Story', type: 'story' })).toBe('Story');
    expect(keyCellIconType({ issue_type: 'QA Bug', type: 'bug' })).toBe('QA Bug');
    expect(keyCellIconType({ issue_type: 'Production Incident', type: 'incident' })).toBe('Production Incident');
  });

  it('falls back to BacklogType map for synthetic rows (no issue_type)', () => {
    expect(keyCellIconType({ issue_type: null, type: 'epic' })).toBe('Epic');
    expect(keyCellIconType({ type: 'bug' })).toBe('QA Bug');
  });

  it('never fabricates Story — unknown type passes through, not defaulted', () => {
    expect(keyCellIconType({ issue_type: null, type: 'whatever' })).toBe('whatever');
  });
});

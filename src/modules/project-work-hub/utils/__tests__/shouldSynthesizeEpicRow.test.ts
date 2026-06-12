import { describe, it, expect } from 'vitest';
import { shouldSynthesizeEpicRow } from '../backlog.utils';

describe('shouldSynthesizeEpicRow', () => {
  it('synthesizes only genuine Epics', () => {
    expect(shouldSynthesizeEpicRow({ issue_type: 'Epic' })).toBe(true);
  });

  it('does NOT synthesize a Story parent (the phantom-twin bug)', () => {
    // BAU-4490 is a Story that parents Sub-task/Frontend children. It must
    // never become a top-level Epic row.
    expect(shouldSynthesizeEpicRow({ issue_type: 'Story' })).toBe(false);
  });

  it('does NOT synthesize Feature/Task/Frontend parents', () => {
    expect(shouldSynthesizeEpicRow({ issue_type: 'Feature' })).toBe(false);
    expect(shouldSynthesizeEpicRow({ issue_type: 'Frontend' })).toBe(false);
  });

  it('handles null/undefined/missing type without synthesizing', () => {
    expect(shouldSynthesizeEpicRow(null)).toBe(false);
    expect(shouldSynthesizeEpicRow(undefined)).toBe(false);
    expect(shouldSynthesizeEpicRow({ issue_type: null })).toBe(false);
    expect(shouldSynthesizeEpicRow({})).toBe(false);
  });
});

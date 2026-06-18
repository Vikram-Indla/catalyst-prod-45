import { describe, it, expect } from 'vitest';
import { workItemStarType } from '../starType';

describe('workItemStarType', () => {
  it('maps known work-item type strings to canonical star types', () => {
    expect(workItemStarType('Epic')).toBe('epic');
    expect(workItemStarType('story')).toBe('story');
    expect(workItemStarType('QA Bug')).toBe('defect');
    expect(workItemStarType('Production Incident')).toBe('production_incident');
    expect(workItemStarType('Business Request')).toBe('business_request');
    expect(workItemStarType('Brd Task')).toBe('task');
  });

  it('falls back to ph_issue for unknown/empty types (still a work item)', () => {
    expect(workItemStarType('Whatever New Type')).toBe('ph_issue');
    expect(workItemStarType(null)).toBe('ph_issue');
    expect(workItemStarType(undefined)).toBe('ph_issue');
    expect(workItemStarType('')).toBe('ph_issue');
  });
});

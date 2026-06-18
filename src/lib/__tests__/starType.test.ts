import { describe, it, expect } from 'vitest';
import { workItemStarType, sidebarStarType } from '../starType';

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

describe('sidebarStarType', () => {
  it('maps known surface route words to their canonical surface star type (dedupes with header stars)', () => {
    expect(sidebarStarType('/project-hub/BAU/backlog')).toBe('backlog');
    expect(sidebarStarType('/project-hub/BAU/dashboard')).toBe('dashboard');
    expect(sidebarStarType('/project-hub/BAU/board')).toBe('board');
    expect(sidebarStarType('/project-hub/BAU/roadmap')).toBe('roadmap');
    expect(sidebarStarType('/project-hub/BAU/filters')).toBe('filter');
  });

  it('falls back to generic page for arbitrary nav rows (never a guessed surface type)', () => {
    expect(sidebarStarType('/planhub/capacity')).toBe('page');
    expect(sidebarStarType('/planhub/library')).toBe('page');
    expect(sidebarStarType('/planhub/compare')).toBe('page');
    expect(sidebarStarType('/incidents/reports')).toBe('page');
    expect(sidebarStarType('/')).toBe('page');
    expect(sidebarStarType('')).toBe('page');
  });

  it('ignores trailing slashes and query strings when reading the route word', () => {
    expect(sidebarStarType('/project-hub/BAU/backlog/')).toBe('backlog');
    expect(sidebarStarType('/project-hub/BAU/dashboard?tab=1')).toBe('dashboard');
  });
});

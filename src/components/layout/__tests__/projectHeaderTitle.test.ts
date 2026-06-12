import { describe, it, expect } from 'vitest';
import { deriveRouteWord, buildProjectHeaderTitle } from '../projectHeaderTitle';

describe('deriveRouteWord', () => {
  it('maps known project-hub segments to display words', () => {
    expect(deriveRouteWord('/project-hub/BAU/backlog')).toBe('Backlog');
    expect(deriveRouteWord('/project-hub/BAU/board')).toBe('Board');
    expect(deriveRouteWord('/project-hub/BAU/allwork')).toBe('Work');
    expect(deriveRouteWord('/project-hub/BAU/filters')).toBe('Filters');
  });

  it('treats boards and list as Board/Work aliases', () => {
    expect(deriveRouteWord('/project-hub/BAU/boards/12/settings')).toBe('Board');
    expect(deriveRouteWord('/project-hub/BAU/list')).toBe('Work');
  });

  it('title-cases unknown segments', () => {
    expect(deriveRouteWord('/project-hub/BAU/summary')).toBe('Summary');
  });

  it('also matches product-hub routes', () => {
    expect(deriveRouteWord('/product-hub/PRD/backlog')).toBe('Backlog');
  });

  it('returns null for non-hub or segment-less paths', () => {
    expect(deriveRouteWord('/project-hub/BAU')).toBeNull();
    expect(deriveRouteWord('/home')).toBeNull();
  });
});

describe('buildProjectHeaderTitle', () => {
  it('prefixes the key before the route word', () => {
    expect(buildProjectHeaderTitle('/project-hub/BAU/backlog', 'BAU')).toBe('BAU Backlog');
    expect(buildProjectHeaderTitle('/project-hub/BAU/board', 'BAU')).toBe('BAU Board');
    expect(buildProjectHeaderTitle('/project-hub/BAU/allwork', 'BAU')).toBe('BAU Work');
    expect(buildProjectHeaderTitle('/project-hub/BAU/filters', 'BAU')).toBe('BAU Filters');
  });

  it('returns null on unrecognised route so caller falls back to project name', () => {
    expect(buildProjectHeaderTitle('/home', 'BAU')).toBeNull();
  });

  it('renders the word alone when key is missing (never fabricates a key)', () => {
    expect(buildProjectHeaderTitle('/project-hub/BAU/backlog', null)).toBe('Backlog');
  });
});

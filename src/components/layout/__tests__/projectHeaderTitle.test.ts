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

  it('product-hub routes prefix "Product" before the route word', () => {
    expect(deriveRouteWord('/product-hub/PRD/backlog')).toBe('Product Backlog');
    expect(deriveRouteWord('/product-hub/INV/allwork')).toBe('Product Work');
    expect(deriveRouteWord('/product-hub/INV/filters')).toBe('Product Filters');
    expect(deriveRouteWord('/product-hub/INV/dashboard')).toBe('Product Dashboard');
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

  it('product-hub routes include "Product" prefix in the full title', () => {
    expect(buildProjectHeaderTitle('/product-hub/INV/backlog', 'INV')).toBe('INV Product Backlog');
    expect(buildProjectHeaderTitle('/product-hub/INV/allwork', 'INV')).toBe('INV Product Work');
    expect(buildProjectHeaderTitle('/product-hub/INV/filters', 'INV')).toBe('INV Product Filters');
  });
});

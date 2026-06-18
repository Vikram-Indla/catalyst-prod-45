/**
 * hubLanding — smart Project/Product hub landing resolution.
 *
 * Rule (Vikram, 2026-06-18): entering a hub root must land the user INSIDE
 * an entity, never on the manager list. Last-accessed wins any contention;
 * fall back to most-recently-active subscribed entity; list page is last resort.
 *
 * These tests pin the pure decision layer — recency read + path building.
 * The Supabase membership fallback is integration-covered separately.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readMostRecentKey,
  projectLandingPath,
  productLandingPath,
  PROJECT_LIST_PATH,
  PRODUCT_LIST_PATH,
} from '@/lib/hubLanding';

const RECENT_KEY = 'catalyst.switcher-recent';

describe('readMostRecentKey', () => {
  beforeEach(() => localStorage.clear());

  it('returns the most-recent project key (array is most-recent-first)', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([
      { key: 'BAU', name: 'Senaei BAU', type: 'project' },
      { key: 'MWR', name: 'Mawarid', type: 'project' },
    ]));
    expect(readMostRecentKey('project')).toBe('BAU');
  });

  it('ignores items of a different type', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([
      { key: 'PRODX', name: 'Product X', type: 'product' },
      { key: 'MWR', name: 'Mawarid', type: 'project' },
    ]));
    expect(readMostRecentKey('project')).toBe('MWR');
    expect(readMostRecentKey('product')).toBe('PRODX');
  });

  it('returns null when storage is empty', () => {
    expect(readMostRecentKey('project')).toBeNull();
  });

  it('returns null when storage holds no matching type', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([
      { key: 'PRODX', name: 'Product X', type: 'product' },
    ]));
    expect(readMostRecentKey('project')).toBeNull();
  });

  it('returns null on malformed JSON rather than throwing', () => {
    localStorage.setItem(RECENT_KEY, '{not json');
    expect(readMostRecentKey('project')).toBeNull();
  });

  it('skips entries missing a usable key', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([
      { name: 'no key', type: 'project' },
      { key: 'BAU', name: 'Senaei BAU', type: 'project' },
    ]));
    expect(readMostRecentKey('project')).toBe('BAU');
  });
});

describe('landing paths', () => {
  it('project lands on the dashboard, never the list', () => {
    expect(projectLandingPath('BAU')).toBe('/project-hub/BAU/dashboard');
  });
  it('product lands on the backlog', () => {
    expect(productLandingPath('PRODX')).toBe('/product-hub/PRODX/backlog');
  });
  it('exposes the last-resort list paths', () => {
    expect(PROJECT_LIST_PATH).toBe('/project-hub/projects');
    expect(PRODUCT_LIST_PATH).toBe('/product-hub/products');
  });
});

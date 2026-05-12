/**
 * useRecentProjects dedup tests
 *
 * Validates that recordLocationVisit correctly deduplicates by path,
 * keeps entries newest-first, and respects MAX_ENTRIES cap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordLocationVisit } from './useRecentProjects';

describe('recordLocationVisit — deduplication', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should deduplicate by path — 8 visits to same backlog path stores 1 entry', () => {
    // Simulate 8 visits to BAU backlog
    for (let i = 0; i < 8; i++) {
      recordLocationVisit({
        projectKey: 'BAU',
        path: '/project-hub/BAU/backlog',
        section: 'backlog',
      });
    }

    // Read raw store
    const stored = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');

    // Should have exactly 1 entry (deduped)
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      projectKey: 'BAU',
      path: '/project-hub/BAU/backlog',
      section: 'backlog',
    });
  });

  it('should preserve distinct paths — BAU backlog vs BAU dashboard are separate', () => {
    recordLocationVisit({ projectKey: 'BAU', path: '/project-hub/BAU/backlog', section: 'backlog' });
    recordLocationVisit({ projectKey: 'BAU', path: '/project-hub/BAU/dashboard', section: 'dashboard' });
    recordLocationVisit({ projectKey: 'BAU', path: '/project-hub/BAU/backlog', section: 'backlog' });

    const stored = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');

    // Should have 2 entries (one per unique path)
    expect(stored).toHaveLength(2);
    // Newest visit to backlog should be first
    expect(stored[0].path).toBe('/project-hub/BAU/backlog');
    expect(stored[1].path).toBe('/project-hub/BAU/dashboard');
  });

  it('should update visitedAt when revisiting the same path', () => {
    const firstTime = Date.now();
    vi.useFakeTimers({ now: firstTime });

    recordLocationVisit({ projectKey: 'BAU', path: '/project-hub/BAU/backlog', section: 'backlog' });
    const stored1 = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');
    const firstVisit = stored1[0].visitedAt;

    // Move time forward and visit again
    vi.setSystemTime(firstTime + 5000);
    recordLocationVisit({ projectKey: 'BAU', path: '/project-hub/BAU/backlog', section: 'backlog' });
    const stored2 = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');
    const secondVisit = stored2[0].visitedAt;

    // Should still be 1 entry, but visitedAt should be updated
    expect(stored2).toHaveLength(1);
    expect(secondVisit).toBeGreaterThan(firstVisit);
    expect(secondVisit - firstVisit).toBe(5000);

    vi.useRealTimers();
  });

  it('should respect MAX_ENTRIES cap (16 unique paths max)', () => {
    // Record 18 unique paths
    for (let i = 0; i < 18; i++) {
      recordLocationVisit({
        projectKey: `PROJ${i}`,
        path: `/project-hub/PROJ${i}/backlog`,
        section: 'backlog',
      });
    }

    const stored = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');

    // Should be capped at 16
    expect(stored).toHaveLength(16);
    // Newest entries should be preserved (PROJ17 → PROJ2)
    expect(stored[0].projectKey).toBe('PROJ17');
    expect(stored[15].projectKey).toBe('PROJ2');
  });

  it('should keep newest-first ordering on revisit', () => {
    recordLocationVisit({ projectKey: 'A', path: '/project-hub/A/backlog', section: 'backlog' });
    recordLocationVisit({ projectKey: 'B', path: '/project-hub/B/backlog', section: 'backlog' });
    recordLocationVisit({ projectKey: 'C', path: '/project-hub/C/backlog', section: 'backlog' });

    // Revisit A → should move to top
    recordLocationVisit({ projectKey: 'A', path: '/project-hub/A/backlog', section: 'backlog' });

    const stored = JSON.parse(localStorage.getItem('catalyst.recentLocations.v2') || '[]');

    expect(stored).toHaveLength(3);
    expect(stored[0].projectKey).toBe('A'); // most recent
    expect(stored[1].projectKey).toBe('C');
    expect(stored[2].projectKey).toBe('B');
  });
});

/**
 * Recent-locations "today only" scope.
 *
 * 2026-06-18 — Vikram: the Home sidebar Recent list showed Yesterday / 2d-ago
 * rows — clutter. Scope it to TODAY's actions only. Guard: if nothing was
 * visited today (early morning / fresh cache), fall back to the most-recent
 * entries so the rail is never blank.
 */
import { describe, it, expect } from 'vitest';
import { selectRecentEntries, type StoredEntry } from './useRecentProjects';

const NOON = new Date(2026, 5, 18, 12, 0, 0).getTime(); // local noon, 18 Jun 2026
const DAY = 86_400_000;

function entry(projectKey: string, section: string, visitedAt: number, hub: StoredEntry['hub'] = 'project'): StoredEntry {
  return { projectKey, path: `/project-hub/${projectKey}/${section}`, section, visitedAt, hub };
}

describe('selectRecentEntries — today only with fallback', () => {
  it('keeps only entries visited today when today has activity', () => {
    const entries = [
      entry('BAU', 'backlog', NOON),            // today
      entry('BAU', 'dashboard', NOON - 5_000),  // today
      entry('IJ', 'timeline', NOON - 2 * DAY),  // 2 days ago — drop
      entry('IJ', 'filters', NOON - 1 * DAY),   // yesterday — drop
    ];
    const out = selectRecentEntries(entries, 8, NOON);
    expect(out.map((e) => e.section).sort()).toEqual(['backlog', 'dashboard']);
  });

  it('falls back to most-recent entries when nothing was visited today', () => {
    const entries = [
      entry('BAU', 'backlog', NOON - 1 * DAY),
      entry('IJ', 'timeline', NOON - 2 * DAY),
    ];
    const out = selectRecentEntries(entries, 8, NOON);
    expect(out).toHaveLength(2); // never blank
  });

  it('dedupes within today by hub|project|section-family and respects limit', () => {
    const entries = [
      entry('BAU', 'backlog', NOON),
      entry('BAU', 'backlog', NOON - 1_000), // dup family
      entry('BAU', 'dashboard', NOON - 2_000),
    ];
    const out = selectRecentEntries(entries, 8, NOON);
    expect(out).toHaveLength(2);
  });
});

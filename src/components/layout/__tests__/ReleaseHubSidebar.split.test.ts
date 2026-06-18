/**
 * ReleaseHubSidebar — Backlog + Release Kanban split (artifact IA parity, 2026-06-18).
 *
 * Artifact `01-artifact-source.html` shows the "Releases" section with TWO
 * sibling nav items — "Backlog" (the table) and "Release Kanban" (the board) —
 * not a single "Releases" item with a view-toggle. This pins that IA.
 */
import { describe, it, expect } from 'vitest';
import { buildReleaseHubSections } from '../ReleaseHubSidebar';

describe('ReleaseHubSidebar — Backlog + Release Kanban split', () => {
  const sections = buildReleaseHubSections(0);
  const releases = sections.find((s) => s.title === 'Releases');

  it('has a Releases section', () => {
    expect(releases).toBeTruthy();
  });

  it('lists Backlog, Release Kanban, Production Events, Calendar in order', () => {
    expect(releases!.items.map((i) => i.id)).toEqual([
      'backlog',
      'release-kanban',
      'production-events',
      'calendar',
    ]);
  });

  it('renames the table item to "Backlog"', () => {
    const backlog = releases!.items.find((i) => i.id === 'backlog');
    expect(backlog?.title).toBe('Backlog');
    expect(backlog?.path).toBe('/release-hub/releases');
  });

  it('adds a dedicated "Release Kanban" board item', () => {
    const kanban = releases!.items.find((i) => i.id === 'release-kanban');
    expect(kanban?.title).toBe('Release Kanban');
    expect(kanban?.path).toBe('/release-hub/release-kanban');
  });
});

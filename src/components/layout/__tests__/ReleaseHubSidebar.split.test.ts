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

  it('lists Releases, Board, Calendar in order (Production Events moved to Change Management)', () => {
    expect(releases!.items.map((i) => i.id)).toEqual([
      'backlog',
      'release-kanban',
      'calendar',
    ]);
  });

  it('labels the table item "Releases"', () => {
    const backlog = releases!.items.find((i) => i.id === 'backlog');
    expect(backlog?.title).toBe('Releases');
    expect(backlog?.path).toBe('/release-hub/releases');
  });

  it('labels the dedicated board item "Board"', () => {
    const kanban = releases!.items.find((i) => i.id === 'release-kanban');
    expect(kanban?.title).toBe('Board');
    expect(kanban?.path).toBe('/release-hub/release-kanban');
  });
});

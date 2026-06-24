import { describe, it, expect } from 'vitest';
import { buildTree, type TimelineIssue } from '../useProjectHubTimeline';

const mk = (
  issueKey: string,
  issueType: string,
  parentKey: string | null = null,
): TimelineIssue => ({
  id: issueKey,
  issueKey,
  projectKey: 'BAU',
  issueType,
  summary: issueKey,
  status: '',
  statusCategory: null,
  priority: null,
  assigneeDisplayName: null,
  assigneeAvatarUrl: null,
  parentKey,
  startDate: null,
  dueDate: null,
  epicColor: null,
  fixVersions: [],
  sprintEndDate: null,
  sprintName: null,
  releaseDate: null,
  releaseName: null,
  children: [],
});

describe('buildTree — parentless base items bucket under a Story group', () => {
  it('nests items with a synced parent and buckets parentless base items', () => {
    const roots = buildTree([
      mk('E1', 'Epic'),
      mk('S1', 'Story', 'E1'),       // has epic parent → nested
      mk('S2', 'Story'),             // orphan → bucket
      mk('B1', 'QA Bug'),            // orphan → bucket
      mk('F1', 'Feature'),           // container → top level
    ]);

    // containers first (Epic, Feature), bucket last
    expect(roots).toHaveLength(3);
    expect(roots[0].issueKey).toBe('E1');
    expect(roots[0].children.map(c => c.issueKey)).toEqual(['S1']);
    expect(roots[1].issueKey).toBe('F1');

    const bucket = roots[2];
    expect(bucket.isGroup).toBe(true);
    expect(bucket.issueType).toBe('Story');
    expect(bucket.summary).toBe('Story');
    expect(bucket.children.map(c => c.issueKey).sort()).toEqual(['B1', 'S2']);
  });

  it('produces no bucket when every base item has a parent', () => {
    const roots = buildTree([mk('E1', 'Epic'), mk('S1', 'Story', 'E1')]);
    expect(roots).toHaveLength(1);
    expect(roots.some(r => r.isGroup)).toBe(false);
  });

  it('buckets everything under Story when there are no containers', () => {
    const roots = buildTree([mk('S1', 'Story'), mk('T1', 'Task')]);
    expect(roots).toHaveLength(1);
    expect(roots[0].isGroup).toBe(true);
    expect(roots[0].children).toHaveLength(2);
  });
});

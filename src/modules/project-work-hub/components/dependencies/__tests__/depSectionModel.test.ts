import { describe, it, expect } from 'vitest';
import {
  toDependencyRows,
  relatedKeysFor,
  filterCandidateIssues,
  RELATIONSHIP_LABEL,
  type CandidateIssue,
} from '../depSectionModel';
import type { DependencyEntry } from '@/components/shared/Timeline/dependencies/normalize';

const entry: DependencyEntry = {
  blockedBy: [{ key: 'PROJ-2', edgeId: 10, createdAt: '2026-01-01' }],
  blocks: [{ key: 'PROJ-3', edgeId: 11, createdAt: '2026-01-02' }],
};

describe('toDependencyRows', () => {
  it('flattens blockedBy → is_blocked_by and blocks → blocks', () => {
    const rows = toDependencyRows(entry);
    expect(rows).toEqual([
      { key: 'PROJ-2', relationship: 'is_blocked_by', edgeId: 10, createdAt: '2026-01-01' },
      { key: 'PROJ-3', relationship: 'blocks', edgeId: 11, createdAt: '2026-01-02' },
    ]);
  });
  it('returns [] for an empty entry', () => {
    expect(toDependencyRows({ blockedBy: [], blocks: [] })).toEqual([]);
  });
});

describe('relatedKeysFor', () => {
  it('collects both directions', () => {
    expect(relatedKeysFor(entry)).toEqual(new Set(['PROJ-2', 'PROJ-3']));
  });
});

describe('RELATIONSHIP_LABEL', () => {
  it('maps to Jira-parity labels', () => {
    expect(RELATIONSHIP_LABEL.blocks).toBe('blocks');
    expect(RELATIONSHIP_LABEL.is_blocked_by).toBe('is blocked by');
  });
});

describe('filterCandidateIssues', () => {
  const candidates: CandidateIssue[] = [
    { issue_key: 'PROJ-1', issue_type: 'Story', parent_key: null },   // self
    { issue_key: 'PROJ-2', issue_type: 'Story', parent_key: null },   // already related
    { issue_key: 'PROJ-4', issue_type: 'Sub-task', parent_key: null },// subtask
    { issue_key: 'PROJ-5', issue_type: 'Story', parent_key: 'PROJ-1' },// direct child
    { issue_key: 'PROJ-6', issue_type: 'Epic', parent_key: null },    // OK
  ];
  it('excludes self, related, subtasks, and direct children', () => {
    const out = filterCandidateIssues(candidates, {
      issueKey: 'PROJ-1',
      relatedKeys: new Set(['PROJ-2']),
      subtaskTypesLower: new Set(['sub-task', 'subtask']),
    });
    expect(out.map((c) => c.issue_key)).toEqual(['PROJ-6']);
  });
});

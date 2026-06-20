// Replay engine unit tests.
// Run: npx tsx --test src/lib/replay/__tests__/replayEngine.test.ts
// (Uses Node built-in test runner via tsx — no Vitest/Jest needed.)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReplayResult, buildSingleIssueLane } from '../replayEngine';
import type { ReplayIssue, WorkItemTransition } from '../replayTypes';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeIssue(overrides: Partial<ReplayIssue> = {}): ReplayIssue {
  return {
    id: 'uuid-1',
    issue_key: 'BAU-100',
    issue_type: 'Story',
    summary: 'Test story',
    parent_key: null,
    project_key: 'BAU',
    jira_created_at: '2026-01-01T08:00:00.000Z',
    jira_updated_at: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeTransition(
  overrides: Partial<WorkItemTransition> & { work_item_id: string },
): WorkItemTransition {
  return {
    id: 'trans-' + Math.random(),
    from_status: null,
    to_status: 'In Progress',
    from_status_category: 'To Do',
    to_status_category: 'In Progress',
    transitioned_by: 'Alice',
    transitioned_by_avatar: null,
    transitioned_at: '2026-01-05T09:00:00.000Z',
    time_in_from_status_ms: null,
    jira_changelog_id: 'cl-1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildSingleIssueLane — no transitions', () => {
  it('produces one open segment in To Do category', () => {
    const issue = makeIssue();
    const lane = buildSingleIssueLane(issue, []);

    assert.equal(lane.issueKey, 'BAU-100');
    assert.equal(lane.segments.length, 1);
    assert.equal(lane.segments[0].category, 'To Do');
    assert.equal(lane.segments[0].endAt, null); // open
    assert.equal(lane.detours.length, 0);
    assert.equal(lane.annotations.length, 0);
  });
});

describe('buildSingleIssueLane — linear progression', () => {
  it('builds correct segments with accurate duration', () => {
    const issue = makeIssue();
    const t1 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Requirements',
      to_status: 'In Design',
      from_status_category: 'To Do',
      to_status_category: 'In Progress',
      transitioned_by: 'Alice',
      transitioned_at: '2026-01-05T09:00:00.000Z',
      jira_changelog_id: 'cl-1',
    });
    const t2 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Design',
      to_status: 'Done',
      from_status_category: 'In Progress',
      to_status_category: 'Done',
      transitioned_by: 'Alice',
      transitioned_at: '2026-01-10T09:00:00.000Z',
      jira_changelog_id: 'cl-2',
    });

    const lane = buildSingleIssueLane(issue, [t1, t2]);

    // seg[0]: In Requirements (creation → t1)
    // seg[1]: In Design (t1 → t2)
    // seg[2]: Done (t2 → open)
    assert.equal(lane.segments.length, 3);
    assert.equal(lane.segments[0].status, 'In Requirements');
    assert.equal(lane.segments[0].category, 'To Do');
    assert.equal(lane.segments[1].status, 'In Design');
    assert.equal(lane.segments[1].category, 'In Progress');
    assert.equal(lane.segments[2].status, 'Done');
    assert.equal(lane.segments[2].category, 'Done');

    // Duration of In Design segment: 5 days = 432_000_000 ms
    assert.equal(lane.segments[1].durationMs, 5 * 24 * 60 * 60 * 1000);

    // No detours on a linear flow
    assert.equal(lane.detours.length, 0);
  });
});

describe('buildSingleIssueLane — detour detection', () => {
  it('flags a regression that persists beyond oversight tolerance', () => {
    const issue = makeIssue();
    const baseTime = new Date('2026-01-01T08:00:00.000Z').getTime();
    const hr = 3_600_000;

    // Forward: Requirements → In Design → Done
    // Then backward: Done → In Design (persists 2h → real detour)
    const t1 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Requirements',
      to_status: 'In Design',
      from_status_category: 'To Do',
      to_status_category: 'In Progress',
      transitioned_at: new Date(baseTime + 24 * hr).toISOString(),
      jira_changelog_id: 'cl-1',
    });
    const t2 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Design',
      to_status: 'Done',
      from_status_category: 'In Progress',
      to_status_category: 'Done',
      transitioned_at: new Date(baseTime + 48 * hr).toISOString(),
      jira_changelog_id: 'cl-2',
    });
    const t3 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'Done',
      to_status: 'In Design',
      from_status_category: 'Done',
      to_status_category: 'In Progress',
      transitioned_at: new Date(baseTime + 50 * hr).toISOString(), // 2h after Done
      jira_changelog_id: 'cl-3',
    });

    const lane = buildSingleIssueLane(issue, [t1, t2, t3], { oversightToleranceMs: hr });

    assert.equal(lane.detours.length, 1);
    assert.equal(lane.detours[0].fromStatus, 'Done');
    assert.equal(lane.detours[0].toStatus, 'In Design');
    // Persists 2h > 1h tolerance → real detour
    assert.ok((lane.detours[0].durationMs ?? 0) > hr);
  });

  it('does NOT flag a regression within oversight tolerance (< 1h)', () => {
    const issue = makeIssue();
    const baseTime = new Date('2026-01-01T08:00:00.000Z').getTime();
    const hr = 3_600_000;

    const t1 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Requirements',
      to_status: 'Done',
      from_status_category: 'To Do',
      to_status_category: 'Done',
      transitioned_at: new Date(baseTime + 24 * hr).toISOString(),
      jira_changelog_id: 'cl-1',
    });
    const t2 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'Done',
      to_status: 'In Progress',
      from_status_category: 'Done',
      to_status_category: 'In Progress',
      transitioned_at: new Date(baseTime + 24 * hr + 1_800_000).toISOString(), // 30 min later
      jira_changelog_id: 'cl-2',
    });
    const t3 = makeTransition({
      work_item_id: 'uuid-1',
      from_status: 'In Progress',
      to_status: 'Done',
      from_status_category: 'In Progress',
      to_status_category: 'Done',
      transitioned_at: new Date(baseTime + 24 * hr + 3_000_000).toISOString(), // 50 min after cl-2
      jira_changelog_id: 'cl-3',
    });

    const lane = buildSingleIssueLane(issue, [t1, t2, t3], { oversightToleranceMs: hr });

    // cl-2 → cl-3: 50 min < 1h tolerance → oversight, NOT a detour
    assert.equal(lane.detours.length, 0);
  });
});

describe('buildSingleIssueLane — handover annotations', () => {
  it('annotates when the transitioned_by person changes', () => {
    const issue = makeIssue();
    const t1 = makeTransition({
      work_item_id: 'uuid-1',
      transitioned_by: 'Alice',
      transitioned_at: '2026-01-05T09:00:00.000Z',
      jira_changelog_id: 'cl-1',
    });
    const t2 = makeTransition({
      work_item_id: 'uuid-1',
      transitioned_by: 'Bob',
      transitioned_at: '2026-01-10T09:00:00.000Z',
      jira_changelog_id: 'cl-2',
    });

    const lane = buildSingleIssueLane(issue, [t1, t2]);

    assert.equal(lane.annotations.length, 1);
    assert.equal(lane.annotations[0].type, 'handover');
    assert.equal(lane.annotations[0].fromPerson, 'Alice');
    assert.equal(lane.annotations[0].toPerson, 'Bob');
  });

  it('does NOT annotate when the same person makes consecutive transitions', () => {
    const issue = makeIssue();
    const t1 = makeTransition({
      work_item_id: 'uuid-1',
      transitioned_by: 'Alice',
      transitioned_at: '2026-01-05T09:00:00.000Z',
      jira_changelog_id: 'cl-1',
    });
    const t2 = makeTransition({
      work_item_id: 'uuid-1',
      transitioned_by: 'Alice',
      transitioned_at: '2026-01-10T09:00:00.000Z',
      jira_changelog_id: 'cl-2',
    });

    const lane = buildSingleIssueLane(issue, [t1, t2]);
    assert.equal(lane.annotations.length, 0);
  });
});

describe('buildSingleIssueLane — milestones', () => {
  it('includes sprint_end milestone when sprint_end_date is set', () => {
    const issue = makeIssue({ sprint_end_date: '2026-02-28T00:00:00.000Z' });
    const lane = buildSingleIssueLane(issue, []);

    assert.equal(lane.milestones.length, 1);
    assert.equal(lane.milestones[0].type, 'sprint_end');
  });

  it('prefers release_date over due_date for milestone', () => {
    const issue = makeIssue({
      release_date: '2026-03-01T00:00:00.000Z',
      due_date: '2026-02-15T00:00:00.000Z',
    });
    const lane = buildSingleIssueLane(issue, []);

    // Both release_date and due_date present: release_date renders, due_date suppressed
    const types = lane.milestones.map((m) => m.type);
    assert.ok(types.includes('release'));
    assert.ok(!types.includes('due_date'));
  });
});

describe('buildSingleIssueLane — scope creep', () => {
  it('flags scope creep when child created >1 day after parent', () => {
    const parent = makeIssue({
      id: 'uuid-parent',
      issue_key: 'BAU-50',
      issue_type: 'Epic',
      jira_created_at: '2026-01-01T00:00:00.000Z',
    });
    const child = makeIssue({
      id: 'uuid-child',
      issue_key: 'BAU-99',
      parent_key: 'BAU-50',
      jira_created_at: '2026-01-10T00:00:00.000Z', // 9 days later
    });

    const result = buildReplayResult([parent, child], [], {
      scopeCreepThresholdMs: 86_400_000,
    });

    const childLane = result.lanes.find((l) => l.issueKey === 'BAU-99')!;
    assert.ok(childLane);
    assert.equal(childLane.isScopeCreep, true);
    assert.equal(childLane.scopeCreepDaysAfterParent, 9);
  });

  it('does NOT flag scope creep when child created within threshold', () => {
    const parent = makeIssue({
      id: 'uuid-parent',
      issue_key: 'BAU-50',
      issue_type: 'Epic',
      jira_created_at: '2026-01-01T00:00:00.000Z',
    });
    const child = makeIssue({
      id: 'uuid-child',
      issue_key: 'BAU-99',
      parent_key: 'BAU-50',
      jira_created_at: '2026-01-01T12:00:00.000Z', // 12h later — within 1 day threshold
    });

    const result = buildReplayResult([parent, child], [], {
      scopeCreepThresholdMs: 86_400_000,
    });

    const childLane = result.lanes.find((l) => l.issueKey === 'BAU-99')!;
    assert.equal(childLane.isScopeCreep, false);
  });
});

describe('buildReplayResult — subtask exclusion', () => {
  it('excludes sub-task types from lanes by default', () => {
    const story = makeIssue({ id: 'uuid-1', issue_key: 'BAU-100', issue_type: 'Story' });
    const subtask = makeIssue({ id: 'uuid-2', issue_key: 'BAU-101', issue_type: 'Sub-task' });
    const backend = makeIssue({ id: 'uuid-3', issue_key: 'BAU-102', issue_type: 'Backend' });

    const result = buildReplayResult([story, subtask, backend], []);

    const keys = result.lanes.map((l) => l.issueKey);
    assert.ok(keys.includes('BAU-100'));
    assert.ok(!keys.includes('BAU-101'));
    assert.ok(!keys.includes('BAU-102'));
  });
});

describe('buildReplayResult — moduleSource', () => {
  it('labels MDT issues as Product and BAU as Project', () => {
    const mdt = makeIssue({ id: 'uuid-1', issue_key: 'MDT-10', project_key: 'MDT' });
    const bau = makeIssue({ id: 'uuid-2', issue_key: 'BAU-10', project_key: 'BAU' });

    const result = buildReplayResult([mdt, bau], []);

    const mdtLane = result.lanes.find((l) => l.issueKey === 'MDT-10')!;
    const bauLane = result.lanes.find((l) => l.issueKey === 'BAU-10')!;

    assert.equal(mdtLane.moduleSource, 'Product · MDT');
    assert.equal(bauLane.moduleSource, 'Project · BAU');
  });
});

describe('buildReplayResult — timeline bounds', () => {
  it('returns correct timelineStart and timelineEnd', () => {
    const issue = makeIssue({ jira_created_at: '2026-03-01T00:00:00.000Z' });
    const t = makeTransition({
      work_item_id: 'uuid-1',
      to_status: 'Done',
      to_status_category: 'Done',
      transitioned_at: '2026-06-01T00:00:00.000Z',
      jira_changelog_id: 'cl-1',
    });

    const result = buildReplayResult([issue], [t]);

    assert.ok(result.timelineStart.startsWith('2026-03-01'));
    // End is open (last segment has endAt=null) so timelineEnd ≈ now
    assert.ok(new Date(result.timelineEnd) > new Date('2026-06-01'));
  });
});

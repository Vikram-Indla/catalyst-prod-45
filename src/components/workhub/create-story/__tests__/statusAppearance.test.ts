/**
 * statusAppearance — pure function, exported for testing (Bucket B).
 *
 * Also asserts that no per-type hardcoded initial status map is exported
 * (Vikram directive 2026-05-09: initial status must come from
 * catalyst_workflow_schemes via useWorkflowStatuses, not a hardcoded map).
 */
import { describe, it, expect } from 'vitest';
import { statusAppearanceForTest } from '../CreateStoryModal';

describe('statusAppearance', () => {
  it.each([
    ['Done',      'success'],
    ['Closed',    'success'],
    ['Resolved',  'success'],
    ['In Progress',  'inprogress'],
    ['In Review',    'inprogress'],
    ['To Do',        'default'],
    ['Open',         'default'],
    ['In Requirements', 'inprogress'],  // "in " prefix → inprogress (workflow state)
    ['Submitted',    'default'],
    ['Backlog',      'default'],
  ] as const)('"%s" → "%s"', (status, expected) => {
    expect(statusAppearanceForTest(status)).toBe(expected);
  });
});

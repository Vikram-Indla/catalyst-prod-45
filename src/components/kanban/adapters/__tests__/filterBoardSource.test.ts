/**
 * filterBoardSource — maps a saved filter's JQL result rows into BoardIssue[]
 * so a filter-backed Kanban reuses the EXISTING PragmaticBoard renderer
 * (Step 4a of the filter→Kanban vertical).
 *
 * Contract (this test is the spec — implementation follows):
 *   - Every JqlResultRow field maps to its BoardIssue counterpart.
 *   - ZERO-ASSUMPTION rule (CLAUDE.md P0): fields the JQL projection does not
 *     carry are rendered neutral, NEVER a plausible-but-wrong domain default:
 *       · priority missing  -> ''   (NOT 'Medium')
 *       · labels missing     -> []
 *       · sprintRelease[]    -> first element or null (fixVersion)
 *       · isFlagged          -> false (absence of a flag = not flagged)
 *       · storyPoints/sprintName -> null (not in the projection)
 */
import { describe, it, expect } from 'vitest';
import { jqlRowToBoardIssue } from '@/components/kanban/adapters/filterBoardSource';
import type { JqlResultRow } from '@/hooks/workhub/useJqlResults';

const fullRow: JqlResultRow = {
  id: 'uuid-1',
  key: 'BAU-42',
  summary: 'Wire the dashboard',
  issueType: 'Story',
  status: 'In Progress',
  statusCategory: 'In Progress',
  projectKey: 'BAU',
  assigneeName: 'Sara N.',
  reporterName: 'Omar K.',
  priority: 'High',
  labels: ['q2', 'frontend'],
  sprintRelease: ['Release 2.2', 'Release 2.3'],
  commentCount: 4,
  created: '2026-06-01T00:00:00Z',
  updated: '2026-06-10T00:00:00Z',
  dueDate: '2026-06-20',
  parentKey: 'BAU-1',
  parentSummary: 'Q2 epic',
};

describe('jqlRowToBoardIssue', () => {
  it('maps a fully-populated row faithfully', () => {
    expect(jqlRowToBoardIssue(fullRow)).toEqual({
      id: 'uuid-1',
      issueKey: 'BAU-42',
      summary: 'Wire the dashboard',
      issueType: 'Story',
      priority: 'High',
      status: 'In Progress',
      statusCategory: 'In Progress',
      assigneeName: 'Sara N.',
      labels: ['q2', 'frontend'],
      sprintName: null,
      storyPoints: null,
      parentKey: 'BAU-1',
      parentSummary: 'Q2 epic',
      fixVersion: 'Release 2.2',
      isFlagged: false,
      updatedAt: '2026-06-10T00:00:00Z',
      createdAt: '2026-06-01T00:00:00Z',
    });
  });

  it('renders missing values neutral, never a fake domain default', () => {
    const sparse: JqlResultRow = {
      ...fullRow,
      priority: null,
      labels: null,
      sprintRelease: null,
      parentKey: null,
      parentSummary: null,
      assigneeName: null,
      created: null,
      updated: null,
    };
    const out = jqlRowToBoardIssue(sparse);
    expect(out.priority).toBe('');        // NOT 'Medium'
    expect(out.labels).toEqual([]);
    expect(out.fixVersion).toBeNull();
    expect(out.parentKey).toBeNull();
    expect(out.assigneeName).toBeNull();
    expect(out.isFlagged).toBe(false);
    expect(out.updatedAt).toBeNull();
  });
});

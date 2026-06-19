/**
 * Golden test for the canonical jqlToFilterState (Phase C / G2).
 *
 * Pins the lib parser against the real saved-filter JQL corpus
 * (ph_saved_filters.jql_query, snapshot 2026-06-19). This is the single parser
 * now used by ProjectAllWorkView / ProductAllWorkView AND (after the Phase C
 * de-fork) by FilterPreviewPage / ProductFilterPreviewPage — the two regex
 * forks were deleted in favour of this one.
 *
 * Contract pinned:
 *  - project clauses are dropped (no project facet in the builder)
 *  - status / issuetype(workType) facets populate from = and in
 *  - account-id AND display-name assignees populate the assignee facet
 *    (itemPassesFilters matches both — AllWorkToolbar, Path B)
 */
import { describe, it, expect } from 'vitest';
import { jqlToFilterState, hasActiveFacets } from '../jqlToFilterState';

const get = (jql: string) => jqlToFilterState(jql) as Record<string, string[]>;
const ACC1 = '5ff30c7b44065f013f971b80';
const ACC2 = '712020:c0113e0c-ee77-4f30-82ea-1626526f4f39';

describe('jqlToFilterState — real ph_saved_filters corpus (golden)', () => {
  it('status = "Backlog" → status facet, project dropped', () => {
    const s = get('project = "BAU" AND status = "Backlog"');
    expect(s.status).toEqual(['Backlog']);
    expect((s as Record<string, unknown>).project).toBeUndefined();
  });

  it('issuetype maps to the workType facet', () => {
    const s = get('project = "BAU" AND issuetype = "Epic" AND status = "In Progress"');
    expect(s.workType).toEqual(['Epic']);
    expect(s.status).toEqual(['In Progress']);
  });

  it('multi-value status "in (...)" with spaced values is preserved', () => {
    const s = get('status in ("Backlog", "In Development", "BETA READY", "In Design", "In Production", "In Progress")');
    expect(s.status).toEqual(['Backlog', 'In Development', 'BETA READY', 'In Design', 'In Production', 'In Progress']);
  });

  it('account-id assignees populate the assignee facet (in clause)', () => {
    const s = get(`assignee in ("${ACC1}", "${ACC2}") AND status = "BETA READY"`);
    expect(s.assignee).toEqual([ACC1, ACC2]);
    expect(s.status).toEqual(['BETA READY']);
  });

  it('account-id assignee populates the assignee facet (eq clause)', () => {
    const s = get(`project = "BAU" AND assignee = "${ACC2}" AND status in ("Backlog")`);
    expect(s.assignee).toEqual([ACC2]);
    expect(s.status).toEqual(['Backlog']);
  });

  it('every real filter produces at least one active facet', () => {
    const corpus = [
      'project = "BAU" AND status = "Backlog"',
      'project = "INV" AND status = "In Development"',
      `assignee in ("${ACC1}", "${ACC2}") AND status = "BETA READY"`,
      'issuetype = "Task" AND status = "Backlog"',
      'project = "BAU" AND issuetype = "Epic" AND status = "In Progress"',
      'project = "INV" AND issuetype = "Business Request" AND status = "In Development"',
      'status = "Backlog"',
      `project = "BAU" AND assignee = "${ACC2}" AND status in ("Backlog", "In Development")`,
    ];
    for (const jql of corpus) expect(hasActiveFacets(jqlToFilterState(jql))).toBe(true);
  });
});

describe('hasActiveFacets', () => {
  it('is false for empty / unrecognised JQL', () => {
    expect(hasActiveFacets(jqlToFilterState(''))).toBe(false);
    expect(hasActiveFacets(jqlToFilterState('cf[99999] = "x"'))).toBe(false);
  });
});

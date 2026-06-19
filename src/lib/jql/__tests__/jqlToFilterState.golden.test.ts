/**
 * Characterization test for the canonical jqlToFilterState (Phase C / G2 groundwork).
 *
 * Pins the lib parser's CURRENT output against the real saved-filter JQL corpus
 * (ph_saved_filters.jql_query, snapshot 2026-06-19). This is the parser that
 * ProjectAllWorkView / ProductAllWorkView already use in production.
 *
 * Purpose: the two preview pages (FilterPreviewPage, ProductFilterPreviewPage)
 * carry a divergent regex fork of this parser (gap G2). Before those forks can
 * be deleted in favour of this lib parser, the parsers must be proven
 * equivalent on real data. This test documents where they are NOT yet
 * equivalent — see the ACCOUNT-ID GAP below — which is why the de-fork is
 * currently blocked (see docs/implementation/filters/03-GAP-AUDIT.md G2).
 *
 * ── ACCOUNT-ID GAP (blocks the de-fork) ──
 * For `assignee = "712020:..."` the lib parser drops the assignee facet:
 * translate() emits the `assignee_account_id` column (not assignee_display_name),
 * and COLUMN_TO_FACET only maps the display-name column. The regex fork in the
 * preview pages keys on the JQL field name `assignee` and KEEPS the value.
 * Mapping assignee_account_id → 'assignee' in the lib looks trivial but changes
 * AllWork behaviour: itemPassesFilters (AllWorkToolbar.tsx:382) matches
 * f.assignee against item.assignee.name (display name), while applyServerFilter
 * matches assignee_account_id — a pre-existing id-vs-name inconsistency that
 * must be resolved first. Do NOT broaden COLUMN_TO_FACET without fixing that.
 */
import { describe, it, expect } from 'vitest';
import { jqlToFilterState } from '../jqlToFilterState';

const get = (jql: string) => jqlToFilterState(jql) as Record<string, string[]>;

describe('jqlToFilterState — real ph_saved_filters corpus (characterization)', () => {
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

  it('bare status (no project clause) parses', () => {
    expect(get('status = "Backlog"').status).toEqual(['Backlog']);
  });

  // ACCOUNT-ID GAP — pinned, NOT desired end state. When the de-fork lands with
  // the AllWork id/name fix, flip these to expect the account id in s.assignee.
  it('KNOWN GAP: account-id assignee is currently DROPPED by the lib parser', () => {
    const s = get('project = "BAU" AND assignee = "712020:c0113e0c-ee77-4f30-82ea-1626526f4f39" AND status in ("Backlog")');
    expect(s.assignee ?? []).toEqual([]); // regex fork keeps it; lib drops it
    expect(s.status).toEqual(['Backlog']);
  });

  it('empty / unrecognised JQL parses to an all-empty FilterState', () => {
    expect(get('').status ?? []).toEqual([]);
    expect(get('cf[99999] = "x"').status ?? []).toEqual([]);
  });
});

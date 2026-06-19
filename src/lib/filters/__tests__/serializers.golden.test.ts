/**
 * Golden snapshot of the THREE forward filter→JQL serializers (Phase C3/C4, G2).
 *
 * These three are divergent BY DESIGN — different input types, field sets,
 * escaping, and ORDER BY behaviour:
 *   - basicToJql(JiraFilterValue)           — facet UI, date ranges, no ORDER BY, no escape
 *   - filterStateToJql(FilterState) [lib]    — escapes quotes, appends ORDER BY updated DESC
 *   - filterStateToJql(FilterState) [toolbar]— parent/storyPoints/severity facets, no ORDER BY, no escape
 *
 * This test PINS each one's exact output so the shared jqlClause() extraction
 * (and any future change) is provably byte-identical. If any assertion flips,
 * a serializer's output drifted — saved filters would re-serialize differently.
 */
import { describe, it, expect } from 'vitest';
import { basicToJql } from '../basicToJql';
import { filterStateToJql as libFilterStateToJql } from '../filterStateToJql';
import {
  filterStateToJql as toolbarFilterStateToJql,
  EMPTY_FILTERS,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { emptyFilterValue } from '@/components/shared/JiraFilterAtlaskit';

describe('basicToJql (JiraFilterValue)', () => {
  it('single value uses =', () => {
    expect(basicToJql({ ...emptyFilterValue, status: ['Open'] })).toBe('status = "Open"');
  });
  it('multi value uses in (...) and ANDs date ranges', () => {
    expect(
      basicToJql({ ...emptyFilterValue, status: ['A', 'B'], created: { from: '2026-01-01' } }),
    ).toBe('status in ("A", "B") AND created >= "2026-01-01"');
  });
  it('empty → empty string', () => {
    expect(basicToJql({ ...emptyFilterValue })).toBe('');
  });
});

describe('filterStateToJql [lib] — escapes + ORDER BY', () => {
  it('single value with ORDER BY appended', () => {
    expect(libFilterStateToJql({ ...EMPTY_FILTERS, status: ['Open'] }))
      .toBe('status = "Open" ORDER BY updated DESC');
  });
  it('projectKey prefix', () => {
    expect(libFilterStateToJql({ ...EMPTY_FILTERS, status: ['Open'] }, 'BAU'))
      .toBe('project = "BAU" AND status = "Open" ORDER BY updated DESC');
  });
  it('escapes embedded quotes', () => {
    expect(libFilterStateToJql({ ...EMPTY_FILTERS, status: ['a"b'] }))
      .toBe('status = "a\\"b" ORDER BY updated DESC');
  });
  it('empty → empty string', () => {
    expect(libFilterStateToJql({ ...EMPTY_FILTERS })).toBe('');
  });
});

describe('filterStateToJql [toolbar] — extra facets, no ORDER BY', () => {
  it('single status', () => {
    expect(toolbarFilterStateToJql({ ...EMPTY_FILTERS, status: ['Open'] })).toBe('status = "Open"');
  });
  it('severity maps to cf[10125]', () => {
    expect(toolbarFilterStateToJql({ ...EMPTY_FILTERS, severity: ['High'] })).toBe('cf[10125] = "High"');
  });
  it('projectKey prefix with parent facet', () => {
    expect(toolbarFilterStateToJql({ ...EMPTY_FILTERS, parent: ['BAU-1'] }, 'BAU'))
      .toBe('project = "BAU" AND parent = "BAU-1"');
  });
  it('empty → empty string', () => {
    expect(toolbarFilterStateToJql({ ...EMPTY_FILTERS })).toBe('');
  });
});

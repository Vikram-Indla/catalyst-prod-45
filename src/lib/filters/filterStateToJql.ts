/**
 * filterStateToJql — converts the AllWork FilterState into a JQL string.
 * Used when the user clicks "Save filter" to persist the current toolbar
 * selection as a named saved filter.
 *
 * Only facets with at least one selected value produce a JQL clause.
 * ORDER BY updated DESC is appended so results feel live by default.
 */
import type { FilterState } from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { jqlClause } from './jqlClause';

/** Map FilterState facet → JQL field name */
const FACET_TO_JQL_FIELD: Partial<Record<keyof FilterState, string>> = {
  status:      'status',
  assignee:    'assignee',
  reporter:    'reporter',
  priority:    'priority',
  workType:    'issuetype',
  labels:      'labels',
  sprintReleases: 'fixVersion',
  sprint:      'sprint',
  resolution:  'resolution',
};

function quoted(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

export function filterStateToJql(state: FilterState, projectKey?: string): string {
  const clauses: string[] = [];

  if (projectKey) {
    clauses.push(`project = "${projectKey}"`);
  }

  for (const [facet, jqlField] of Object.entries(FACET_TO_JQL_FIELD) as [keyof FilterState, string][]) {
    const c = jqlClause(jqlField, state[facet], quoted);
    if (c) clauses.push(c);
  }

  if (clauses.length === 0) return '';
  return clauses.join(' AND ') + ' ORDER BY updated DESC';
}

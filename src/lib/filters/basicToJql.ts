/**
 * basicToJql — converts a JiraFilterValue (facet UI state) to a JQL string.
 * Shared by CreateFilterPage and BacklogPage "Save as filter".
 */
import type { JiraFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import { jqlClause } from './jqlClause';

export function basicToJql(v: JiraFilterValue): string {
  const clauses: string[] = [];

  // Facet clauses share jqlClause (= / in). basicToJql does not escape quotes,
  // so the default quote fn is used.
  const facets: Array<[string, string[]]> = [
    ['status', v.status],
    ['assignee', v.assignees],
    ['reporter', v.reporter],
    ['priority', v.priority],
    ['issuetype', v.workType],
    ['labels', v.labels],
    ['fixVersion', v.sprintReleases],
  ];
  for (const [field, values] of facets) {
    const c = jqlClause(field, values);
    if (c) clauses.push(c);
  }

  if (v.created.from)  clauses.push(`created >= "${v.created.from}"`);
  if (v.created.to)    clauses.push(`created <= "${v.created.to}"`);
  if (v.updated.from)  clauses.push(`updated >= "${v.updated.from}"`);
  if (v.updated.to)    clauses.push(`updated <= "${v.updated.to}"`);

  return clauses.join(' AND ');
}

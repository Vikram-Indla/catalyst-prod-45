/**
 * basicToJql — converts a JiraFilterValue (facet UI state) to a JQL string.
 * Shared by CreateFilterPage and BacklogPage "Save as filter".
 */
import type { JiraFilterValue } from '@/components/shared/JiraFilterAtlaskit';

export function basicToJql(v: JiraFilterValue): string {
  const clauses: string[] = [];

  if (v.status.length === 1)       clauses.push(`status = "${v.status[0]}"`);
  else if (v.status.length > 1)    clauses.push(`status in (${v.status.map(s => `"${s}"`).join(', ')})`);

  if (v.assignees.length === 1)    clauses.push(`assignee = "${v.assignees[0]}"`);
  else if (v.assignees.length > 1) clauses.push(`assignee in (${v.assignees.map(a => `"${a}"`).join(', ')})`);

  if (v.reporter.length === 1)     clauses.push(`reporter = "${v.reporter[0]}"`);
  else if (v.reporter.length > 1)  clauses.push(`reporter in (${v.reporter.map(r => `"${r}"`).join(', ')})`);

  if (v.priority.length === 1)     clauses.push(`priority = "${v.priority[0]}"`);
  else if (v.priority.length > 1)  clauses.push(`priority in (${v.priority.map(p => `"${p}"`).join(', ')})`);

  if (v.workType.length === 1)     clauses.push(`issuetype = "${v.workType[0]}"`);
  else if (v.workType.length > 1)  clauses.push(`issuetype in (${v.workType.map(t => `"${t}"`).join(', ')})`);

  if (v.labels.length === 1)       clauses.push(`labels = "${v.labels[0]}"`);
  else if (v.labels.length > 1)    clauses.push(`labels in (${v.labels.map(l => `"${l}"`).join(', ')})`);

  if (v.fixVersions.length === 1)  clauses.push(`fixVersion = "${v.fixVersions[0]}"`);
  else if (v.fixVersions.length > 1) clauses.push(`fixVersion in (${v.fixVersions.map(f => `"${f}"`).join(', ')})`);

  if (v.created.from)  clauses.push(`created >= "${v.created.from}"`);
  if (v.created.to)    clauses.push(`created <= "${v.created.to}"`);
  if (v.updated.from)  clauses.push(`updated >= "${v.updated.from}"`);
  if (v.updated.to)    clauses.push(`updated <= "${v.updated.to}"`);

  return clauses.join(' AND ');
}

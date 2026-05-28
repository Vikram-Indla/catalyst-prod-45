/**
 * jqlToJiraFilterValue — converts a JQL string into the JiraFilterValue shape
 * used by JiraFilterAtlaskit and BacklogPage.
 *
 * Only maps facets that JiraFilterValue supports:
 *   status, assignee(s), reporter, priority, issuetype (→ workType),
 *   labels, fixVersion(s), created, updated date ranges.
 *
 * Complex predicates (parent, sprint, IS EMPTY, NOT IN, functions) are
 * silently dropped — they fall outside the facet model.
 */
import { translate } from './index';
import { emptyFilterValue, type JiraFilterValue, type PriorityLevel } from '@/components/shared/JiraFilterAtlaskit';

const VALID_PRIORITIES = new Set<PriorityLevel>(['highest', 'high', 'medium', 'low', 'lowest']);

function toPriority(v: string): PriorityLevel | null {
  const lower = v.toLowerCase() as PriorityLevel;
  return VALID_PRIORITIES.has(lower) ? lower : null;
}

export function jqlToJiraFilterValue(jql: string): JiraFilterValue {
  if (!jql?.trim()) return { ...emptyFilterValue };

  const result: JiraFilterValue = { ...emptyFilterValue };
  const filters = translate(jql);

  for (const f of filters) {
    const col = f.column;
    const op = (f as any).operator as string | undefined;
    const values: string[] = Array.isArray((f as any).values)
      ? (f as any).values
      : (f as any).value != null ? [(f as any).value] : [];

    if (!col || !values.length) continue;

    if (col === 'status') {
      result.status = [...result.status, ...values];
    } else if (col === 'assignee_display_name' || col === 'assignee_account_id') {
      result.assignees = [...result.assignees, ...values];
    } else if (col === 'reporter_display_name' || col === 'reporter_account_id') {
      result.reporter = [...result.reporter, ...values];
    } else if (col === 'priority') {
      const valid = values.map(toPriority).filter(Boolean) as PriorityLevel[];
      result.priority = [...result.priority, ...valid];
    } else if (col === 'issue_type') {
      result.workType = [...result.workType, ...values];
    } else if (col === 'labels') {
      result.labels = [...result.labels, ...values];
    } else if (col === 'fix_versions') {
      result.fixVersions = [...result.fixVersions, ...values];
    } else if (col === 'jira_created_at') {
      if (op === '>=' || op === '>') {
        result.created = { ...result.created, from: values[0] };
      } else if (op === '<=' || op === '<') {
        result.created = { ...result.created, to: values[0] };
      }
    } else if (col === 'jira_updated_at') {
      if (op === '>=' || op === '>') {
        result.updated = { ...result.updated, from: values[0] };
      } else if (op === '<=' || op === '<') {
        result.updated = { ...result.updated, to: values[0] };
      }
    }
  }

  return result;
}

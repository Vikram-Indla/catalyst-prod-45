import { translate } from '@/lib/jql';
import type { JqlFilter } from '@/lib/jql';
import { emptyFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import type { JiraFilterValue, PriorityLevel } from '@/components/shared/JiraFilterAtlaskit';

/**
 * Parses a JQL string back into a JiraFilterValue.
 * Only eq/in/gte/lte operators on supported columns are mapped;
 * everything else is silently ignored (the raw JQL remains the source of truth).
 */
export function jqlToFilterValue(jql: string): JiraFilterValue {
  if (!jql.trim()) return { ...emptyFilterValue };

  const filters = translate(jql);
  const result: JiraFilterValue = { ...emptyFilterValue };

  for (const f of filters) {
    applyFilter(f, result);
  }

  return result;
}

function toArray(value: JqlFilter['value']): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function applyFilter(f: JqlFilter, result: JiraFilterValue): void {
  if (f.method !== 'eq' && f.method !== 'in' && f.method !== 'gte' && f.method !== 'lte') return;

  switch (f.column) {
    case 'status':
      result.status = [...result.status, ...toArray(f.value)];
      break;

    case 'assignee_display_name':
    case 'assignee_account_id':
      result.assignees = [...result.assignees, ...toArray(f.value)];
      break;

    case 'reporter_display_name':
    case 'reporter_account_id':
      result.reporter = [...result.reporter, ...toArray(f.value)];
      break;

    case 'priority':
      result.priority = [...result.priority, ...toArray(f.value)] as PriorityLevel[];
      break;

    case 'issue_type':
      result.workType = [...result.workType, ...toArray(f.value)];
      break;

    case 'labels':
      result.labels = [...result.labels, ...toArray(f.value)];
      break;

    case 'sprint_release':
      result.sprintReleases = [...result.sprintReleases, ...toArray(f.value)];
      break;

    case 'jira_created_at':
      if (f.method === 'gte' && typeof f.value === 'string') result.created = { ...result.created, from: f.value };
      if (f.method === 'lte' && typeof f.value === 'string') result.created = { ...result.created, to: f.value };
      break;

    case 'jira_updated_at':
      if (f.method === 'gte' && typeof f.value === 'string') result.updated = { ...result.updated, from: f.value };
      if (f.method === 'lte' && typeof f.value === 'string') result.updated = { ...result.updated, to: f.value };
      break;

    case 'due_date':
      if (f.method === 'gte' && typeof f.value === 'string') result.dateRange = { ...result.dateRange, start: f.value };
      if (f.method === 'lte' && typeof f.value === 'string') result.dateRange = { ...result.dateRange, due: f.value };
      break;
  }
}

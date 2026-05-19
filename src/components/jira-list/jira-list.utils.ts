import type { JiraIssue } from './jira-list.types';
import type { AppearanceType } from '@atlaskit/lozenge';

/** Maps a Jira status category key to an Atlaskit Lozenge appearance. */
export function categoryToLozengeAppearance(categoryKey: string): AppearanceType {
  switch (categoryKey) {
    case 'done':
      return 'success';
    case 'indeterminate':
      return 'inprogress';
    case 'new':
    default:
      return 'default';
  }
}

/**
 * Flattens a hierarchical issue tree into a flat ordered list.
 * Parent issues come first; subtasks immediately follow with depth=1.
 */
export function buildFlattenedIssues(issues: JiraIssue[]): JiraIssue[] {
  const result: JiraIssue[] = [];
  for (const issue of issues) {
    result.push({ ...issue, depth: issue.depth ?? 0 });
    if (issue.subtasks?.length) {
      for (const sub of issue.subtasks) {
        result.push({ ...sub, depth: 1 });
      }
    }
  }
  return result;
}

/**
 * Maps a DynamicTable sort key + order to a Jira JQL ORDER BY clause.
 * Base project filter should be provided by the caller.
 */
export function mapTableSortToJqlSort(key: string, order: 'ASC' | 'DESC'): string {
  const jqlKeyMap: Record<string, string> = {
    key: 'key',
    summary: 'summary',
    status: 'status',
    created: 'created',
    updated: 'updated',
    priority: 'priority',
    parent: 'parent',
  };
  const jqlField = jqlKeyMap[key] ?? key;
  return `project = BAU ORDER BY ${jqlField} ${order}`;
}

/** Constructs the Jira issue URL for a given key. */
export function getIssueUrl(key: string, baseUrl = 'https://digital-transformation.atlassian.net'): string {
  return `${baseUrl}/browse/${key}`;
}

/** Returns the DEPTH-based left-padding in pixels for a table row cell. */
export function depthPadding(depth: number): number {
  return depth * 24;
}

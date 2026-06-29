import { basicToJql } from '@/lib/filters/basicToJql';
import type { JiraFilterValue } from '@/components/shared/JiraFilterAtlaskit';

/**
 * Converts a JiraFilterValue to a full JQL string suitable for persisting.
 * Wraps basicToJql and adds a project-scoping prefix and ORDER BY suffix
 * when a projectKey is supplied.
 */
export function filterValueToJql(value: JiraFilterValue, projectKey?: string): string {
  const body = basicToJql(value);

  const withProject =
    projectKey
      ? body
        ? `project = "${projectKey}" AND ${body}`
        : `project = "${projectKey}"`
      : body;

  return withProject ? `${withProject} ORDER BY updated DESC` : '';
}

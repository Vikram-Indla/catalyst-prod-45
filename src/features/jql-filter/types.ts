import type { ValuePool } from '@/lib/jql';

/**
 * Hub-agnostic config passed to FilterBuilder and related utilities.
 * ProjectHub supplies projectKey; ProductHub omits it and passes its own valuePool.
 */
export interface FilterBuilderConfig {
  /** When set, `project = "X"` is prepended to compiled JQL. */
  projectKey?: string;
  /**
   * Available autocomplete values for the raw JQL editor — assignee names,
   * status labels, issue types, etc. scoped to the hub's data set.
   */
  valuePool?: ValuePool;
}

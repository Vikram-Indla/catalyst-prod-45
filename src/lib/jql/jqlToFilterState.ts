/**
 * jqlToFilterState — converts a JQL string into the AllWork FilterState shape
 * used by itemPassesFilters() in AllWorkToolbar.
 *
 * Supports the facets surfaced by itemPassesFilters:
 *   status, assignee (display name), priority, workType (issue_type),
 *   labels, sprintReleases, sprint, resolution, reporter
 *
 * Complex predicates (date ranges, IS EMPTY, NOT IN, parent) are silently
 * ignored — they fall outside the facet model.
 */
import { translate } from './index';
import { EMPTY_FILTERS } from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import type { FilterState } from '@/pages/project-hub/jira-list/components/AllWorkToolbar';

/**
 * Maps Supabase column names (from JQL_FIELD_MAP) → FilterState facet keys.
 * Only 'eq' and 'in' operators produce useful facet selections.
 */
const COLUMN_TO_FACET: Partial<Record<string, keyof FilterState>> = {
  status:                  'status',
  assignee_display_name:   'assignee',
  // translate() emits the accountIdColumn when the value looks like a Jira
  // account id (e.g. assignee = "712020:..."); map it to the same facet so
  // account-id assignees aren't dropped on load. itemPassesFilters matches
  // both id and name (AllWorkToolbar, Phase C / G2 Path B).
  assignee_account_id:     'assignee',
  reporter_display_name:   'reporter',
  reporter_account_id:     'reporter',
  priority:                'priority',
  issue_type:              'workType',
  labels:                  'labels',
  sprint_release:          'sprintReleases',
  sprint_name:             'sprint',
  resolution:              'resolution',
};

/**
 * Convert a JQL string into a FilterState object suitable for use with
 * itemPassesFilters(). Fields not in COLUMN_TO_FACET are silently dropped.
 */
export function jqlToFilterState(jql: string): FilterState {
  if (!jql?.trim()) return { ...EMPTY_FILTERS };

  const state: FilterState = { ...EMPTY_FILTERS };
  const filters = translate(jql);

  for (const f of filters) {
    const facet = COLUMN_TO_FACET[f.column];
    if (!facet) continue;

    if ((f.method === 'eq' || f.method === 'in') && f.value !== null) {
      const values = Array.isArray(f.value) ? f.value : [f.value];
      state[facet] = values.filter((v): v is string => typeof v === 'string');
    }
  }

  return state;
}

/**
 * True when a parsed FilterState carries at least one active facet selection.
 *
 * jqlToFilterState always returns a full FilterState (every key present, empty
 * arrays by default), so `Object.keys(parsed).length > 0` is always true and
 * cannot tell "parsed something" from "parsed nothing". Callers that gate on
 * whether the JQL produced any facet (e.g. the Basic/JQL mode toggle) use this.
 */
export function hasActiveFacets(state: Partial<FilterState>): boolean {
  return Object.values(state).some(v =>
    Array.isArray(v) ? v.length > 0 : Boolean(v),
  );
}

/**
 * Pure utilities for the Projects sync count calculation.
 * Extracted so they can be unit-tested without mocking Supabase.
 */

export const SYNC_COUNT_DATE_BOUNDARY = '2026-01-01';

type IssueRow = {
  project_key: string | null;
  jira_updated_at: string | null;
};

/**
 * Counts ph_issues per project_key where jira_updated_at >= SYNC_COUNT_DATE_BOUNDARY.
 * Operates on the raw rows returned by the Supabase select — no DB coupling.
 */
export function buildSyncCountFilter(issues: IssueRow[]): Record<string, number> {
  const boundary = new Date(SYNC_COUNT_DATE_BOUNDARY).getTime();
  const map: Record<string, number> = {};
  for (const row of issues) {
    if (!row.project_key || !row.jira_updated_at) continue;
    if (new Date(row.jira_updated_at).getTime() < boundary) continue;
    map[row.project_key] = (map[row.project_key] ?? 0) + 1;
  }
  return map;
}

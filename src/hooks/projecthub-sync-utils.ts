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
 * @deprecated Use buildProjectSyncStats which supersedes this.
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

// ─── Per-project sync stats ──────────────────────────────────────────────────

export interface ProjectSyncStats {
  /** 2026+ issue count for this project */
  count: number;
  /** ISO timestamp of the most recently updated issue in this project */
  latestAt: string | null;
  /** Issues where jira_updated_at is within the last 24 hours */
  updatedToday: number;
  /** Issues where jira_created_at is within the last 24 hours */
  createdToday: number;
}

type IssueRowFull = {
  project_key: string | null;
  jira_updated_at: string | null;
  jira_created_at: string | null;
};

/**
 * Builds per-project sync stats from a flat list of ph_issues rows.
 * Returns count, latest timestamp, and last-24h activity counts.
 * Operates on raw DB rows — no Supabase coupling.
 */
export function buildProjectSyncStats(issues: IssueRowFull[]): Record<string, ProjectSyncStats> {
  const boundary = new Date(SYNC_COUNT_DATE_BOUNDARY).getTime();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const map: Record<string, ProjectSyncStats> = {};

  for (const row of issues) {
    if (!row.project_key || !row.jira_updated_at) continue;
    const updatedMs = new Date(row.jira_updated_at).getTime();
    if (updatedMs < boundary) continue;

    const s = map[row.project_key] ?? { count: 0, latestAt: null, updatedToday: 0, createdToday: 0 };
    s.count++;
    if (!s.latestAt || row.jira_updated_at > s.latestAt) s.latestAt = row.jira_updated_at;
    if (updatedMs >= dayAgo) s.updatedToday++;
    if (row.jira_created_at && new Date(row.jira_created_at).getTime() >= dayAgo) s.createdToday++;
    map[row.project_key] = s;
  }

  return map;
}

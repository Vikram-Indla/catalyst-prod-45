/**
 * Backlog saved-filters scoping — Vikram-approved 2026-06-12.
 *
 * The backlog "Saved filters" dropdown must NOT dump every org-visible filter
 * (the old behaviour showed all 129 visible filters flat, including unrelated
 * cross-project ones like MIM "All defects"). It shows only filters that are
 * actually usable on THIS project's backlog:
 *   • the user's own filters (creator or owner)
 *   • filters the user has starred
 *   • filters scoped to this project via project_key
 *   • filters whose JQL references this project key (e.g. project = "BAU", BAU-123)
 *
 * Pure + side-effect free so it is unit-testable without Supabase.
 */
export interface BacklogFilterScopeInput {
  jql_query: string | null;
  project_key?: string | null;
  user_id?: string | null;
  owner_id: string | null;
  starred_by_user_ids: string[];
}

export function isFilterRelevantToBacklog(
  f: BacklogFilterScopeInput,
  projectKey: string,
  userId: string | null,
): boolean {
  if (userId) {
    if (f.user_id === userId || f.owner_id === userId) return true;
    if (Array.isArray(f.starred_by_user_ids) && f.starred_by_user_ids.includes(userId)) {
      return true;
    }
  }

  const key = projectKey?.trim();
  if (!key) return false;

  if (f.project_key && f.project_key.toUpperCase() === key.toUpperCase()) return true;

  if (f.jql_query) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Whole-word, case-insensitive: matches `project = "BAU"`, `BAU-123`,
    // `project in (BAU, MIM)` — but not a substring like "BAUXTER".
    if (new RegExp(`\\b${esc}\\b`, 'i').test(f.jql_query)) return true;
  }

  return false;
}

/**
 * applyCatyFilterBacklog — same matching semantics as applyCatyFilter
 * but operates on BacklogItem (the shape used by BacklogPage) instead
 * of WorkItem (used by AllWork). BacklogItem has a flatter structure:
 *   - assignee_name: string | null    (vs. WorkItem's assignee?.name)
 *   - reporter_name: string | null
 *   - status:        string | null
 *   - type:          'epic' | 'feature' | 'story' | ...
 *   - parent_key:    string | null
 *   - comment_count: number | null
 *
 * Implemented as an adapter rather than refactoring the original
 * applyCatyFilter to accept accessors — keeps the AllWork code path
 * untouched and zero-risk.
 *
 * Time-window, label, sprint, fix-version and id-based filters are
 * NOT applied (BacklogItem doesn't carry those fields). They're left
 * here as no-ops so future schema additions only need the type
 * extended, not the matcher rewritten.
 */
import type { CatyFilter } from "./catySearchStore";

// Minimal shape the matcher cares about. Anything BacklogItem-shaped
// (or larger) satisfies this — pass items in directly.
export interface BacklogLikeItem {
  type?: string | null;
  status?: string | null;
  priority?: string | null;
  assignee_name?: string | null;
  reporter_name?: string | null;
  parent_key?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  comment_count?: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function applyCatyFilterBacklog<T extends BacklogLikeItem>(
  items: T[],
  filter: CatyFilter | null,
): T[] {
  if (!filter || Object.keys(filter).length === 0) return items;

  const now = Date.now();

  const queryAssigneeNames = normalizeNameList(filter.assignee_names);
  const queryReporterNames = normalizeNameList(filter.reporter_names);
  const matchStatusName = lower(filter.status_names);
  const matchPriority = new Set(
    (filter.priorities ?? []).map((p) => p.toLowerCase()),
  );
  const matchType = new Set((filter.types ?? []).map((t) => t.toLowerCase()));
  const matchParentKey = new Set(
    (filter.parent_keys ?? [])
      .map((k) => k.trim().toUpperCase())
      .filter((k) => k.length > 0),
  );
  const createdWithinMs = filter.created_within_days
    ? filter.created_within_days * DAY_MS
    : null;
  const updatedWithinMs = filter.updated_within_days
    ? filter.updated_within_days * DAY_MS
    : null;
  const staleForMs = filter.stale_for_days
    ? filter.stale_for_days * DAY_MS
    : null;

  return items.filter((item) => {
    // Assignee — fuzzy name match. is_unassigned only honored when no
    // name filter is set (same logic as applyCatyFilter).
    if (filter.is_unassigned && queryAssigneeNames.length === 0) {
      if (item.assignee_name) return false;
    }
    if (queryAssigneeNames.length > 0) {
      const name = item.assignee_name?.toLowerCase() ?? null;
      if (!name || !nameMatches(name, queryAssigneeNames)) return false;
    }

    // Reporter
    if (queryReporterNames.length > 0) {
      const name = item.reporter_name?.toLowerCase() ?? null;
      if (!name || !nameMatches(name, queryReporterNames)) return false;
    }

    // Status (name match only — BacklogItem doesn't carry the category).
    if (matchStatusName && matchStatusName.size > 0) {
      const sName = item.status?.toLowerCase() ?? null;
      if (!sName || !matchStatusName.has(sName)) return false;
    }

    if (matchPriority.size > 0) {
      const p = item.priority?.toLowerCase() ?? "";
      if (!p || !matchPriority.has(p)) return false;
    }

    if (matchType.size > 0) {
      const t = item.type?.toLowerCase() ?? "";
      if (!t || !matchType.has(t)) return false;
    }

    // Time windows
    if (createdWithinMs !== null) {
      const created = item.created_at ? Date.parse(item.created_at) : NaN;
      if (Number.isNaN(created) || now - created > createdWithinMs) return false;
    }
    if (updatedWithinMs !== null) {
      const updated = item.updated_at ? Date.parse(item.updated_at) : NaN;
      if (Number.isNaN(updated) || now - updated > updatedWithinMs) return false;
    }
    if (staleForMs !== null) {
      const updated = item.updated_at ? Date.parse(item.updated_at) : NaN;
      if (!Number.isNaN(updated) && now - updated < staleForMs) return false;
    }

    // Parent
    if (matchParentKey.size > 0) {
      const pk = item.parent_key?.toUpperCase() ?? null;
      if (!pk || !matchParentKey.has(pk)) return false;
    }

    // Engagement
    if (filter.min_comments !== undefined) {
      if ((item.comment_count ?? 0) < filter.min_comments) return false;
    }

    return true;
  });
}

// ── Helpers (mirror applyCatyFilter — kept local so this file has zero
// imports from the AllWork module) ──

function normalizeNameList(arr?: string[]): string[] {
  return (arr ?? [])
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length > 0);
}

function lower(arr?: string[]): Set<string> | null {
  if (!arr || arr.length === 0) return null;
  return new Set(arr.map((s) => s.toLowerCase()));
}

function nameMatches(itemName: string, queryNames: string[]): boolean {
  const itemTokens = itemName.split(/\s+/).filter(Boolean);
  for (const q of queryNames) {
    if (matchesOne(itemName, itemTokens, q)) return true;
  }
  return false;
}

function matchesOne(
  itemName: string,
  itemTokens: string[],
  query: string,
): boolean {
  if (itemName.includes(query)) return true;
  const qTokens = query.split(/\s+/).filter(Boolean);
  if (qTokens.length === 0) return false;
  return qTokens.every((qt) =>
    itemTokens.some((it) => tokenMatches(it, qt)),
  );
}

function tokenMatches(itemTok: string, queryTok: string): boolean {
  if (itemTok === queryTok) return true;
  if (itemTok.includes(queryTok)) return true;
  if (queryTok.includes(itemTok)) return true;
  const budget = typoBudget(queryTok);
  if (budget === 0) return false;
  return levenshtein(itemTok, queryTok) <= budget;
}

function typoBudget(s: string): number {
  if (s.length <= 3) return 0;
  if (s.length <= 6) return 1;
  return 2;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length < b.length) [a, b] = [b, a];
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

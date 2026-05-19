/**
 * applyCatyFilter — pure function that takes the already-loaded
 * project items array and an AI-parsed CatyFilter spec, and returns
 * the items matching every active criterion (AND across dimensions,
 * OR within a dimension's array values — same semantics as the
 * toolbar facet filters).
 *
 * All matching happens client-side: the AI's only job is to translate
 * the user's natural language into this structured spec, never to do
 * semantic search across the project's tickets.
 */
import type { WorkItem } from '@/types/workItem.types';
import type { CatyFilter } from './catySearchStore';

const DAY_MS = 24 * 60 * 60 * 1000;

export function applyCatyFilter(
  items: WorkItem[],
  filter: CatyFilter | null,
): WorkItem[] {
  if (!filter || Object.keys(filter).length === 0) return items;

  const now = Date.now();

  // Fuzzy-name dimensions keep the raw lowercased strings (rather than
  // a Set) because each query name needs to be walked token-by-token
  // against each candidate.
  const queryAssigneeNames = normalizeNameList(filter.assignee_names);
  const queryReporterNames = normalizeNameList(filter.reporter_names);

  const matchAssigneeId = new Set(filter.assignee_ids ?? []);
  const matchReporterId = new Set(filter.reporter_ids ?? []);
  const matchStatusName = lower(filter.status_names);
  const matchStatusCat = new Set(filter.status_categories ?? []);
  const matchPriority = new Set((filter.priorities ?? []).map((p) => p.toLowerCase()));
  const matchType = new Set((filter.types ?? []).map((t) => t.toLowerCase()));
  const matchLabel = lower(filter.labels);
  const matchSprint = lower(filter.sprint_names);
  const matchFixVersion = lower(filter.fix_versions);
  // Jira issue keys are case-insensitive-ish — normalize to upper.
  const matchParentKey = new Set(
    (filter.parent_keys ?? []).map((k) => k.trim().toUpperCase()).filter((k) => k.length > 0),
  );
  const textContains = filter.text_contains?.trim().toLowerCase() || null;
  const createdWithinMs = filter.created_within_days
    ? filter.created_within_days * DAY_MS
    : null;
  const updatedWithinMs = filter.updated_within_days
    ? filter.updated_within_days * DAY_MS
    : null;
  const staleForMs = filter.stale_for_days ? filter.stale_for_days * DAY_MS : null;

  return items.filter((item) => {
    // ── People ───────────────────────────────────────────────────────
    // Assignee — either a matching name OR a matching id satisfies
    // the dimension. is_unassigned is a separate exclusive predicate
    // (an "unassigned" filter would conflict with a name/id filter,
    // so we honour is_unassigned only when no name/id is set).
    if (
      filter.is_unassigned &&
      queryAssigneeNames.length === 0 &&
      matchAssigneeId.size === 0
    ) {
      if (item.assignee || item.assigneeId) return false;
    }
    if (queryAssigneeNames.length > 0) {
      const name = item.assignee?.name?.toLowerCase() ?? null;
      if (!name || !nameMatches(name, queryAssigneeNames)) return false;
    }
    if (matchAssigneeId.size > 0) {
      const id = item.assigneeId ?? item.assignee?.id ?? null;
      if (!id || !matchAssigneeId.has(id)) return false;
    }

    // Reporter — same fuzzy / id semantics as assignee.
    if (queryReporterNames.length > 0) {
      const name = item.reporter?.name?.toLowerCase() ?? null;
      if (!name || !nameMatches(name, queryReporterNames)) return false;
    }
    if (matchReporterId.size > 0) {
      const id = item.reporterId ?? item.reporter?.id ?? null;
      if (!id || !matchReporterId.has(id)) return false;
    }

    // ── Lifecycle ────────────────────────────────────────────────────
    if (matchStatusName && matchStatusName.size > 0) {
      const sName = item.statusName?.toLowerCase() ?? null;
      if (!sName || !matchStatusName.has(sName)) return false;
    }
    if (matchStatusCat.size > 0) {
      if (!matchStatusCat.has(item.statusCategory)) return false;
    }

    if (matchPriority.size > 0) {
      if (!matchPriority.has(item.priority)) return false;
    }

    if (matchType.size > 0) {
      // Match either the normalised `type` or the raw Jira name
      // (so "Production Incident", "QA Bug" etc. count when the AI
      // returns "bug" / "task").
      const t = item.type?.toLowerCase() ?? '';
      const rt = item.rawType?.toLowerCase() ?? '';
      const synonyms = new Set([t, rt]);
      if (rt.includes('bug') || rt.includes('defect')) synonyms.add('bug');
      if (rt.includes('incident')) synonyms.add('bug');
      if (rt.includes('sub-task') || rt === 'subtask') synonyms.add('subtask');
      if (rt.includes('feature')) synonyms.add('feature');
      let hit = false;
      for (const want of matchType) {
        if (synonyms.has(want)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }

    if (filter.is_flagged !== undefined) {
      if (Boolean(item.is_flagged) !== filter.is_flagged) return false;
    }

    if (filter.resolution_set !== undefined) {
      const hasResolution =
        typeof item.resolution === 'string' && item.resolution.trim().length > 0;
      if (hasResolution !== filter.resolution_set) return false;
    }

    // ── Time windows ─────────────────────────────────────────────────
    if (createdWithinMs !== null) {
      const created = item.createdAt ? Date.parse(item.createdAt) : NaN;
      if (Number.isNaN(created) || now - created > createdWithinMs) return false;
    }
    if (updatedWithinMs !== null) {
      const updated = item.updatedAt ? Date.parse(item.updatedAt) : NaN;
      if (Number.isNaN(updated) || now - updated > updatedWithinMs) return false;
    }
    if (staleForMs !== null) {
      // "stale for N days" = NOT updated in the last N days. Items
      // without an updatedAt are treated as stale (worst-case truthful).
      const updated = item.updatedAt ? Date.parse(item.updatedAt) : NaN;
      if (!Number.isNaN(updated) && now - updated < staleForMs) return false;
    }

    // ── Hierarchy & grouping ─────────────────────────────────────────
    if (matchParentKey.size > 0) {
      const pk = item.parentKey?.toUpperCase() ?? null;
      if (!pk || !matchParentKey.has(pk)) return false;
    }
    if (matchSprint && matchSprint.size > 0) {
      const s = item.sprintName?.toLowerCase() ?? null;
      if (!s || !matchSprint.has(s)) return false;
    }
    if (matchFixVersion && matchFixVersion.size > 0) {
      const fv = item.fixVersion?.toLowerCase() ?? null;
      if (!fv || !matchFixVersion.has(fv)) return false;
    }
    if (matchLabel && matchLabel.size > 0) {
      const ls = (item.labels ?? []).map((l) => l.toLowerCase());
      if (!ls.some((l) => matchLabel.has(l))) return false;
    }

    // ── Engagement / weight ──────────────────────────────────────────
    if (filter.min_comments !== undefined) {
      if ((item.commentsCount ?? 0) < filter.min_comments) return false;
    }
    if (filter.story_points_min !== undefined) {
      if (item.storyPoints == null || item.storyPoints < filter.story_points_min) return false;
    }
    if (filter.story_points_max !== undefined) {
      if (item.storyPoints == null || item.storyPoints > filter.story_points_max) return false;
    }

    // ── Free text — checked against summary AND description ─────────
    if (textContains) {
      const sum = item.summary?.toLowerCase() ?? '';
      const desc = item.description?.toLowerCase() ?? '';
      if (!sum.includes(textContains) && !desc.includes(textContains)) return false;
    }

    return true;
  });
}

function normalizeNameList(arr?: string[]): string[] {
  return (arr ?? [])
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length > 0);
}

function lower(arr?: string[]): Set<string> | null {
  if (!arr || arr.length === 0) return null;
  return new Set(arr.map((s) => s.toLowerCase()));
}

/**
 * Fuzzy assignee name matcher. Both inputs are already lowercased.
 *
 * Goals:
 *  - "hassan" should match "Hassan Ali", "Hassan Raza Hasrat", etc.
 *    (one-token query → broad substring sweep)
 *  - "hassan raza" → narrows to people whose name contains both tokens
 *  - "hassan raza hasrat" → essentially exact
 *  - "hasan" (typo) should still match "Hassan ..." via Levenshtein
 *
 * We try cheap checks first (substring on the whole name, then on
 * each token), and only fall back to Levenshtein when the cheap paths
 * fail. Distance budget scales with token length so 3-letter names
 * don't accept wild matches.
 */
function nameMatches(itemName: string, queryNames: string[]): boolean {
  const itemTokens = itemName.split(/\s+/).filter(Boolean);
  for (const q of queryNames) {
    if (matchesOne(itemName, itemTokens, q)) return true;
  }
  return false;
}

function matchesOne(itemName: string, itemTokens: string[], query: string): boolean {
  // Whole-string substring (handles "hassan" → "hassan raza hasrat")
  if (itemName.includes(query)) return true;

  // Token-by-token: every query token must match some assignee token
  // (substring either way + Levenshtein for typos).
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
  if (s.length <= 3) return 0;   // too short — typos here would over-match
  if (s.length <= 6) return 1;   // "hasan" → "hassan" (distance 1)
  return 2;                      // longer names get a little more slack
}

/** Iterative two-row Levenshtein. O(m·n) time, O(min(m,n)) space. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Always iterate over the shorter string in the inner loop.
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
        curr[j - 1] + 1,        // insertion
        (prev[j] ?? 0) + 1,     // deletion
        (prev[j - 1] ?? 0) + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? 0;
}

/**
 * caty-suggestions — derive Caty's "you might want to look at this" nudges from
 * the user's own active work items. Pure + deterministic so it unit-tests and
 * renders a stable daily list (no churn between renders).
 *
 * Rule: only TODO / IN-PROGRESS items (never Done) that have gone stale.
 */
export interface SuggestionInput {
  issue_key: string;
  issue_type: string | null;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  jira_updated_at: string | null;
}

export interface CatySuggestion {
  key: string;
  text: string;
  issueKey: string;
  issueType: string | null;
}

const STALE_DAYS = 3;
const DAY_MS = 86_400_000;

/** True for active (todo / in-progress) categories, tolerant of casing/spacing. */
function isActiveCategory(raw: string | null): boolean {
  const c = (raw ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!c || c === 'done') return false;
  return c.includes('todo') || c.includes('to_do') || c.includes('progress');
}

/**
 * Build up to `max` dismissable suggestions for stale active items.
 * Deterministic: sorted by issue_key so the same day shows the same list.
 */
export function buildCatySuggestions(
  items: SuggestionInput[],
  nowMs: number,
  dismissed: Set<string>,
  max = 5,
): CatySuggestion[] {
  const out: CatySuggestion[] = [];
  for (const it of items) {
    if (!it.issue_key || !isActiveCategory(it.status_category)) continue;
    if (!it.jira_updated_at) continue;
    const days = Math.floor((nowMs - Date.parse(it.jira_updated_at)) / DAY_MS);
    if (Number.isNaN(days) || days < STALE_DAYS) continue;
    const key = `stale:${it.issue_key}`;
    if (dismissed.has(key)) continue;
    const status = it.status ?? 'this status';
    out.push({
      key,
      text: `${it.issue_key} has sat in ${status} for ${days} days`,
      issueKey: it.issue_key,
      issueType: it.issue_type,
    });
  }
  out.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  return out.slice(0, max);
}

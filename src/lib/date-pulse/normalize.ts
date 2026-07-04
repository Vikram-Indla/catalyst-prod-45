/**
 * Date Pulse — Source Normalization
 *
 * ph_issues stores Title-Case DISPLAY values (issue_type = 'Epic'/'QA Bug'/…,
 * status = 'Done'/'Ready for QA'/'Blocked'/…) plus a separate lowercase
 * status_category column (todo | in_progress | done only — there is NO
 * 'blocked' category).
 *
 * The Date Pulse + Health Status engines compare against lowercase buckets
 * ('epic', 'defect', 'done', 'in_progress', 'todo', 'blocked'). Feeding raw
 * Title-Case values in silently breaks every comparison (epic-exclusion guards
 * never fire, done_count is always 0, blocked is undetectable). This module is
 * the single normalization boundary: mappers MUST run source rows through these
 * helpers before building WorkItem for the engines.
 */

/**
 * Canonical work-item type buckets. Superset of what the engines check
 * (they only look at 'epic'/'defect'), but complete so callers can bucket any
 * ph_issues.issue_type without a local map.
 */
export type IssueTypeBucket =
  | 'epic'
  | 'feature'
  | 'defect'
  | 'incident'
  | 'task'
  | 'story'
  | 'subtask'
  | 'business_request'
  | null;

/**
 * Normalize a raw ph_issues.issue_type DISPLAY value to a lowercase bucket.
 *
 * Mirrors the canonical mapping used in CatalystSidebarDetails (which now
 * imports from here). Zero-assumption: an unrecognized / missing type returns
 * null rather than defaulting to a bucket (CLAUDE.md).
 */
export function normalizeIssueTypeBucket(raw: string | undefined | null): IssueTypeBucket {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();
  if (t === 'epic') return 'epic';
  if (t === 'feature' || t === 'new feature') return 'feature';
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return 'defect';
  if (t.includes('incident') || t === 'production incident' || t === 'business gap') return 'incident';
  if (t === 'task') return 'task';
  if (t === 'business request' || t === 'business_request' || t === 'demand') return 'business_request';
  if (t === 'sub-task' || t === 'subtask' || t === 'backend' || t === 'frontend' || t === 'figma' || t === 'entity figma' || t === 'integration') return 'subtask';
  if (t === 'story' || t === 'improvement') return 'story';
  return null;
}

/**
 * Lowercase work-status buckets the engines compare against.
 * 'backlog' is intentionally absent — ph_issues has no such category; backlog
 * display statuses map to 'todo'.
 */
export type WorkStatusBucket = 'todo' | 'in_progress' | 'done' | 'blocked' | null;

/**
 * Normalize a ph_issues row's status to a lowercase engine bucket.
 *
 * Bucketing (todo/in_progress/done) comes from the authoritative
 * status_category column. "blocked" has no status_category equivalent, so it is
 * derived from the DISPLAY status string being literally 'Blocked' (product
 * decision 2026-07-03 — display 'Blocked' only; 'On Hold' is NOT treated as
 * blocked).
 *
 * Precedence: blocked (from display) overrides the category bucket, because a
 * blocked item still carries a todo/in_progress category underneath.
 *
 * Zero-assumption: when neither a recognizable display status nor a valid
 * status_category is present, returns null ("unscorable") rather than assuming
 * 'todo' — a fabricated 'todo' would skew health toward Uncommitted/At Risk
 * (CLAUDE.md).
 *
 * @param displayStatus ph_issues.status (Title-Case display string)
 * @param statusCategory ph_issues.status_category (todo | in_progress | done)
 */
export function normalizeWorkStatus(
  displayStatus: string | undefined | null,
  statusCategory: string | undefined | null,
): WorkStatusBucket {
  const disp = (displayStatus ?? '').toLowerCase().trim();
  if (disp === 'blocked') return 'blocked';

  const cat = (statusCategory ?? '').toLowerCase().trim();
  if (cat === 'done' || cat === 'in_progress' || cat === 'todo') return cat;

  return null;
}

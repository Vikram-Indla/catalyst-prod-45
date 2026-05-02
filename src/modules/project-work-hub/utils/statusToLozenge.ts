/**
 * statusToLozenge — Canonical mapping from Catalyst status strings to
 * @atlaskit/lozenge `appearance` prop values.
 *
 * GUARDRAIL (CLAUDE.md §20, L41):
 *   The Jira-clone surface MUST render status pills as Atlaskit Lozenges.
 *   No hand-rolled backgrounds, no cyan "In UAT", no rainbow palette. The
 *   only admissible colour palette is Atlaskit's 6 appearance tokens:
 *
 *     default    — grey   (To Do, Backlog, neutral)
 *     inprogress — blue   (any in-flight / review / QA / UAT / Beta)
 *     success    — green  (Done, Closed, Production Ready)
 *     removed    — red    (Blocked, Cancelled)
 *     moved      — yellow (On Hold, Awaiting Info, paused)
 *     new        — purple (reserved — do not map status here)
 *
 * All status strings are compared case-insensitively after trim. Unknown
 * statuses fall back to `default` so the pill renders grey rather than
 * inventing a colour.
 *
 * This helper is the single source of truth for status-pill colour on the
 * StoryDetailModal surface and on any future Atlaskit-parity render site
 * (child rows, linked-work-items, subtasks, IssueListPanel cards).
 */

export type LozengeAppearance =
  | 'default'
  | 'inprogress'
  | 'success'
  | 'removed'
  | 'moved'
  | 'new';

/**
 * Explicit status → appearance table.
 *
 * Pulled from `STATUS_CATEGORIES` in
 * `src/modules/project-work-hub/components/dialogs/story-detail-modules/constants.ts`
 * and extended with synonyms that appear in imported Jira data. Keys are
 * stored lowercased.
 *
 * NOTE: "Blocked" / "On Hold" / "Awaiting Info" deliberately override the
 * in_progress bucket so they render with semantic colour (red / yellow),
 * matching Atlassian's own Jira behaviour.
 */
const STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  // ── Specials (semantic, not bucket-driven) ──
  'blocked': 'removed',
  'cancelled': 'removed',
  'canceled': 'removed',
  'on hold': 'moved',
  'awaiting info': 'moved',
  'paused': 'moved',

  // ── Done bucket ──
  'done': 'success',
  'closed': 'success',
  'released': 'success',
  'completed': 'success',
  'approved': 'success',
  'in production': 'success',
  'production ready': 'success',
  'beta ready': 'success',
  'resolved': 'success',

  // ── In-flight bucket ──
  'in progress': 'inprogress',
  'in development': 'inprogress',
  'in review': 'inprogress',
  'in qa': 'inprogress',
  'in entity integration': 'inprogress',
  'in uat': 'inprogress',
  'in beta': 'inprogress',
  'end to end testing': 'inprogress',
  'analysis': 'inprogress',
  'in requirements': 'inprogress',
  'in design': 'inprogress',

  // ── To-Do bucket ──
  'backlog': 'default',
  'to do': 'default',
  'todo': 'default',
  'open': 'default',
  'new': 'default',
  'ready for development': 'default',
  'technical validation': 'default',
  'ready for qa': 'default',
  'ready for review': 'default',
};

/**
 * Map a raw Catalyst/Jira status string to an Atlaskit Lozenge appearance.
 *
 * Strategy:
 *   1. Empty / null → `default`.
 *   2. Exact (case-insensitive) match against the explicit table above.
 *   3. Heuristic fallback for Jira imports with non-standard labels —
 *      substring match against a small set of in-flight / done keywords.
 *   4. Final fallback → `default` (grey).
 */
export function statusToLozenge(
  status: string | null | undefined,
  /** jira-compare follow-up (2026-05-02): optional Jira workflow
   *  statusCategory key. When supplied, takes precedence over the
   *  name-based mapping below. Jira NIN drives lozenge colour off
   *  the workflow statusCategory — e.g. BAU's "In QA" lives in the
   *  `done` category, so Jira renders it green even though the name
   *  reads as in-flight. Without this override, name lookup buckets
   *  "In QA" as `inprogress` (blue) and ships the wrong colour. */
  statusCategory?: string | null,
): LozengeAppearance {
  // 0. Workflow-category override (Jira NIN parity).
  if (statusCategory) {
    const c = statusCategory.toLowerCase();
    if (c === 'done') return 'success';
    if (c === 'in_progress' || c === 'indeterminate') return 'inprogress';
    if (c === 'removed') return 'removed';
    // c === 'new' / 'todo' / 'undefined' → fall through so the name
    // table can still surface semantic specials (Blocked / On Hold).
  }

  if (!status) return 'default';
  const s = status.trim().toLowerCase();
  if (!s) return 'default';

  // 2. Exact table match.
  const exact = STATUS_APPEARANCE[s];
  if (exact) return exact;

  // 3. Heuristic fallback for unseen imports. Ordered by specificity —
  //    "blocked" beats "in progress", "done" beats "review", etc.
  if (s.includes('block')) return 'removed';
  if (s.includes('hold') || s.includes('wait')) return 'moved';
  if (
    s.includes('done') ||
    s.includes('closed') ||
    s.includes('release') ||
    s.includes('resolved') ||
    s.includes('production')
  ) {
    return 'success';
  }
  if (
    s.includes('progress') ||
    s.includes('review') ||
    s.includes('qa ') ||
    s === 'qa' ||
    s.includes(' qa') ||
    s.includes('uat') ||
    s.includes('beta') ||
    s.includes('testing') ||
    s.includes('integration') ||
    s.includes('development') && !s.includes('ready for')
  ) {
    return 'inprogress';
  }

  // 4. Fallback.
  return 'default';
}

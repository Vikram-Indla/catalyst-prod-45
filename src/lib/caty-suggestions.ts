/**
 * caty-suggestions — derive Caty's "you might want to look at this" nudges.
 *
 * Algorithm: signal-based scoring across 10 trending/activity rules.
 * NEVER surfaces stale tickets (sat-in-status for N days is NOT a signal here —
 * stale view belongs in a separate tab).
 *
 * Data flow:
 *  - Caller passes SuggestionInput[] (assigned OR reported by user) + nowMs
 *  - Each item is scored across 10 rules → top 5 selected with type diversity
 */

export interface SuggestionInput {
  issue_key: string;
  issue_type: string | null;
  summary: string | null;
  status: string | null;
  status_category: string | null;
  priority: string | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  effective_due_date: string | null;
  /** ISO timestamp of last ph_comment on this issue, or null */
  last_comment_at: string | null;
  /** Whether the user is assignee (true) or reporter (false) */
  is_assignee: boolean;
}

export interface CatySuggestion {
  key: string;
  /** Human-readable nudge label e.g. "BAU-42 — Fix login crash" */
  text: string;
  issueKey: string;
  issueType: string | null;
  /** Raw status string, used for the inline status pill */
  status: string | null;
  /** status_category for pill colour: 'indeterminate'|'new'|'done' (Jira values) */
  status_category: string | null;
  /** Short signal label e.g. "Due today", "Active discussion" */
  signal: string;
}

const DAY_MS = 86_400_000;

// ─── helpers ────────────────────────────────────────────────────────────────

function normCategory(raw: string | null): string {
  return (raw ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

function isDone(cat: string | null): boolean {
  return normCategory(cat) === 'done';
}

function isActive(cat: string | null): boolean {
  const c = normCategory(cat);
  return c.includes('todo') || c.includes('todo') || c.includes('progress') || c.includes('new') || c.includes('indeterminate');
}

function normPriority(raw: string | null): string {
  return (raw ?? '').toLowerCase();
}

function isHighPriority(p: string | null): boolean {
  const n = normPriority(p);
  return n === 'highest' || n === 'critical' || n === 'blocker' || n === 'p0' || n === 'p1' || n === 'urgent';
}

function daysAgo(isoOrNull: string | null, nowMs: number): number {
  if (!isoOrNull) return Infinity;
  const parsed = Date.parse(isoOrNull);
  if (Number.isNaN(parsed)) return Infinity;
  return (nowMs - parsed) / DAY_MS;
}

function daysUntil(isoOrNull: string | null, nowMs: number): number {
  if (!isoOrNull) return Infinity;
  const parsed = Date.parse(isoOrNull);
  if (Number.isNaN(parsed)) return Infinity;
  return (parsed - nowMs) / DAY_MS;
}

// ─── 10-rule scorer ──────────────────────────────────────────────────────────

interface Scored {
  input: SuggestionInput;
  score: number;
  signal: string;
}

function scoreItem(item: SuggestionInput, nowMs: number): Scored | null {
  if (!item.issue_key) return null;
  if (isDone(item.status_category)) return null;

  let score = 0;
  let topSignal = '';

  const updatedAgo = daysAgo(item.jira_updated_at, nowMs);
  const createdAgo = daysAgo(item.jira_created_at, nowMs);
  const commentAgo = daysAgo(item.last_comment_at, nowMs);
  const dueIn = daysUntil(item.effective_due_date, nowMs);

  // Rule 1 — Overdue (+40, highest weight)
  if (dueIn < 0) {
    score += 40;
    topSignal = 'Overdue';
  }
  // Rule 2 — Due today or tomorrow (+30)
  else if (dueIn >= 0 && dueIn <= 1) {
    score += 30;
    topSignal = dueIn < 0.5 ? 'Due today' : 'Due tomorrow';
  }
  // Rule 3 — Due within 3 days (+20)
  else if (dueIn > 1 && dueIn <= 3) {
    score += 20;
    if (!topSignal) topSignal = 'Due soon';
  }
  // Rule 4 — Due within a week (+12)
  else if (dueIn > 3 && dueIn <= 7) {
    score += 12;
    if (!topSignal) topSignal = 'Due this week';
  }

  // Rule 5 — Freshly assigned to user, not yet started (+35)
  if (item.is_assignee && updatedAgo <= 2 && normCategory(item.status_category).includes('todo')) {
    score += 35;
    if (!topSignal) topSignal = 'Just assigned';
  }

  // Rule 6 — Reporter just created, unstarted (+25)
  if (!item.is_assignee && createdAgo <= 2) {
    score += 25;
    if (!topSignal) topSignal = 'Just created';
  }

  // Rule 7 — Recent comment activity (+30) — someone is discussing this now
  if (commentAgo <= 2) {
    score += 30;
    if (!topSignal) topSignal = 'Active discussion';
  } else if (commentAgo <= 1) {
    score += 35;
    if (!topSignal) topSignal = 'New comment';
  }

  // Rule 8 — High priority + still active (+20)
  if (isHighPriority(item.priority)) {
    score += 20;
    if (!topSignal) topSignal = 'High priority';
  }

  // Rule 9 — Production incident type, still open (+25)
  if ((item.issue_type ?? '').toLowerCase().includes('production') || (item.issue_type ?? '').toLowerCase().includes('incident')) {
    score += 25;
    if (!topSignal) topSignal = 'Active incident';
  }

  // Rule 10 — Status changed recently, now in-progress (+15)
  if (updatedAgo <= 1 && normCategory(item.status_category).includes('progress')) {
    score += 15;
    if (!topSignal) topSignal = 'Just started';
  }

  // Minimum signal threshold: must have at least 10 points of signal
  if (score < 10) return null;

  return { input: item, score, signal: topSignal || 'Needs attention' };
}

// ─── type-diverse selection ──────────────────────────────────────────────────

function normType(t: string | null): string {
  return (t ?? 'unknown').toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Build up to `max` suggestions.
 * Algorithm:
 * 1. Score all items → filter min threshold
 * 2. Sort descending by score
 * 3. Pick greedily: prefer at most 1 of each issue_type, fill with best remaining
 */
export function buildCatySuggestions(
  items: SuggestionInput[],
  nowMs: number,
  dismissed: Set<string>,
  max = 5,
): CatySuggestion[] {
  const scored: Scored[] = [];
  for (const it of items) {
    const s = scoreItem(it, nowMs);
    if (!s) continue;
    const key = `trending:${it.issue_key}`;
    if (!dismissed.has(key)) {
      scored.push(s);
    }
  }

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score);

  // Type-diverse selection
  const typeSeen = new Set<string>();
  const selected: Scored[] = [];
  const overflow: Scored[] = [];

  for (const s of scored) {
    const t = normType(s.input.issue_type);
    if (!typeSeen.has(t)) {
      typeSeen.add(t);
      selected.push(s);
    } else {
      overflow.push(s);
    }
    if (selected.length >= max) break;
  }

  // Fill remaining slots from overflow (still score-sorted)
  for (const s of overflow) {
    if (selected.length >= max) break;
    selected.push(s);
  }

  return selected.map((s) => {
    const { input, signal } = s;
    const summary = input.summary ? input.summary.slice(0, 60) : input.issue_key;
    return {
      key: `trending:${input.issue_key}`,
      text: `${input.issue_key} — ${summary}`,
      issueKey: input.issue_key,
      issueType: input.issue_type,
      status: input.status,
      status_category: input.status_category,
      signal,
    };
  });
}

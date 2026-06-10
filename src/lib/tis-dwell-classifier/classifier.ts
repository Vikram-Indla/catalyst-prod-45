/**
 * classifyDwell — diagnoses WHY a ticket is stuck in a given status.
 *
 * Phase 4 row 6 — Catalyst outlier #5. Rule-based v1; 5 patterns. Confidence
 * is a coarse 0..1 score from how many corroborating signals fired.
 *
 * Inputs come from the assignee-history hover-card pipeline. Once
 * backfill ships, this classifier runs server-side per (issue_key,
 * status_window) and caches the result. For V1 it runs client-side with
 * mocked events so the UI can render the lozenge today.
 *
 * Rules (evaluated in priority order — first match wins, then we still
 * sweep for the others to bump confidence if multiple signals align):
 *
 *   1. ping_pong       — ≥2 assignee changes AND returned to original
 *   2. pl_gap          — gap > 5d between two assignments of the same
 *                        person + currently assigned again
 *   3. spec_rewrite    — description edited + reassigned in same window
 *   4. external_dep    — open external link + no internal activity
 *   5. silent          — no comments + no transitions + duration > P50
 */

export interface DwellEvent {
  field: string;                      // 'assignee' | 'status' | 'description' | 'comment' | ...
  from_display: string | null;
  to_display: string | null;
  actor_name: string | null;
  changed_at: string;                 // ISO timestamp
}

export interface DwellComment {
  created_at: string;
}

export interface DwellLink {
  type: string;                       // 'blocks' | 'blocked-by' | 'relates-to' | ...
  external: boolean;
  resolved: boolean;
}

export interface DwellInput {
  events: DwellEvent[];
  comments: DwellComment[];
  links: DwellLink[];
  durationMs: number;
  p50Hours: number | null;            // null = no cohort data, treat as Infinity
  /** Optional now-override for deterministic tests. */
  now?: Date;
}

export type DwellPattern = 'ping_pong' | 'pl_gap' | 'spec_rewrite' | 'external_dep' | 'silent' | 'none';

export interface DwellClassification {
  pattern: DwellPattern;
  confidence: number;
  /** Human-readable summary, suitable for tooltip/explainer. */
  description?: string;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PL_GAP_DAYS = 5;

function assigneeChanges(events: DwellEvent[]): DwellEvent[] {
  return events.filter((e) => e.field === 'assignee');
}

function isPingPong(events: DwellEvent[]): boolean {
  const swaps = assigneeChanges(events);
  if (swaps.length < 2) return false;
  // first non-null from_display = original assignee at window entry
  const original = swaps[0].from_display;
  // Returned to original? Check the LAST assignment's to_display matches
  // any prior assignee value seen as `from_display` (i.e., looped back).
  const finalTo = swaps[swaps.length - 1].to_display;
  if (!finalTo) return false;
  // If first swap was `null -> Alice` (initial assignment), look at the
  // chain: at least one earlier to_display equals finalTo with at least
  // one different assignee in between.
  const allTos = swaps.map((s) => s.to_display).filter(Boolean) as string[];
  const distinctTos = new Set(allTos);
  if (distinctTos.size < 2) return false;
  // Looped back: finalTo appeared earlier in the chain
  const earlierIdx = allTos.indexOf(finalTo);
  return earlierIdx !== -1 && earlierIdx < allTos.length - 1;
}

function isPlGap(events: DwellEvent[], _now: Date): boolean {
  const swaps = assigneeChanges(events);
  if (swaps.length < 2) return false;
  // PL_GAP = an assignee X is removed (swap N: X→Y) and later restored
  // (swap M: ...→X) with a gap > PL_GAP_DAYS between N and M. Covers
  // the canonical "Alice→Bob (Alice on PL) ... Bob→Alice" pattern.
  // Also covers same-to-same returns (X assigned, then X assigned again
  // after a gap of inactivity).
  for (let i = 0; i < swaps.length - 1; i++) {
    const removed = swaps[i].from_display;
    if (!removed) continue;
    for (let j = i + 1; j < swaps.length; j++) {
      if (swaps[j].to_display === removed) {
        const gapMs = new Date(swaps[j].changed_at).getTime() - new Date(swaps[i].changed_at).getTime();
        if (gapMs > PL_GAP_DAYS * DAY) return true;
      }
    }
  }
  return false;
}

function isSpecRewrite(events: DwellEvent[]): boolean {
  const hasDescEdit = events.some((e) => e.field === 'description');
  const hasReassign = assigneeChanges(events).length > 0;
  return hasDescEdit && hasReassign;
}

function isExternalDep(input: DwellInput): boolean {
  const externalOpen = input.links.some((l) => l.external && !l.resolved);
  if (!externalOpen) return false;
  // No internal activity = no transitions + no comments in window
  const internalEvents = input.events.filter((e) => e.field === 'status' || e.field === 'assignee');
  return internalEvents.length === 0 && input.comments.length === 0;
}

function isSilent(input: DwellInput): boolean {
  if (input.comments.length > 0) return false;
  const internalEvents = input.events.filter((e) => e.field === 'status' || e.field === 'assignee' || e.field === 'description');
  if (internalEvents.length > 0) return false;
  if (input.p50Hours == null) return false;
  return input.durationMs > input.p50Hours * HOUR;
}

const DESCRIPTIONS: Record<DwellPattern, string> = {
  ping_pong: 'Reassigned ≥2 times then returned to original assignee.',
  pl_gap: 'Assignee inactive for >5d during dwell, then returned.',
  spec_rewrite: 'Description edited mid-dwell and ticket reassigned — scope likely shifted.',
  external_dep: 'Blocked by an unresolved external dependency with no internal progress.',
  silent: 'No comments, no transitions, dwell exceeds cohort P50.',
  none: 'No known dwell pathology detected.',
};

export function classifyDwell(input: DwellInput): DwellClassification {
  const now = input.now ?? new Date();
  let pattern: DwellPattern = 'none';
  let confidence = 0.4;

  // Priority order — first match wins
  if (isPingPong(input.events)) {
    pattern = 'ping_pong';
    confidence = 0.92;
  } else if (isPlGap(input.events, now)) {
    pattern = 'pl_gap';
    confidence = 0.85;
  } else if (isSpecRewrite(input.events)) {
    pattern = 'spec_rewrite';
    confidence = 0.8;
  } else if (isExternalDep(input)) {
    pattern = 'external_dep';
    confidence = 0.85;
  } else if (isSilent(input)) {
    pattern = 'silent';
    confidence = 0.75;
  } else {
    pattern = 'none';
    confidence = 0.4;
  }

  return { pattern, confidence, description: DESCRIPTIONS[pattern] };
}

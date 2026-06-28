/**
 * catyMoodEngine — the glass-box Caty workload-mood engine.
 *
 * Pure, deterministic: the SAME signals always produce the SAME state, score, and
 * breakdown. No randomness, no AI inference, no hidden weights. Every state is
 * justifiable down to the contributing rules — this function IS the defensibility
 * artifact (see CatyWhyCard).
 *
 * Data reality (probed 2026-06-14 on lmqwtldpfacrrlvdnmld): due_date is set on only
 * ~0.6% of open ph_issues, so the mood leans on signals that actually exist —
 * incidents, blocked, priority, backlog age, volume. Due-date rules remain in the
 * formula (zero weight contribution when absent) so the model strengthens for free
 * if due-date coverage improves later.
 */

export type CatyState = 'zen' | 'content' | 'focused' | 'concerned' | 'alert';

/**
 * Raw, named facts read from the user's open tickets. Every field is a plain count.
 * It is a PERSONAL mascot, so the score reflects the user's whole work-item spread:
 * the most severe types (incident / change request / bug / gap) carry weight, while
 * every other type still counts toward volume, overload, and ageing.
 */
export interface CatySignals {
  overdue: number;            // due_date < today, not done
  dueToday: number;           // due_date === today
  dueThisWeek: number;        // today < due_date <= today+7
  incidentsOpen: number;      // Production Incident
  changeRequestsOpen: number; // Change Request
  bugsOpen: number;           // QA Bug / Defect
  gapsOpen: number;           // Business Gap
  blocked: number;            // status contains "block"
  highPriorityOpen: number;   // priority in High/Highest
  agedOpen: number;           // open and created > AGE_DAYS ago (backlog pressure)
  totalOpen: number;          // ALL open work items assigned to me, every type
}

export type CatyRuleKey =
  | 'overdue'
  | 'incidentsOpen'
  | 'changeRequestsOpen'
  | 'dueToday'
  | 'blocked'
  | 'highPriorityOpen'
  | 'bugsOpen'
  | 'gapsOpen'
  | 'dueThisWeek'
  | 'agedOpen'
  | 'overload';

/** Visible weights — a skeptic reproduces the score by hand from these. */
export const WEIGHTS: Record<CatyRuleKey, number> = {
  overdue: 5,
  incidentsOpen: 4,
  dueToday: 3,
  changeRequestsOpen: 2,
  blocked: 2,
  highPriorityOpen: 1.5,
  bugsOpen: 1,
  gapsOpen: 0,
  dueThisWeek: 1,
  agedOpen: 0.5,
  overload: 0.5,
};

export const RULE_LABELS: Record<CatyRuleKey, string> = {
  overdue: 'overdue',
  incidentsOpen: 'open incident',
  changeRequestsOpen: 'change request',
  dueToday: 'due today',
  blocked: 'blocked',
  highPriorityOpen: 'high priority',
  bugsOpen: 'open bug',
  gapsOpen: 'business gap',
  dueThisWeek: 'due this week',
  agedOpen: 'ageing backlog',
  overload: 'overload',
};

/** Score cut-points. Tunable policy, intentionally visible. */
export const THRESHOLDS = { focused: 3, concerned: 7, alert: 12 } as const;
/** Open-item count above which extra volume adds overload pressure. */
export const OVERLOAD_FLOOR = 15;
/** Open-item ceiling for the calmest (zen) state. */
export const ZEN_MAX_OPEN = 5;
/** Days an open item must exceed to count as ageing backlog. */
export const AGE_DAYS = 21;

export interface CatyContribution {
  key: CatyRuleKey;
  label: string;
  weight: number;
  count: number;
  points: number;
}

export interface CatyMood {
  state: CatyState;
  score: number;
  /** Only non-zero rules, sorted by points desc — the audit trail. */
  contributions: CatyContribution[];
  /** One-line, deterministic, fact-only summary. Never judges. */
  message: string;
}

function overloadCount(totalOpen: number): number {
  return Math.max(0, totalOpen - OVERLOAD_FLOOR);
}

function ruleCount(key: CatyRuleKey, s: CatySignals): number {
  if (key === 'overload') return overloadCount(s.totalOpen);
  return s[key];
}

/**
 * computeCatyState — pure. Returns the state, the summed score, the non-zero
 * contributions (sorted), and a deterministic one-line message.
 */
export function computeCatyState(signals: CatySignals): CatyMood {
  const keys: CatyRuleKey[] = [
    'overdue',
    'incidentsOpen',
    'changeRequestsOpen',
    'dueToday',
    'blocked',
    'highPriorityOpen',
    'bugsOpen',
    'gapsOpen',
    'dueThisWeek',
    'agedOpen',
    'overload',
  ];

  const contributions: CatyContribution[] = [];
  let score = 0;
  for (const key of keys) {
    const count = ruleCount(key, signals);
    if (count <= 0) continue;
    const weight = WEIGHTS[key];
    const points = count * weight;
    score += points;
    contributions.push({ key, label: RULE_LABELS[key], weight, count, points });
  }
  contributions.sort((a, b) => b.points - a.points || a.key.localeCompare(b.key));

  const state = deriveState(signals, score);
  return { state, score, contributions, message: buildMessage(state, signals) };
}

function deriveState(s: CatySignals, score: number): CatyState {
  // Hard overrides — these are alert regardless of score.
  if (s.overdue > 0 || s.incidentsOpen > 0 || score > THRESHOLDS.alert) return 'alert';
  if (score >= THRESHOLDS.concerned) return 'concerned';
  if (score >= THRESHOLDS.focused) return 'focused';
  if (score >= 1 || s.totalOpen > ZEN_MAX_OPEN) return 'content';
  return 'zen';
}

function buildMessage(state: CatyState, s: CatySignals): string {
  const parts: string[] = [];
  if (s.incidentsOpen > 0) parts.push(`${s.incidentsOpen} incident${s.incidentsOpen > 1 ? 's' : ''}`);
  if (s.overdue > 0) parts.push(`${s.overdue} overdue`);
  if (s.changeRequestsOpen > 0) parts.push(`${s.changeRequestsOpen} change request${s.changeRequestsOpen > 1 ? 's' : ''}`);
  if (s.dueToday > 0) parts.push(`${s.dueToday} due today`);
  if (s.blocked > 0) parts.push(`${s.blocked} blocked`);
  if (s.bugsOpen > 0) parts.push(`${s.bugsOpen} bug${s.bugsOpen > 1 ? 's' : ''}`);

  switch (state) {
    case 'zen':
      return 'inbox-zero on tickets. nice.';
    case 'content':
      return `all steady. ${s.totalOpen} in flight.`;
    case 'focused':
      return s.dueThisWeek > 0
        ? `${s.dueThisWeek} land this week. on it.`
        : `${s.totalOpen} in flight. focused.`;
    case 'concerned':
      return parts.length ? `${parts.join(' · ')}. want a plan?` : 'backlog climbing. want a plan?';
    case 'alert':
      return parts.length ? `${parts.join(' + ')}. triage?` : 'workload spiking. triage?';
    default:
      return '';
  }
}

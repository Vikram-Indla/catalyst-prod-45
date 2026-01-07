/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CATALYST V5 NEUTRAL AUTHORITY — SEMANTIC TOKEN UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ALL EXPRESSIVE COLORS BANNED: No purple, green, red, yellow
 * Status is expressed by: text labels, position, grouping — NOT color
 * Catalyst Gold ONLY for critical attention
 * 
 * NO HARDCODED COLORS ALLOWED - all values reference CSS variables from index.css
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY TOKENS (for defects, issues, alerts)
// ALL NEUTRAL — Catalyst Gold for critical ONLY
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';

export interface SeverityConfig {
  label: string;
  /** Background class for chips/badges */
  bgClass: string;
  /** Text/foreground class */
  textClass: string;
  /** Border class (optional, for outlined variants) */
  borderClass: string;
  /** Left accent bar class (for cards with severity rails) */
  railClass: string;
  /** Combined chip class (bg + text + border) */
  chipClass: string;
}

/**
 * NEUTRAL AUTHORITY: All severities use neutral grayscale
 * ONLY blocker/critical uses Catalyst Gold
 */
export const SEVERITY_TOKENS: Record<SemanticSeverity, SeverityConfig> = {
  blocker: {
    label: 'Blocker',
    bgClass: 'bg-[var(--gold-bg)]',
    textClass: 'text-[var(--gold-fg)]',
    borderClass: 'border-[var(--gold-bd)]',
    railClass: 'border-l-[var(--gold-fg)]',
    chipClass: 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]',
  },
  critical: {
    label: 'Critical',
    bgClass: 'bg-[var(--gold-bg)]',
    textClass: 'text-[var(--gold-fg)]',
    borderClass: 'border-[var(--gold-bd)]',
    railClass: 'border-l-[var(--gold-fg)]',
    chipClass: 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]',
  },
  major: {
    label: 'Major',
    bgClass: 'bg-[var(--neutral-bg)]',
    textClass: 'text-[var(--neutral-fg)]',
    borderClass: 'border-[var(--neutral-bd)]',
    railClass: 'border-l-[var(--fg-2)]',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  minor: {
    label: 'Minor',
    bgClass: 'bg-[var(--neutral-bg)]',
    textClass: 'text-[var(--fg-3)]',
    borderClass: 'border-[var(--neutral-bd)]',
    railClass: 'border-l-[var(--fg-3)]',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-3)] border-[var(--neutral-bd)]',
  },
  trivial: {
    label: 'Trivial',
    bgClass: 'bg-[var(--neutral-bg)]',
    textClass: 'text-[var(--fg-4)]',
    borderClass: 'border-[var(--neutral-bd)]',
    railClass: 'border-l-[var(--fg-4)]',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-4)] border-[var(--neutral-bd)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY TOKENS (P1-P4)
// ALL NEUTRAL — Catalyst Gold for P1 ONLY
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface PriorityConfig {
  label: string;
  chipClass: string;
}

export const PRIORITY_TOKENS: Record<SemanticPriority, PriorityConfig> = {
  p1: {
    label: 'P1',
    chipClass: 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]',
  },
  p2: {
    label: 'P2',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  p3: {
    label: 'P3',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-3)] border-[var(--neutral-bd)]',
  },
  p4: {
    label: 'P4',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-4)] border-[var(--neutral-bd)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TOKENS (workflow states)
// ALL NEUTRAL — Status expressed by text labels, NOT color
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticStatus = 
  | 'new'
  | 'open' 
  | 'in_progress' 
  | 'in_review' 
  | 'verified' 
  | 'resolved'
  | 'closed' 
  | 'wont_fix'
  | 'blocked'
  | 'done';

export interface StatusConfig {
  label: string;
  chipClass: string;
}

/**
 * NEUTRAL AUTHORITY: All statuses use neutral tokens
 * Status meaning comes from LABELS and POSITION, not color
 */
export const STATUS_TOKENS: Record<SemanticStatus, StatusConfig> = {
  new: {
    label: 'New',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-1)] border-[var(--neutral-bd)] font-medium',
  },
  open: {
    label: 'Open',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  in_progress: {
    label: 'In Progress',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  in_review: {
    label: 'In Review',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  verified: {
    label: 'Verified',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  resolved: {
    label: 'Resolved',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-2)] border-[var(--neutral-bd)]',
  },
  closed: {
    label: 'Closed',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-3)] border-[var(--neutral-bd)]',
  },
  wont_fix: {
    label: "Won't Fix",
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-4)] border-[var(--neutral-bd)]',
  },
  blocked: {
    label: 'Blocked',
    chipClass: 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]',
  },
  done: {
    label: 'Done',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-2)] border-[var(--neutral-bd)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH TOKENS
// ALL NEUTRAL — No emotional color cues
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticHealth = 'green' | 'yellow' | 'red';

export const HEALTH_TOKENS: Record<SemanticHealth, { chipClass: string; label: string }> = {
  green: {
    label: 'On Track',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--fg-2)] border-[var(--neutral-bd)]',
  },
  yellow: {
    label: 'At Risk',
    chipClass: 'bg-[var(--neutral-bg)] text-[var(--neutral-fg)] border-[var(--neutral-bd)]',
  },
  red: {
    label: 'Off Track',
    chipClass: 'bg-[var(--gold-bg)] text-[var(--gold-fg)] border-[var(--gold-bd)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get severity chip classes for badges
 */
export function getSeverityClasses(severity: SemanticSeverity | string): string {
  const normalized = severity.toLowerCase() as SemanticSeverity;
  return SEVERITY_TOKENS[normalized]?.chipClass ?? SEVERITY_TOKENS.trivial.chipClass;
}

/**
 * Get severity rail class for left-border accent
 */
export function getSeverityRailClass(severity: SemanticSeverity | string): string {
  const normalized = severity.toLowerCase() as SemanticSeverity;
  return SEVERITY_TOKENS[normalized]?.railClass ?? 'border-l-[var(--fg-4)]';
}

/**
 * Get priority chip classes for badges
 */
export function getPriorityClasses(priority: SemanticPriority | string): string {
  const normalized = priority.toLowerCase() as SemanticPriority;
  return PRIORITY_TOKENS[normalized]?.chipClass ?? PRIORITY_TOKENS.p4.chipClass;
}

/**
 * Get status chip classes for badges
 */
export function getStatusClasses(status: SemanticStatus | string): string {
  const normalized = status.toLowerCase().replace('-', '_') as SemanticStatus;
  return STATUS_TOKENS[normalized]?.chipClass ?? STATUS_TOKENS.closed.chipClass;
}

/**
 * Get health chip classes
 */
export function getHealthClasses(health: SemanticHealth | string | null): string {
  if (!health) return '';
  const normalized = health.toLowerCase() as SemanticHealth;
  return HEALTH_TOKENS[normalized]?.chipClass ?? '';
}

/**
 * Get health label (replaces color with text)
 */
export function getHealthLabel(health: SemanticHealth | string | null): string {
  if (!health) return '';
  const normalized = health.toLowerCase() as SemanticHealth;
  return HEALTH_TOKENS[normalized]?.label ?? health;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CATALYST V5 SEMANTIC TOKEN UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized semantic color mappings that use CSS variables exclusively.
 * Components should ONLY import from here for severity/status/priority colors.
 * 
 * NO HARDCODED COLORS ALLOWED - all values reference CSS variables from index.css
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY TOKENS (for defects, issues, alerts)
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

export const SEVERITY_TOKENS: Record<SemanticSeverity, SeverityConfig> = {
  blocker: {
    label: 'Blocker',
    bgClass: 'bg-[var(--sem-danger-bg)]',
    textClass: 'text-[var(--sem-danger)]',
    borderClass: 'border-[var(--sem-danger-border)]',
    railClass: 'border-l-[var(--sem-danger)]',
    chipClass: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
  },
  critical: {
    label: 'Critical',
    bgClass: 'bg-[var(--sem-critical-bg)]',
    textClass: 'text-[var(--sem-critical)]',
    borderClass: 'border-[var(--sem-critical-border)]',
    railClass: 'border-l-[var(--sem-critical)]',
    chipClass: 'bg-[var(--sem-critical-bg)] text-[var(--sem-critical)] border-[var(--sem-critical-border)]',
  },
  major: {
    label: 'Major',
    bgClass: 'bg-[var(--sem-warning-bg)]',
    textClass: 'text-[var(--sem-warning)]',
    borderClass: 'border-[var(--sem-warning-border)]',
    railClass: 'border-l-[var(--sem-warning)]',
    chipClass: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
  },
  minor: {
    label: 'Minor',
    bgClass: 'bg-[var(--sem-info-bg)]',
    textClass: 'text-[var(--sem-info)]',
    borderClass: 'border-[var(--sem-info-border)]',
    railClass: 'border-l-[var(--sem-info)]',
    chipClass: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
  },
  trivial: {
    label: 'Trivial',
    bgClass: 'bg-[var(--sem-medium-bg)]',
    textClass: 'text-[var(--sem-medium)]',
    borderClass: 'border-[var(--status-muted-border)]',
    railClass: 'border-l-muted-foreground',
    chipClass: 'bg-[var(--sem-medium-bg)] text-[var(--sem-medium)] border-[var(--status-muted-border)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITY TOKENS (P1-P4)
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticPriority = 'p1' | 'p2' | 'p3' | 'p4';

export interface PriorityConfig {
  label: string;
  chipClass: string;
}

export const PRIORITY_TOKENS: Record<SemanticPriority, PriorityConfig> = {
  p1: {
    label: 'P1',
    chipClass: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
  },
  p2: {
    label: 'P2',
    chipClass: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
  },
  p3: {
    label: 'P3',
    chipClass: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
  },
  p4: {
    label: 'P4',
    chipClass: 'bg-[var(--sem-medium-bg)] text-[var(--sem-medium)] border-[var(--status-muted-border)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TOKENS (workflow states)
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticStatus = 
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

export const STATUS_TOKENS: Record<SemanticStatus, StatusConfig> = {
  open: {
    label: 'Open',
    chipClass: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
  },
  in_progress: {
    label: 'In Progress',
    chipClass: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
  },
  in_review: {
    label: 'In Review',
    chipClass: 'bg-[var(--accent-bg)] text-[var(--accent-text)] border-[var(--accent-border)]',
  },
  verified: {
    label: 'Verified',
    chipClass: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
  },
  resolved: {
    label: 'Resolved',
    chipClass: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
  },
  closed: {
    label: 'Closed',
    chipClass: 'bg-[var(--sem-medium-bg)] text-[var(--sem-medium)] border-[var(--status-muted-border)]',
  },
  wont_fix: {
    label: "Won't Fix",
    chipClass: 'bg-[var(--sem-medium-bg)] text-[var(--sem-low)] border-[var(--status-muted-border)]',
  },
  blocked: {
    label: 'Blocked',
    chipClass: 'bg-[var(--sem-blocked-bg)] text-[var(--sem-blocked)] border-[var(--sem-danger-border)]',
  },
  done: {
    label: 'Done',
    chipClass: 'bg-[var(--sem-done-bg)] text-[var(--sem-done)] border-[var(--sem-success-border)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export type SemanticHealth = 'green' | 'yellow' | 'red';

export const HEALTH_TOKENS: Record<SemanticHealth, { chipClass: string }> = {
  green: {
    chipClass: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
  },
  yellow: {
    chipClass: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
  },
  red: {
    chipClass: 'bg-[var(--sem-danger-bg)] text-[var(--sem-danger)] border-[var(--sem-danger-border)]',
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
  return SEVERITY_TOKENS[normalized]?.railClass ?? 'border-l-muted-foreground';
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

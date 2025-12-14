// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V2 — Configuration Constants
// All thresholds and magic numbers are centralized here for future tuning
// ═══════════════════════════════════════════════════════════════════════════════

// Progress thresholds for status derivation
export const PROGRESS_THRESHOLDS = {
  ON_TRACK: 70, // >= 70% = on-track (if no high risks)
  IN_PROGRESS: 40, // >= 40% = in-progress
  AT_RISK: 20, // >= 20% but < 40% = at-risk with risks
  // < 20% = pending or off-track
} as const;

// Risk severity weights for score calculation (aligned with ISO-31000 / COSO)
export const RISK_SEVERITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

// Risk score thresholds for UI styling
export const RISK_SCORE_THRESHOLDS = {
  DANGER: 5, // >= 5 = danger/red styling
  WARNING: 2, // >= 2 = warning/yellow styling
  // < 2 = success/green styling
} as const;

// Due date warning thresholds (days)
export const DUE_DATE_THRESHOLDS = {
  CRITICAL: 30, // Due within 30 days = critical
  WARNING: 60, // Due within 60 days = warning
  HORIZON: 90, // Due within 90 days = visible in horizon filter
} as const;

// Work item variance thresholds (days late)
export const VARIANCE_THRESHOLDS = {
  BLOCKED: 14, // > 14 days late = potential blocked status
  AT_RISK: 7, // > 7 days late = at-risk
} as const;

// Value realization thresholds
export const VALUE_THRESHOLDS = {
  LOW_REALIZATION: 50, // < 50% = low realization warning
} as const;

// Health derivation from progress (used when no explicit health set)
export const HEALTH_FROM_PROGRESS = {
  GOOD: 70, // >= 70% progress = good health
  FAIR: 40, // >= 40% progress = fair health
  AT_RISK: 20, // >= 20% progress = at_risk health
  // < 20% = poor health
} as const;

// Status colors for UI (aligned with Catalyst brand)
export const STATUS_COLORS: Record<string, string> = {
  'on-track': '#5c7c5c', // secondary-green
  'completed': '#5c7c5c', // secondary-green
  'in-progress': '#c69c6d', // brand-gold
  'pending': '#c8ccd0', // secondary-grey
  'at-risk': '#d4a574', // warm warning
  'off-track': '#b85c38', // danger
  'blocked': '#8b4513', // dark danger
} as const;

// Status labels for display
export const STATUS_LABELS: Record<string, string> = {
  'on-track': 'On Track',
  'completed': 'Completed',
  'in-progress': 'In Progress',
  'pending': 'Pending',
  'at-risk': 'At Risk',
  'off-track': 'Off Track',
  'blocked': 'Blocked',
} as const;

// Theme default colors (used when no color specified)
export const DEFAULT_THEME_COLORS = [
  '#5c7c5c', // secondary-green
  '#8b7355', // secondary-bronze
  '#c69c6d', // brand-gold
  '#d4b896', // secondary-champagne
  '#4a6741', // dark green
] as const;

// Maximum progress for over-achievement display
export const MAX_PROGRESS_DISPLAY = 100; // Cap at 100% for progress bars
export const MAX_PROGRESS_CALCULATION = 120; // Allow up to 120% for analytics

// Baseline progress trend thresholds (percentage points)
// Green: within ±10pp, Orange: 10-20pp behind, Red: >20pp behind
export const TREND_THRESHOLDS = {
  ON_TRACK_PP: 10, // variance within ±10pp = on track (green)
  AT_RISK_PP: 20, // variance between -10pp and -20pp = at risk (orange)
  // variance below -20pp = off track (red)
} as const;

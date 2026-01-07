/**
 * Catalyst V5 Canonical Color Tokens
 * 
 * This is the SINGLE SOURCE OF TRUTH for all semantic colors in Test Management.
 * DO NOT use hardcoded hex values or Tailwind palette classes elsewhere.
 * 
 * V5 Semantic Colors (use ONLY for semantic meaning):
 * - Primary: #2563eb (blue) - links, active states, primary CTA, focus rings
 * - Success: #0d9488 (teal) - passed, complete, healthy, on-track
 * - Warning: #d97706 (orange) - warning, pending, at risk, blocked
 * - Danger: #ef4444 (red) - critical, error, destructive, failed
 * 
 * BANNED FOREVER:
 * - #C69C6D, #5C7C5C, #8B7355, #D4B896 (old "Golden Hour" palette)
 * - Purple for status/icons (not in V5)
 * - Green for passed (use teal instead)
 */

// Execution status colors - uses CSS variables for proper theming
export const EXECUTION_STATUS_COLORS: Record<string, string> = {
  not_run: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/20 text-info-foreground',
  passed: 'bg-success/20 text-success-foreground',
  failed: 'bg-danger/20 text-danger-foreground',
  blocked: 'bg-warning/20 text-warning-foreground',
  skipped: 'bg-muted text-muted-foreground',
};

// Solid execution status colors for progress indicators
export const EXECUTION_STATUS_SOLID: Record<string, string> = {
  not_run: 'bg-muted-foreground/40',
  in_progress: 'bg-[hsl(var(--info))]',
  passed: 'bg-[hsl(var(--success))]',
  failed: 'bg-[hsl(var(--danger))]',
  blocked: 'bg-[hsl(var(--warning))]',
  skipped: 'bg-muted-foreground/30',
};

// Defect severity levels - semantic mapping
export const SEVERITY_COLORS: Record<string, string> = {
  blocker: 'bg-danger text-white',
  critical: 'bg-danger/80 text-white',
  major: 'bg-warning text-white',
  minor: 'bg-info text-white',
  trivial: 'bg-muted text-muted-foreground',
};

// Defect priority levels - semantic mapping
export const PRIORITY_COLORS: Record<string, string> = {
  blocker: 'bg-danger text-white',
  critical: 'bg-danger/80 text-white',
  high: 'bg-warning text-white',
  medium: 'bg-warning/60 text-foreground',
  low: 'bg-muted text-muted-foreground',
};

// Workflow status colors - mostly neutral, semantic only when meaningful
export const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  // Neutral workflow states
  new: 'bg-muted text-muted-foreground',
  open: 'bg-info/20 text-info-foreground',
  in_progress: 'bg-info/30 text-info-foreground',
  in_review: 'bg-info/20 text-info-foreground',
  ready_for_test: 'bg-info/10 text-info-foreground',
  in_testing: 'bg-info/20 text-info-foreground',
  // Semantic states
  verified: 'bg-success/20 text-success-foreground',
  closed: 'bg-success/30 text-success-foreground',
  reopened: 'bg-warning/20 text-warning-foreground',
  deferred: 'bg-muted text-muted-foreground',
  wont_fix: 'bg-muted text-muted-foreground',
  duplicate: 'bg-muted text-muted-foreground',
};

// Cycle status colors
export const CYCLE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success/20 text-success-foreground',
  in_progress: 'bg-info/20 text-info-foreground',
  active: 'bg-info/20 text-info-foreground',
  planned: 'bg-muted text-muted-foreground',
};

// Chart semantic colors - for recharts/canvas charts
export const CHART_SEMANTIC = {
  passed: 'hsl(var(--success))',      // #0d9488 teal
  failed: 'hsl(var(--danger))',       // #ef4444 red
  blocked: 'hsl(var(--warning))',     // #d97706 orange
  skipped: 'hsl(var(--muted-foreground))',
  active: 'hsl(var(--primary))',      // #2563eb blue
  neutral1: 'hsl(var(--muted-foreground))',
  neutral2: 'hsl(var(--muted))',
};

// Chart semantic hex values (for libraries that need hex)
export const CHART_SEMANTIC_HEX = {
  passed: '#0d9488',   // teal
  failed: '#ef4444',   // red
  blocked: '#d97706',  // orange
  skipped: '#71717a',  // neutral
  active: '#2563eb',   // blue
  neutral: '#52525b',
};

// Defect type colors - neutral unless semantic
export const DEFECT_TYPE_COLORS: Record<string, string> = {
  bug: 'text-danger',
  ui_issue: 'text-warning',
  performance: 'text-warning',
  security: 'text-danger',
  data_issue: 'text-info-foreground',
  integration: 'text-info-foreground',
  crash: 'text-danger',
  usability: 'text-muted-foreground',
};

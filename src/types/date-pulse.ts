/**
 * Date Pulse Type Definitions
 *
 * Two-layer system for Business Request delivery health:
 * 1. Health Status Engine → Computes glanceable state (7 states)
 * 2. Date Pulse Engine → Computes violations (18 rules, diagnostic detail)
 */

// ============================================================================
// Health Status Types
// ============================================================================

/**
 * Core health status states (7 total)
 */
export type HealthStatus =
  | 'Uncommitted'
  | 'Committed'
  | 'On Track'
  | 'Delayed'
  | 'At Risk'
  | 'Blocked'
  | 'Delivered';

/**
 * Health severity for styling/visual priority
 */
export type HealthSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

// ============================================================================
// Date Pulse Violation Types
// ============================================================================

/**
 * Severity levels for violations
 */
export type ViolationSeverity = 'advisory' | 'warning' | 'critical';

/**
 * Rule category for grouping violations
 */
export type RuleCategory = 'missing' | 'conflict' | 'scope_creep' | 'status' | 'alignment';

/**
 * Work item type for violation tracking.
 * Aliased to the canonical normalization bucket so the engines and the
 * normalization boundary share one vocabulary (no casing casts).
 */
export type { IssueTypeBucket, WorkStatusBucket } from '@/lib/date-pulse/normalize';
import type { IssueTypeBucket, WorkStatusBucket } from '@/lib/date-pulse/normalize';
export type WorkItemType = IssueTypeBucket;

/**
 * Individual date pulse violation
 */
export interface DatePulseViolation {
  /** Unique violation ID (e.g., uuid) */
  id: string;

  /** Rule identifier (e.g., 'A1', 'B1', 'C1') */
  rule_id: string;

  /** Violation category */
  rule_category: RuleCategory;

  /** Severity level */
  severity: ViolationSeverity;

  /** Short title (e.g., "Story due after release") */
  title: string;

  /** Detailed description with context */
  description: string;

  /** Affected work item key (e.g., 'BAU-123') */
  affected_item_key: string | null;

  /** Affected work item type */
  affected_item_type: WorkItemType;

  /** Affected work item UUID */
  affected_item_id: string | null;

  /** The problematic date value */
  date_value: string | null;

  /** What the date should be (baseline) */
  baseline_date: string | null;

  /** Suggested action to resolve (informational only, no action taken) */
  suggested_action: string | null;

  /** ISO timestamp when violation was detected */
  detected_at: string;
}

/**
 * Complete health assessment result
 */
export interface BusinessRequestHealth {
  // ── Primary Status ──────────────────────────────────────────────────
  /** Current health status (one of 7 states) */
  health_status: HealthStatus;

  /** Severity for styling (maps status to visual priority) */
  health_severity: HealthSeverity;

  // ── Summary Text ────────────────────────────────────────────────────
  /** One-line summary (e.g., "Story due 30 Aug, release 30 Jul") */
  health_summary: string;

  /** Hover text (e.g., "All dates aligned. On schedule.") */
  health_descriptor: string;

  // ── Linked Work Snapshot ────────────────────────────────────────────
  /** Total count of work items linked to this BR */
  linked_work_count: number;

  /** Count of linked work with due_date set */
  linked_work_with_dates_count: number;

  /** Count of items in-progress (not backlog, not done) */
  in_progress_count: number;

  /** Count of items marked done */
  done_count: number;

  /** Count of open blockers (status = blocked) */
  open_blockers_count: number;

  // ── Date Snapshot ──────────────────────────────────────────────────
  /** BR's internal target date (business_requests.end_date) */
  br_target_date: string | null;

  /** Alternative name for same field (for clarity) */
  br_end_date: string | null;

  /** Release target date (from linked release) */
  release_target_date: string | null;

  /** Earliest due_date across all linked work */
  earliest_story_due: string | null;

  /** Latest due_date across all linked work */
  latest_story_due: string | null;

  // ── Urgency ────────────────────────────────────────────────────────
  /** Days until deadline (negative = overdue) */
  days_to_deadline: number;

  /** True if deadline has passed */
  is_overdue: boolean;

  /** True if less than 7 days to deadline */
  is_urgent: boolean;

  // ── Violations (Date Pulse Detail) ─────────────────────────────────
  /** Array of all violations detected */
  date_pulse_violations: DatePulseViolation[];

  /** Total violation count */
  violation_count: number;

  /** Count of critical violations */
  critical_violation_count: number;

  // ── Metadata ────────────────────────────────────────────────────────
  /** ISO timestamp when health was evaluated */
  evaluated_at: string;

  /** How long the evaluation took (ms) */
  evaluation_duration_ms: number;
}

/**
 * Extended Business Request type with health assessment
 */
export interface BusinessRequestWithHealth {
  // ... all BR fields ...
  health: BusinessRequestHealth;
}

// ============================================================================
// Hook Interface Types
// ============================================================================

/**
 * Options for useBusinessRequestHealth hook
 */
export interface UseBusinessRequestHealthOptions {
  /** Cache refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;

  /** Include full violations list in result (default: true) */
  includeViolations?: boolean;

  /** Bypass cache and recalculate (default: false) */
  forceRecalculate?: boolean;
}

/**
 * Return type for useBusinessRequestHealth hook
 */
export interface UseBusinessRequestHealthResult {
  /** Current health assessment (null while loading) */
  health: BusinessRequestHealth | null;

  /** True while fetching/computing */
  isLoading: boolean;

  /** Error if computation failed */
  error: Error | null;

  /** Manual refetch trigger */
  refetch: () => Promise<void>;
}

// ============================================================================
// Component Prop Types
// ============================================================================

/**
 * Props for HealthStatusBadge component
 */
export interface HealthStatusBadgeProps {
  /** Health assessment data */
  health: BusinessRequestHealth;

  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Whether to show status text (default: false) */
  showText?: boolean;

  /** Callback when badge clicked */
  onClick?: () => void;

  /** Additional CSS class */
  className?: string;

  /** Test identifier */
  'data-testid'?: string;
}

/**
 * Props for HealthStatusDescriptor hover card component
 */
export interface HealthStatusDescriptorProps {
  /** Health assessment data */
  health: BusinessRequestHealth;

  /** Business request key (for linking) */
  brKey: string;

  /** Callback to open full violations view */
  onOpenDatePulse?: () => void;

  /** Additional CSS class */
  className?: string;
}

/**
 * Props for DatePulseHoverCard component (violations list)
 */
export interface DatePulseHoverCardProps {
  /** Array of violations to display */
  violations: DatePulseViolation[];

  /** Business request key (for reference) */
  brKey: string;

  /** BR's target date */
  brTargetDate: string | null;

  /** Release's target date */
  releaseDate: string | null;

  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Data Model Types (from Business Logic)
// ============================================================================

/**
 * Business Request (simplified, for type safety)
 * Full type exists in business domain
 */
export interface BusinessRequest {
  id: string;
  request_key: string;
  status: string;
  end_date: string | null;
  release_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Work Item (simplified, for type safety)
 * Full type exists in work domain
 */
export interface WorkItem {
  id: string;
  issue_key: string;
  /** Normalized lowercase bucket (see normalizeIssueTypeBucket). Null when the
   *  source row carries no / an unrecognized issue type. Never default to
   *  'Story' (CLAUDE.md zero-assumption rule). */
  issue_type: WorkItemType;
  project_key: string;
  /** Normalized lowercase bucket (see normalizeWorkStatus): the engines compare
   *  against these, NOT the Title-Case display string. Null when the source row
   *  carries no / an unrecognized status — treated as "unscorable" by
   *  HealthStatusEngine (excluded from in-progress/done/blocked bucketing
   *  rather than assumed to be 'todo', CLAUDE.md zero-assumption rule). */
  status: WorkStatusBucket;
  due_date: string | null;
  severity?: string;
  parent_key?: string | null;
  sprint_id?: string | null;
  business_request_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Product Release (simplified, for type safety)
 */
export interface Release {
  id: string;
  target_date: string | null;
  name?: string;
}

/**
 * Sprint (simplified, for type safety)
 */
export interface Sprint {
  id: string;
  name: string;
  end_date: string | null;
}

// ============================================================================
// Rule Configuration Types
// ============================================================================

/**
 * Individual rule definition (for validation + documentation)
 */
export interface RuleDefinition {
  id: string; // e.g., 'A1', 'B1'
  category: RuleCategory;
  severity: ViolationSeverity;
  title: string;
  description: string;
}

/**
 * Computed rule result (before formatting as violation)
 */
export interface RuleResult {
  fired: boolean;
  rule_id: string;
  severity: ViolationSeverity;
  title: string;
  description: string;
  affected_item_key?: string | null;
  affected_item_type?: WorkItemType;
  affected_item_id?: string | null;
  date_value?: string | null;
  baseline_date?: string | null;
  suggested_action?: string | null;
}

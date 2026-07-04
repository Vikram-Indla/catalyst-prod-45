/**
 * Health Status Engine — State Machine
 *
 * Computes glanceable delivery health status (7 states):
 * Uncommitted → Committed → On Track / Delayed / At Risk / Blocked / Delivered
 *
 * State transitions are driven by:
 * 1. Work linkage (is work linked?)
 * 2. Dates (do linked items have due_dates?)
 * 3. Date alignment (do dates fit the window?)
 * 4. Engagement (has work started?)
 * 5. Violations (any date misalignment?)
 * 6. Blockers (any critical blockers?)
 */

import { BusinessRequest, WorkItem, DatePulseViolation, HealthStatus } from '@/types/date-pulse';

/**
 * Compute health status for a Business Request
 *
 * @param br Business Request
 * @param linkedWork Array of linked work items
 * @param violations Array of date pulse violations
 * @returns One of 7 health states
 */
export function computeHealthStatus(
  br: BusinessRequest,
  linkedWork: WorkItem[],
  violations: DatePulseViolation[],
): HealthStatus {
  // ── Step 1: Gather Snapshots ────────────────────────────────────────
  // Zero-assumption: items with a null status are "unscorable" — they are
  // excluded from every status-derived bucket below (in-progress, done,
  // blocked) rather than being treated as 'todo'/not-started. A fabricated
  // 'todo' would silently count toward "no engagement yet" and skew the
  // BR toward Uncommitted/At Risk even though the item's real status is
  // simply unknown (CLAUDE.md zero-assumption rule).
  const workWithDates = linkedWork.filter(w => w.due_date !== null && w.due_date !== undefined);
  const inProgressWork = linkedWork.filter(
    w => w.status && w.status !== 'backlog' && w.status !== 'todo' && w.status !== 'done',
  );
  const doneWork = linkedWork.filter(w => w.status === 'done');

  // Critical blockers: P1/P0 or marked as blocked
  const criticalBlockers = linkedWork.filter(
    w => (w.severity === 'P1' || w.severity === 'P0' || w.severity === 'SEV1') && w.status === 'blocked',
  );

  // ── Step 2: BLOCKED State (Highest Priority) ────────────────────────
  // Any critical blocker → Blocked immediately
  if (criticalBlockers.length > 0) {
    return 'Blocked';
  }

  // ── Step 3: DELIVERED State ─────────────────────────────────────────
  // All work done AND BR marked done
  if (
    linkedWork.length > 0 &&
    linkedWork.every(w => w.status === 'done') &&
    br.status === 'done'
  ) {
    return 'Delivered';
  }

  // ── Step 4: UNCOMMITTED State ──────────────────────────────────────
  // No commitment path if:
  // - No work linked, OR
  // - Work linked but no items have dates
  if (linkedWork.length === 0 || workWithDates.length === 0) {
    return 'Uncommitted';
  }

  // ── Step 5: AT RISK State ──────────────────────────────────────────
  // Expectation set but no delivery engagement + deadline < 14 days
  const targetDate = br.end_date; // br.release?.target_date fallback handled in hook
  if (targetDate) {
    const daysToDeadline = daysUntil(targetDate);

    // At Risk conditions (all must be true):
    // 1. Expectation set (br.end_date or release exists)
    // 2. No delivery path (no work linked OR all work still in backlog)
    // 3. Deadline approaching (< 14 days)
    const noDeliveryPath = linkedWork.length === 0 || inProgressWork.length === 0;

    if (noDeliveryPath && daysToDeadline < 14 && daysToDeadline >= 0) {
      return 'At Risk';
    }
  }

  // ── Step 6: Commitment Check ───────────────────────────────────────
  // At this point, we know:
  // - Work is linked
  // - At least one item has a date
  // - Not blocked, not delivered, not uncommitted
  // Verify commitment conditions are met

  const isCommitted = checkCommitted(br, linkedWork, workWithDates, inProgressWork);

  if (!isCommitted) {
    // Still uncommitted (dates out of window, no engagement, etc)
    return 'Uncommitted';
  }

  // ── Step 7: ON TRACK vs DELAYED ────────────────────────────────────
  // Committed is base state from here on
  // Check for violations

  // If any violations exist → Delayed
  if (violations.length > 0) {
    return 'Delayed';
  }

  // All conditions met → On Track
  return 'On Track';
}

// ============================================================================
// Commitment Validation
// ============================================================================

/**
 * Check if BR has met all commitment conditions
 *
 * Commitment requires ALL of:
 * 1. Work linked (≥1 item)
 * 2. Dates exist (≥1 item with due_date)
 * 3. Dates fit window (story due ≤ release target OR BR target)
 * 4. Engagement (≥1 item not in backlog/todo)
 */
function checkCommitted(
  br: BusinessRequest,
  linkedWork: WorkItem[],
  workWithDates: WorkItem[],
  inProgressWork: WorkItem[],
): boolean {
  // Condition 1: Work Linkage
  if (linkedWork.length === 0) {
    return false;
  }

  // Condition 2: Dates Exist
  if (workWithDates.length === 0) {
    return false;
  }

  // Condition 3: Date Window Fit
  const targetDate = br.end_date; // In full implementation, also check br.release.target_date

  for (const work of workWithDates) {
    if (targetDate && work.due_date && work.due_date > targetDate) {
      // Date is outside the window
      return false;
    }
  }

  // Condition 4: Engagement (at least one item has left backlog)
  if (inProgressWork.length === 0) {
    return false;
  }

  return true;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days until deadline
 * Negative = overdue, Positive = days remaining
 */
function daysUntil(dateStr: string | null): number {
  if (!dateStr) return Infinity;

  const deadline = new Date(dateStr);
  const today = new Date();

  // Set both to midnight to count full days
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Export Helper: Map Status to Severity (for styling)
// ============================================================================

/**
 * Map health status to visual severity for styling
 */
export function mapStatusToSeverity(status: HealthStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'Uncommitted':
      return 'neutral'; // Grey
    case 'Committed':
      return 'info'; // Blue
    case 'On Track':
      return 'success'; // Green
    case 'Delayed':
      return 'warning'; // Amber
    case 'At Risk':
      return 'danger'; // Red
    case 'Blocked':
      return 'danger'; // Red
    case 'Delivered':
      return 'success'; // Green
    default:
      return 'neutral';
  }
}

// ============================================================================
// Export Helper: Sort Order for UI
// ============================================================================

/**
 * Determine sort order for health status (for sorting tables/lists)
 * Lower number = higher priority (more urgent)
 */
export function healthStatusSortOrder(status: HealthStatus): number {
  const order: Record<HealthStatus, number> = {
    Blocked: 0,
    'At Risk': 1,
    Delayed: 2,
    Committed: 3,
    'On Track': 4,
    Uncommitted: 5,
    Delivered: 6,
  };
  return order[status] ?? 999;
}

/**
 * Generate one-line summary for health status
 * Used in badge hover text
 */
export function generateHealthSummary(
  status: HealthStatus,
  br: BusinessRequest,
  linkedWork: WorkItem[],
): string {
  const workCount = linkedWork.length;
  const doneCount = linkedWork.filter(w => w.status === 'done').length;

  switch (status) {
    case 'Uncommitted':
      return `No delivery path. ${workCount === 0 ? 'Link work to begin.' : 'Add due dates to start.'}`;
    case 'Committed':
      return `${workCount} work linked. ${doneCount} done.`;
    case 'On Track':
      return `All dates aligned. ${doneCount}/${workCount} complete.`;
    case 'Delayed':
      return `Date misalignment detected. Review violations.`;
    case 'At Risk':
      return `Approaching deadline. Start delivery now.`;
    case 'Blocked':
      return `Critical blocker. Unblock to resume.`;
    case 'Delivered':
      return `Complete. All work done.`;
    default:
      return '';
  }
}

/**
 * Generate hover descriptor for health status
 */
export function generateHealthDescriptor(
  status: HealthStatus,
  br: BusinessRequest,
  linkedWork: WorkItem[],
): string {
  const workCount = linkedWork.length;
  const doneCount = linkedWork.filter(w => w.status === 'done').length;
  const blockedCount = linkedWork.filter(w => w.status === 'blocked').length;

  switch (status) {
    case 'Uncommitted':
      return 'No commitment path. No delivery plan in place.';
    case 'Committed':
      return 'Delivery path exists. Work linked with due dates.';
    case 'On Track':
      return 'All dates aligned. On schedule.';
    case 'Delayed':
      return `Date conflict detected. ${blockedCount > 0 ? `${blockedCount} blocked. ` : ''}Review dates.`;
    case 'At Risk':
      return 'Approaching deadline with no active work.';
    case 'Blocked':
      return `Critical blocker preventing progress. ${blockedCount} items blocked.`;
    case 'Delivered':
      return 'Complete and delivered. All work done.';
    default:
      return '';
  }
}

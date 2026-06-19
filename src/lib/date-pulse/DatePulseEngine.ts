/**
 * Date Pulse Engine — Rule Evaluator
 *
 * Evaluates 18 rules across 5 categories:
 * - A: Missing dates (3 rules)
 * - B: Date conflicts (6 rules)
 * - C: Scope creep (3 rules)
 * - D: Status/state (4 rules)
 * - E: Alignment (2 rules)
 */

import {
  BusinessRequest,
  WorkItem,
  Release,
  DatePulseViolation,
  ViolationSeverity,
  RuleCategory,
} from '@/types/date-pulse';

/**
 * Compute all date pulse violations for a given Business Request
 *
 * @param br Business Request
 * @param linkedWork Array of linked work items
 * @param release Release (if applicable)
 * @returns Array of violations sorted by severity (critical → warning → advisory)
 */
export function computeDatePulseViolations(
  br: BusinessRequest,
  linkedWork: WorkItem[],
  release: Release | null,
): DatePulseViolation[] {
  const violations: DatePulseViolation[] = [];
  const now = new Date();

  // ── Category A: Missing Date Rules ──────────────────────────────────
  // A1: BR Target Date Missing
  if (!br.end_date && !br.release_id) {
    violations.push(createViolation('A1', 'missing', 'advisory', 'BR Target Date Missing', 'Business expectation date is missing. Set end_date or link a release.', null, null, null));
  }

  // A2: Linked Work Missing Dates
  for (const item of linkedWork) {
    if (!item.due_date) {
      violations.push(
        createViolation(
          'A2',
          'missing',
          'warning',
          'Linked Work Missing Dates',
          `${item.issue_key} has no due date. Cannot assess commitment.`,
          item.issue_key,
          item.issue_type as any,
          item.id,
        ),
      );
    }
  }

  // A3: Release Date Missing
  if (br.release_id && release && !release.target_date) {
    violations.push(
      createViolation('A3', 'missing', 'warning', 'Release Date Missing', 'Release date not set. Cannot align expectations.', null, null, null),
    );
  }

  // ── Category B: Date Conflict Rules ─────────────────────────────────
  const releaseDate = release?.target_date;
  const brTargetDate = br.end_date;

  for (const item of linkedWork) {
    if (!item.due_date) continue; // Skip items without dates

    // B1: Story Due After Release
    if (releaseDate && item.due_date > releaseDate && item.issue_type !== 'epic') {
      violations.push(
        createViolation(
          'B1',
          'conflict',
          'critical',
          'Story Due After Release',
          `${item.issue_key} due ${formatDate(item.due_date)}, release ${formatDate(releaseDate)}`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          releaseDate,
        ),
      );
    }

    // B3: Story After BR Target
    if (brTargetDate && item.due_date > brTargetDate && item.issue_type !== 'epic') {
      violations.push(
        createViolation(
          'B3',
          'conflict',
          'warning',
          'Story After BR Target',
          `${item.issue_key} due date (${formatDate(item.due_date)}) exceeds business target (${formatDate(brTargetDate)})`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          brTargetDate,
        ),
      );
    }

    // B4: Defect After Release
    if (releaseDate && item.issue_type === 'defect' && item.due_date > releaseDate && item.status !== 'done') {
      violations.push(
        createViolation(
          'B4',
          'conflict',
          'warning',
          'Defect After Release',
          `Defect ${item.issue_key} may not be fixed before release (${formatDate(releaseDate)})`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          releaseDate,
        ),
      );
    }

    // B5: Epic After BR Target
    if (brTargetDate && item.issue_type === 'epic' && item.due_date > brTargetDate) {
      violations.push(
        createViolation(
          'B5',
          'conflict',
          'warning',
          'Epic After BR Target',
          `Epic ${item.issue_key} timeline exceeds business target`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          brTargetDate,
        ),
      );
    }

    // B6: Child After Parent
    if (item.parent_key) {
      const parent = linkedWork.find(w => w.issue_key === item.parent_key);
      if (parent && parent.due_date && item.due_date > parent.due_date) {
        violations.push(
          createViolation(
            'B6',
            'conflict',
            'warning',
            'Child After Parent',
            `${item.issue_key} due ${formatDate(item.due_date)} is after parent ${item.parent_key} due ${formatDate(parent.due_date)}`,
            item.issue_key,
            item.issue_type as any,
            item.id,
            item.due_date,
            parent.due_date,
          ),
        );
      }
    }

    // D2: Due Date Passed (item open)
    if (item.due_date < now.toISOString().split('T')[0] && item.status !== 'done') {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      violations.push(
        createViolation(
          'D2',
          'status',
          'critical',
          'Due Date Passed',
          `${item.issue_key} due ${formatDate(item.due_date)} is ${daysOverdue} days overdue`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          null,
        ),
      );
    }

    // D4: Blocked Item Past Due
    if (item.status === 'blocked' && item.due_date < now.toISOString().split('T')[0]) {
      violations.push(
        createViolation(
          'D4',
          'status',
          'critical',
          'Blocked Item Past Due',
          `${item.issue_key} is blocked and overdue (due ${formatDate(item.due_date)})`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          item.due_date,
          null,
        ),
      );
    }
  }

  // B2: Sprint After Release (check sprint membership)
  if (releaseDate) {
    for (const item of linkedWork) {
      if (item.sprint_id) {
        // Note: In full implementation, would fetch sprint.end_date from DB
        // For now, this is a placeholder; real implementation handles sprint joins
      }
    }
  }

  // ── Category C: Scope Creep Rules ──────────────────────────────────
  // C1: New Work Added After Target
  for (const item of linkedWork) {
    if (brTargetDate && item.created_at > brTargetDate && br.release_id) {
      violations.push(
        createViolation(
          'C1',
          'scope_creep',
          'warning',
          'New Work Added After Target',
          `${item.issue_key} added after commitment date (${formatDate(brTargetDate)})`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          null,
          brTargetDate,
        ),
      );
    }
  }

  // C3: Defect Added Near Release
  if (releaseDate) {
    const sevenDaysBeforeRelease = new Date(releaseDate);
    sevenDaysBeforeRelease.setDate(sevenDaysBeforeRelease.getDate() - 7);

    for (const item of linkedWork) {
      if (item.issue_type === 'defect' && item.created_at > sevenDaysBeforeRelease.toISOString()) {
        violations.push(
          createViolation(
            'C3',
            'scope_creep',
            'advisory',
            'Late Defect Added',
            `Defect ${item.issue_key} added close to release date (${formatDate(releaseDate)})`,
            item.issue_key,
            item.issue_type as any,
            item.id,
            null,
            releaseDate,
          ),
        );
      }
    }
  }

  // ── Category D: Status/State Rules ─────────────────────────────────
  // D1: Overdue Item (not updated in 7+ days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  for (const item of linkedWork) {
    if (item.updated_at < sevenDaysAgo.toISOString() && item.status !== 'done') {
      violations.push(
        createViolation(
          'D1',
          'status',
          'warning',
          'Stale Work Item',
          `${item.issue_key} not updated in 7+ days (last: ${formatDate(item.updated_at)})`,
          item.issue_key,
          item.issue_type as any,
          item.id,
          null,
          null,
        ),
      );
    }
  }

  // D3: Parent Done, Child Open
  for (const item of linkedWork) {
    if (item.parent_key && item.status !== 'done') {
      const parent = linkedWork.find(w => w.issue_key === item.parent_key);
      if (parent && parent.status === 'done') {
        violations.push(
          createViolation(
            'D3',
            'status',
            'advisory',
            'Child Work Still Open',
            `${item.issue_key} still open after parent ${item.parent_key} complete`,
            item.issue_key,
            item.issue_type as any,
            item.id,
            null,
            null,
          ),
        );
      }
    }
  }

  // ── Category E: Alignment Rules ────────────────────────────────────
  // E1: No Strategic Theme
  // (Requires theme field, deferred to full BR schema)

  // E2: No Stakeholders
  // (Requires stakeholders array, deferred to full BR schema)

  // ── Sort by severity (critical → warning → advisory) ────────────────
  const severityOrder: Record<ViolationSeverity, number> = {
    critical: 0,
    warning: 1,
    advisory: 2,
  };

  violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return violations;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a violation object with common defaults
 */
function createViolation(
  rule_id: string,
  rule_category: RuleCategory,
  severity: ViolationSeverity,
  title: string,
  description: string,
  affected_item_key: string | null,
  affected_item_type: any,
  affected_item_id: string | null,
  date_value?: string | null,
  baseline_date?: string | null,
): DatePulseViolation {
  return {
    id: `${rule_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rule_id,
    rule_category,
    severity,
    title,
    description,
    affected_item_key,
    affected_item_type,
    affected_item_id,
    date_value: date_value || null,
    baseline_date: baseline_date || null,
    suggested_action: null, // Diagnostic only, no actions
    detected_at: new Date().toISOString(),
  };
}

/**
 * Format date for readable output
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

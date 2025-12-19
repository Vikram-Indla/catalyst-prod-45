/**
 * Dependency Framework Validation Logic
 */

import type { 
  WorkItemDependencyType, 
  DependencyLevelV2, 
  DependencyStatus,
  DependencyFormData 
} from './types';

/**
 * Derive dependency level from work item types
 */
export function deriveDependencyLevel(
  requestingType: WorkItemDependencyType | null,
  dependsOnType: WorkItemDependencyType | null
): DependencyLevelV2 | null {
  if (!requestingType || !dependsOnType) return null;
  
  if (requestingType === 'epic' && dependsOnType === 'epic') {
    return 'execution';
  }
  if (requestingType === 'feature' && dependsOnType === 'feature') {
    return 'delivery';
  }
  return 'cross_level';
}

/**
 * Check if a dependency is a cross-level exception
 */
export function isCrossLevelException(
  requestingType: WorkItemDependencyType | null,
  dependsOnType: WorkItemDependencyType | null
): boolean {
  return deriveDependencyLevel(requestingType, dependsOnType) === 'cross_level';
}

/**
 * Derive quarter from a date string
 */
export function deriveQuarterFromDate(dateString: string | null): string | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  const year = date.getFullYear();
  
  return `Q${quarter} ${year}`;
}

/**
 * Validate quarter format
 */
export function isValidQuarter(quarter: string): boolean {
  return /^Q[1-4] \d{4}$/.test(quarter);
}

/**
 * Validate that committed_by_date is required for certain statuses
 */
export function validateCommitmentDate(
  status: DependencyStatus | null,
  committedByDate: string | null,
  committedBySprintId: string | null
): { valid: boolean; error?: string } {
  const requiresCommitment: DependencyStatus[] = [
    'pending_commit',
    'committed',
    'in_progress',
    'delivered',
  ];
  
  if (status && requiresCommitment.includes(status)) {
    if (!committedByDate && !committedBySprintId) {
      return {
        valid: false,
        error: 'Commitment date or sprint is required when status is Pending Commit or beyond',
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validate that needed_by_date aligns with quarter
 */
export function validateQuarterDateAlignment(
  quarter: string | null,
  neededByDate: string | null,
  quarterDerivedFromDate: boolean
): { valid: boolean; warning?: string } {
  if (!quarter || !neededByDate) return { valid: true };
  if (quarterDerivedFromDate) return { valid: true }; // Auto-derived, skip validation
  
  const derivedQuarter = deriveQuarterFromDate(neededByDate);
  if (derivedQuarter && derivedQuarter !== quarter) {
    return {
      valid: true, // Allow mismatch but warn
      warning: `Needed-by date (${neededByDate}) falls in ${derivedQuarter}, but quarter is set to ${quarter}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate the entire dependency form
 */
export function validateDependencyForm(
  data: Partial<DependencyFormData>
): { valid: boolean; errors: Record<string, string>; warnings: Record<string, string> } {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  
  // Required fields
  if (!data.requesting_work_item_id) {
    errors.requesting_work_item_id = 'Requesting work item is required';
  }
  if (!data.requesting_work_item_type) {
    errors.requesting_work_item_type = 'Requesting work item type is required';
  }
  if (!data.depends_on_work_item_id) {
    errors.depends_on_work_item_id = 'Depends on work item is required';
  }
  if (!data.depends_on_work_item_type) {
    errors.depends_on_work_item_type = 'Depends on work item type is required';
  }
  if (!data.needed_by_date) {
    errors.needed_by_date = 'Needed-by date is required';
  }
  if (!data.type) {
    errors.type = 'Dependency type is required';
  }
  if (!data.risk_level) {
    errors.risk_level = 'Risk level is required';
  }
  
  // Cross-level warning
  if (isCrossLevelException(data.requesting_work_item_type || null, data.depends_on_work_item_type || null)) {
    warnings.dependency_level = 'This is a cross-level dependency (Epic ↔ Feature). These are exceptions and should be documented.';
  }
  
  // Commitment validation
  const commitmentResult = validateCommitmentDate(
    data.status || null,
    data.committed_by_date || null,
    data.committed_by_sprint_id || null
  );
  if (!commitmentResult.valid && commitmentResult.error) {
    errors.committed_by_date = commitmentResult.error;
  }
  
  // Blocked state validation
  if (data.source_blocked && !data.source_blocked_reason) {
    warnings.source_blocked_reason = 'Please provide a reason for the blocked state';
  }
  if (data.target_delayed && !data.target_delayed_reason) {
    warnings.target_delayed_reason = 'Please provide a reason for the delayed state';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate quarter options for dropdowns
 */
export function generateQuarterOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const quarters: string[] = [];
  
  for (let year = currentYear - 1; year <= currentYear + 2; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`Q${q} ${year}`);
    }
  }
  
  return quarters;
}

/**
 * Get current quarter
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
}

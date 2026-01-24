/**
 * Unified Test Case Duration Calculation
 * Single source of truth for estimated duration across all components
 */

interface TestCaseForDuration {
  estimated_time?: number | null; // Case-level estimate in minutes (from DB)
  estimated_duration_minutes?: number | null; // Alternative field name
  steps?: unknown[] | null; // Accept any array of steps - we just need the count
}

/** Default minutes per step for manual test execution */
const DEFAULT_MINUTES_PER_STEP = 2.5;

/**
 * Calculate estimated duration for a test case
 * Priority:
 * 1. Use explicit case-level estimate if set
 * 2. Fallback to steps.length × 2.5 min
 * 
 * @returns Duration in minutes, or null if no estimate possible
 */
export function calculateEstimatedDuration(testCase: TestCaseForDuration): number | null {
  // Priority 1: Explicit case-level estimate
  const caseEstimate = testCase.estimated_time ?? testCase.estimated_duration_minutes;
  if (caseEstimate != null && caseEstimate > 0) {
    return caseEstimate;
  }

  // Priority 2: Calculate from steps count
  const steps = testCase.steps;
  if (!steps || steps.length === 0) {
    return null;
  }

  // Default calculation: 2.5 min per step
  return steps.length * DEFAULT_MINUTES_PER_STEP;
}

/**
 * Format duration for display
 * @param minutes Duration in minutes
 * @returns Formatted string like "2.5 min" or "1h 30m"
 */
export function formatDurationDisplay(minutes: number | null): string {
  if (minutes == null) {
    return '—';
  }
  
  if (minutes < 60) {
    // Show decimal for values under 60 min
    const rounded = Math.round(minutes * 10) / 10;
    return `${rounded} min`;
  }
  
  // Convert to hours + minutes for longer durations
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

/**
 * Get estimated duration with formatted display string
 * Convenience function combining calculation and formatting
 */
export function getEstimatedDurationDisplay(testCase: TestCaseForDuration): string {
  const minutes = calculateEstimatedDuration(testCase);
  return formatDurationDisplay(minutes);
}

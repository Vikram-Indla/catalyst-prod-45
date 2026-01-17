/**
 * Test Cycle Adapter
 * Converts TMCycle (Supabase) to UI TestCycle format
 */

import { TMCycle } from '@/types/test-management';
import { TestCycle } from '@/data/testCyclesData';

/**
 * Map TMCycle status to UI status
 */
function mapStatus(status: TMCycle['status']): TestCycle['status'] {
  const map: Record<string, TestCycle['status']> = {
    'PLANNED': 'planned',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'aborted',
  };
  return map[status] || 'planned';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

/**
 * Generate initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Convert single TMCycle to UI TestCycle
 */
export function tmToUICycle(cycle: TMCycle): TestCycle {
  const total = cycle.total_cases || 0;
  const passed = cycle.passed_count || 0;
  const failed = cycle.failed_count || 0;
  const blocked = cycle.blocked_count || 0;
  const notRun = cycle.not_run_count || 0;
  const executed = passed + failed + blocked;
  const progress = total > 0 ? Math.round((executed / total) * 100) : 0;

  // Calculate duration (placeholder - would need actual run data)
  const duration = cycle.actual_start_date && cycle.actual_end_date
    ? calculateDuration(cycle.actual_start_date, cycle.actual_end_date)
    : '-';

  return {
    id: cycle.key || cycle.id,
    name: cycle.name,
    releaseId: '', // Not directly mapped - would need release table
    releaseName: '',
    environment: (cycle.environment as TestCycle['environment']) || 'staging',
    status: mapStatus(cycle.status),
    progress,
    totalTests: total,
    passedTests: passed,
    failedTests: failed,
    skippedTests: 0,
    pendingTests: notRun,
    duration,
    assignee: {
      name: 'Unassigned',
      initials: 'UA',
      color: 'gray',
    },
    createdAt: formatDate(cycle.created_at),
    updatedAt: formatRelativeTime(cycle.updated_at),
    startDate: cycle.planned_start_date || cycle.actual_start_date,
    endDate: cycle.planned_end_date || cycle.actual_end_date,
    // Store original ID for mutations
    _originalId: cycle.id,
    _projectId: cycle.project_id,
  };
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(start: string, end: string): string {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  } catch {
    return '-';
  }
}

/**
 * Convert array of TMCycle to UI TestCycle[]
 */
export function tmToUICycles(cycles: TMCycle[]): TestCycle[] {
  return cycles.map(tmToUICycle);
}

/**
 * Extended TestCycle with original IDs for mutations
 */
declare module '@/data/testCyclesData' {
  interface TestCycle {
    _originalId?: string;
    _projectId?: string;
  }
}

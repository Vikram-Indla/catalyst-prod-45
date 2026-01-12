/**
 * Test Case Type Adapter
 * Maps between API TestCase type and UI TestCase type
 */

import type { TestCase as ApiTestCase, CaseStatus, ExecutionStatus, Priority } from '@/modules/test-management/api/types';
import type { TestCase as UITestCase } from '@/data/testCasesData';

// Avatar colors for assignees
const avatarColors: Array<'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red'> = [
  'blue', 'green', 'purple', 'orange', 'teal', 'red'
];

// Get consistent color based on user id
function getAvatarColor(userId?: string): 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red' {
  if (!userId) return 'blue';
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

// Get initials from name
function getInitials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Map API status to UI status
function mapStatus(status: CaseStatus): UITestCase['status'] {
  const statusMap: Record<CaseStatus, UITestCase['status']> = {
    draft: 'draft',
    ready: 'ready',
    approved: 'approved',
    needs_update: 'draft',
    deprecated: 'deprecated',
  };
  return statusMap[status] || 'draft';
}

// Map API priority to UI priority
function mapPriority(priority?: Priority | null): UITestCase['priority'] {
  if (!priority) return 'medium';
  return priority as UITestCase['priority'];
}

// Map execution status to lastRun
function mapLastRun(status?: ExecutionStatus | null): UITestCase['lastRun'] {
  if (!status) return 'not_run';
  const runMap: Record<ExecutionStatus, UITestCase['lastRun']> = {
    not_run: 'not_run',
    in_progress: 'not_run',
    passed: 'passed',
    failed: 'failed',
    blocked: 'failed',
    skipped: 'not_run',
  };
  return runMap[status] || 'not_run';
}

// Map case type name to UI type
function mapType(typeName?: string): UITestCase['type'] {
  if (!typeName) return 'functional';
  const typeMap: Record<string, UITestCase['type']> = {
    'Functional': 'functional',
    'Regression': 'regression',
    'Smoke': 'smoke',
    'Integration': 'integration',
    'E2E': 'e2e',
    'End-to-End': 'e2e',
    'functional': 'functional',
    'regression': 'regression',
    'smoke': 'smoke',
    'integration': 'integration',
    'e2e': 'e2e',
  };
  return typeMap[typeName] || 'functional';
}

// Format date to relative time
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Convert API TestCase to UI TestCase
 */
export function apiToUITestCase(apiCase: ApiTestCase): UITestCase {
  const ownerName = apiCase.owner_name || apiCase.created_by_profile?.full_name || 'Unknown';
  
  return {
    id: apiCase.case_key || apiCase.id,
    title: apiCase.title,
    release: 'REL-26.01.01', // TODO: Map from actual release data when available
    type: mapType(apiCase.case_type?.name),
    priority: mapPriority(apiCase.priority?.name?.toLowerCase() as Priority),
    status: mapStatus(apiCase.status),
    steps: apiCase._stepCount || apiCase.steps?.length || 0,
    lastRun: mapLastRun(apiCase._lastRunStatus),
    assignee: {
      name: ownerName,
      avatar: getInitials(ownerName),
      color: getAvatarColor(apiCase.owner_id),
    },
    updated: formatRelativeTime(apiCase.updated_at),
  };
}

/**
 * Convert UI TestCase back to API CreateTestCaseInput
 */
export function uiToApiTestCaseInput(
  uiCase: Partial<UITestCase>,
  projectId: string
): Partial<{
  project_id: string;
  title: string;
  status: CaseStatus;
}> {
  return {
    project_id: projectId,
    title: uiCase.title,
    status: uiCase.status as CaseStatus,
  };
}

/**
 * Batch convert API test cases to UI format
 */
export function apiToUITestCases(apiCases: ApiTestCase[]): UITestCase[] {
  return apiCases.map(apiToUITestCase);
}

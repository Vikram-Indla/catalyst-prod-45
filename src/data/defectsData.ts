// ============================================================================
// Defects Data Types and Utilities
// File: /data/defectsData.ts
// NOTE: No mock data - all defects come from database
// ============================================================================

export interface Defect {
  id: string;
  title: string;
  description: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
  status: string;
  releaseId: string;
  releaseName?: string;
  linkedTestId: string | null;
  linkedStepId: string | null;
  assignee: {
    name: string;
    initials: string;
    color: string;
  };
  reporter: {
    name: string;
    initials: string;
    color: string;
  };
  createdAt: string;
  updatedAt: string;
  priority?: string;
  defectType?: string;
  module?: string;
  environment?: string;
  browser?: string;
  os?: string;
  device?: string;
  url?: string;
  howDetected?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
}

// Empty array - no mock data
export const defectsData: Defect[] = [];

// Filter options - these are static UI options, not mock data
export const releaseOptions = [
  { value: 'all', label: 'All Releases' },
];

export const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

export const severityOptions = [
  { value: 'all', label: 'All Severity' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'trivial', label: 'Trivial' },
];

export const assigneeOptions = [
  { value: 'all', label: 'All Assignees' },
  { value: 'unassigned', label: 'Unassigned' },
];

export const testCaseOptions = [
  { value: 'none', label: 'None' },
];

export const getAssigneeById = (id: string) => {
  // Default fallback when no user data available
  return { name: 'Unassigned', initials: '?', color: 'gray' };
};

// ============================================================================
// Defects Sample Data
// File: /data/defectsData.ts
// ============================================================================

export interface Defect {
  id: string;
  title: string;
  description: string;
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'trivial';
  status: string; // Now supports 16 workflow statuses
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
  // Extended fields for enterprise-grade defect tracking
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

export const defectsData: Defect[] = [
  {
    id: "DEF-089",
    title: "Payment timeout on slow connections",
    description: "Users on 3G connections experience payment timeout after 15 seconds",
    severity: "critical",
    status: "todo", // NEW: was "open"
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    linkedTestId: "TC-006",
    linkedStepId: "step-4",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    reporter: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "2 hours ago",
    updatedAt: "30 min ago"
  },
  {
    id: "DEF-088",
    title: "Login button unresponsive on Safari iOS",
    description: "Sign In button requires multiple taps on Safari iOS 17",
    severity: "blocker",
    status: "under_implementation", // NEW: was "in_progress"
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-001",
    linkedStepId: "step-4",
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    reporter: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "5 hours ago",
    updatedAt: "1 hour ago"
  },
  {
    id: "DEF-087",
    title: "Dashboard charts not loading in dark mode",
    description: "Chart.js components fail to render when dark mode is enabled",
    severity: "major",
    status: "ready_for_qa", // NEW: in QA
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-013",
    linkedStepId: null,
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    reporter: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "1 day ago",
    updatedAt: "6 hours ago"
  },
  {
    id: "DEF-086",
    title: "Export CSV missing date column",
    description: "Transaction export to CSV omits the transaction_date field",
    severity: "major",
    status: "uat_ready", // NEW: in release pipeline
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    linkedTestId: "TC-009",
    linkedStepId: "step-3",
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    reporter: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "2 days ago",
    updatedAt: "1 day ago"
  },
  {
    id: "DEF-085",
    title: "Password visibility toggle missing",
    description: "Show/hide password icon not rendering on password fields",
    severity: "minor",
    status: "in_production", // NEW: deployed
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-003",
    linkedStepId: "step-2",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    reporter: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "3 days ago",
    updatedAt: "2 days ago"
  },
  {
    id: "DEF-084",
    title: "Session not persisting after browser refresh",
    description: "User is logged out when refreshing the page",
    severity: "critical",
    status: "blocked", // NEW: blocked status
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-004",
    linkedStepId: null,
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    reporter: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "3 days ago",
    updatedAt: "5 hours ago"
  },
  {
    id: "DEF-083",
    title: "API rate limit message unclear",
    description: "429 error shows generic message instead of retry time",
    severity: "minor",
    status: "awaiting_info", // NEW: awaiting info
    releaseId: "REL-25.12.01",
    releaseName: "Security Patch",
    linkedTestId: "TC-010",
    linkedStepId: "step-5",
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    reporter: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "4 days ago",
    updatedAt: "4 days ago"
  },
  {
    id: "DEF-082",
    title: "Tooltip text truncated on mobile",
    description: "Info tooltips cut off on screens smaller than 375px",
    severity: "trivial",
    status: "closed",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: null,
    linkedStepId: null,
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    reporter: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "5 days ago",
    updatedAt: "4 days ago"
  },
  {
    id: "DEF-081",
    title: "Incorrect currency formatting for SAR",
    description: "Saudi Riyal amounts showing wrong decimal places",
    severity: "major",
    status: "rejected", // NEW: QA rejected
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    linkedTestId: "TC-006",
    linkedStepId: "step-7",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    reporter: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "5 days ago",
    updatedAt: "3 days ago"
  },
  {
    id: "DEF-080",
    title: "Filter state lost on page navigation",
    description: "Applied filters reset when navigating away and back",
    severity: "minor",
    status: "retest", // NEW: in retest
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-014",
    linkedStepId: null,
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    reporter: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "1 week ago",
    updatedAt: "2 days ago"
  },
  {
    id: "DEF-079",
    title: "File upload fails for files > 5MB",
    description: "Large file uploads timeout without error message",
    severity: "major",
    status: "in_beta", // NEW: in beta
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    linkedTestId: null,
    linkedStepId: null,
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    reporter: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "1 week ago",
    updatedAt: "5 days ago"
  },
  {
    id: "DEF-078",
    title: "Notification bell count incorrect",
    description: "Badge shows wrong number of unread notifications",
    severity: "trivial",
    status: "monitor", // NEW: monitoring in production
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: null,
    linkedStepId: null,
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    reporter: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "1 week ago",
    updatedAt: "6 days ago"
  },
  {
    id: "DEF-077",
    title: "CSRF token validation failing intermittently",
    description: "Form submissions randomly fail with 403 error",
    severity: "blocker",
    status: "closed", // Changed to closed
    releaseId: "REL-25.12.01",
    releaseName: "Security Patch",
    linkedTestId: "TC-011",
    linkedStepId: "step-2",
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    reporter: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "2 weeks ago",
    updatedAt: "1 week ago"
  },
  {
    id: "DEF-076",
    title: "Email validation accepts invalid formats",
    description: "Form accepts emails without proper TLD",
    severity: "minor",
    status: "in_progress",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: "TC-002",
    linkedStepId: "step-2",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    reporter: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "2 weeks ago",
    updatedAt: "4 days ago"
  },
  {
    id: "DEF-075",
    title: "Print stylesheet missing",
    description: "Reports print without proper formatting",
    severity: "trivial",
    status: "open",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    linkedTestId: null,
    linkedStepId: null,
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    reporter: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "2 weeks ago",
    updatedAt: "2 weeks ago"
  }
];

export const releaseOptions = [
  { value: 'all', label: 'All Releases' },
  { value: 'REL-26.01.01', label: 'REL-26.01.01 - Investment Portal Q1' },
  { value: 'REL-26.01.02', label: 'REL-26.01.02 - Licensing Module v2' },
  { value: 'REL-25.12.01', label: 'REL-25.12.01 - Security Patch' },
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
  { value: 'VS', label: 'Vikram S.' },
  { value: 'AA', label: 'Ahmed A.' },
  { value: 'SK', label: 'Sara K.' },
  { value: 'MR', label: 'Mohammed R.' },
  { value: 'unassigned', label: 'Unassigned' },
];

export const testCaseOptions = [
  { value: 'none', label: 'None' },
  { value: 'TC-001', label: 'TC-001 - User login with valid credentials' },
  { value: 'TC-002', label: 'TC-002 - User login with invalid password' },
  { value: 'TC-006', label: 'TC-006 - Payment processing' },
  { value: 'TC-009', label: 'TC-009 - Export transactions' },
  { value: 'TC-010', label: 'TC-010 - API rate limiting' },
];

export const getAssigneeById = (id: string) => {
  const assignees: Record<string, { name: string; initials: string; color: string }> = {
    'VS': { name: 'Vikram S.', initials: 'VS', color: 'blue' },
    'AA': { name: 'Ahmed A.', initials: 'AA', color: 'green' },
    'SK': { name: 'Sara K.', initials: 'SK', color: 'purple' },
    'MR': { name: 'Mohammed R.', initials: 'MR', color: 'orange' },
  };
  return assignees[id] || { name: 'Unassigned', initials: '?', color: 'gray' };
};

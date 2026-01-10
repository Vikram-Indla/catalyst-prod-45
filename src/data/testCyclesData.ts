export interface TestCycle {
  id: string;
  name: string;
  releaseId: string;
  releaseName: string;
  environment: 'dev' | 'beta' | 'staging' | 'uat' | 'production';
  status: 'planned' | 'in_progress' | 'completed' | 'aborted';
  progress: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
  duration: string;
  assignee: {
    name: string;
    initials: string;
    color: string;
  };
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
}

export const testCycles: TestCycle[] = [
  // In Progress (4)
  {
    id: "CY-26.01.01-01",
    name: "Smoke Testing",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    environment: "staging",
    status: "in_progress",
    progress: 45,
    totalTests: 40,
    passedTests: 16,
    failedTests: 2,
    skippedTests: 0,
    pendingTests: 22,
    duration: "2h 15m",
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "Jan 5, 2026",
    updatedAt: "10 min ago",
    startDate: "2026-01-05",
    endDate: "2026-01-12"
  },
  {
    id: "CY-26.01.01-02",
    name: "Regression Suite",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    environment: "staging",
    status: "in_progress",
    progress: 78,
    totalTests: 80,
    passedTests: 58,
    failedTests: 4,
    skippedTests: 0,
    pendingTests: 18,
    duration: "6h 42m",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "Jan 6, 2026",
    updatedAt: "2 hours ago",
    startDate: "2026-01-06",
    endDate: "2026-01-14"
  },
  {
    id: "CY-26.01.02-01",
    name: "Integration Tests",
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    environment: "dev",
    status: "in_progress",
    progress: 22,
    totalTests: 50,
    passedTests: 9,
    failedTests: 2,
    skippedTests: 0,
    pendingTests: 39,
    duration: "1h 30m",
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "Jan 8, 2026",
    updatedAt: "30 min ago",
    startDate: "2026-01-08",
    endDate: "2026-01-15"
  },
  {
    id: "CY-26.01.01-04",
    name: "Performance Testing",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    environment: "staging",
    status: "in_progress",
    progress: 15,
    totalTests: 25,
    passedTests: 3,
    failedTests: 1,
    skippedTests: 0,
    pendingTests: 21,
    duration: "45m",
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "Jan 10, 2026",
    updatedAt: "5 min ago",
    startDate: "2026-01-10",
    endDate: "2026-01-17"
  },
  
  // Planned (2)
  {
    id: "CY-26.01.01-03",
    name: "UAT Sign-off",
    releaseId: "REL-26.01.01",
    releaseName: "Investment Portal Q1",
    environment: "production",
    status: "planned",
    progress: 0,
    totalTests: 36,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    pendingTests: 36,
    duration: "-",
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "Jan 9, 2026",
    updatedAt: "1 day ago",
    startDate: "2026-01-18",
    endDate: "2026-01-22"
  },
  {
    id: "CY-26.01.02-02",
    name: "Security Scan",
    releaseId: "REL-26.01.02",
    releaseName: "Licensing Module v2",
    environment: "staging",
    status: "planned",
    progress: 0,
    totalTests: 18,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    pendingTests: 18,
    duration: "-",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "Jan 10, 2026",
    updatedAt: "3 hours ago",
    startDate: "2026-01-20",
    endDate: "2026-01-24"
  },
  
  // Completed (6)
  {
    id: "CY-25.12.01-01",
    name: "Security Validation",
    releaseId: "REL-25.12.01",
    releaseName: "Security Patch",
    environment: "staging",
    status: "completed",
    progress: 100,
    totalTests: 24,
    passedTests: 23,
    failedTests: 1,
    skippedTests: 0,
    pendingTests: 0,
    duration: "3h 20m",
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "Dec 18, 2025",
    updatedAt: "Dec 22, 2025",
    startDate: "2025-12-18",
    endDate: "2025-12-22"
  },
  {
    id: "CY-25.12.01-02",
    name: "Penetration Testing",
    releaseId: "REL-25.12.01",
    releaseName: "Security Patch",
    environment: "staging",
    status: "completed",
    progress: 100,
    totalTests: 15,
    passedTests: 15,
    failedTests: 0,
    skippedTests: 0,
    pendingTests: 0,
    duration: "5h 10m",
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "Dec 19, 2025",
    updatedAt: "Dec 24, 2025",
    startDate: "2025-12-19",
    endDate: "2025-12-24"
  },
  {
    id: "CY-25.12.01-03",
    name: "Final Sign-off",
    releaseId: "REL-25.12.01",
    releaseName: "Security Patch",
    environment: "production",
    status: "completed",
    progress: 100,
    totalTests: 12,
    passedTests: 12,
    failedTests: 0,
    skippedTests: 0,
    pendingTests: 0,
    duration: "1h 45m",
    assignee: { name: "Sara K.", initials: "SK", color: "purple" },
    createdAt: "Dec 26, 2025",
    updatedAt: "Jan 2, 2026",
    startDate: "2025-12-26",
    endDate: "2026-01-02"
  },
  {
    id: "CY-25.11.01-01",
    name: "Q4 Regression",
    releaseId: "REL-25.11.01",
    releaseName: "Q4 Release",
    environment: "staging",
    status: "completed",
    progress: 100,
    totalTests: 95,
    passedTests: 89,
    failedTests: 6,
    skippedTests: 0,
    pendingTests: 0,
    duration: "12h 30m",
    assignee: { name: "Ahmed A.", initials: "AA", color: "green" },
    createdAt: "Nov 20, 2025",
    updatedAt: "Nov 28, 2025",
    startDate: "2025-11-20",
    endDate: "2025-11-28"
  },
  {
    id: "CY-25.11.01-02",
    name: "API Contract Tests",
    releaseId: "REL-25.11.01",
    releaseName: "Q4 Release",
    environment: "dev",
    status: "completed",
    progress: 100,
    totalTests: 45,
    passedTests: 44,
    failedTests: 1,
    skippedTests: 0,
    pendingTests: 0,
    duration: "4h 15m",
    assignee: { name: "Vikram S.", initials: "VS", color: "blue" },
    createdAt: "Nov 18, 2025",
    updatedAt: "Nov 22, 2025",
    startDate: "2025-11-18",
    endDate: "2025-11-22"
  },
  {
    id: "CY-25.10.01-01",
    name: "October Smoke",
    releaseId: "REL-25.10.01",
    releaseName: "October Patch",
    environment: "staging",
    status: "completed",
    progress: 100,
    totalTests: 30,
    passedTests: 28,
    failedTests: 2,
    skippedTests: 0,
    pendingTests: 0,
    duration: "2h 50m",
    assignee: { name: "Mohammed R.", initials: "MR", color: "orange" },
    createdAt: "Oct 15, 2025",
    updatedAt: "Oct 20, 2025",
    startDate: "2025-10-15",
    endDate: "2025-10-20"
  }
];

export const releaseOptions = [
  { value: 'all', label: 'All Releases' },
  { value: 'REL-26.01.01', label: 'REL-26.01.01 - Investment Portal' },
  { value: 'REL-26.01.02', label: 'REL-26.01.02 - Licensing Module' },
  { value: 'REL-25.12.01', label: 'REL-25.12.01 - Security Patch' },
  { value: 'REL-25.11.01', label: 'REL-25.11.01 - Q4 Release' },
  { value: 'REL-25.10.01', label: 'REL-25.10.01 - October Patch' },
];

export const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'aborted', label: 'Aborted' },
];

export const environmentOptions = [
  { value: 'all', label: 'All Environments' },
  { value: 'dev', label: 'Development' },
  { value: 'beta', label: 'Beta' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'production', label: 'Production' },
];

export const assigneeOptions = [
  { value: 'VS', label: 'Vikram S.', initials: 'VS', color: 'blue' },
  { value: 'AA', label: 'Ahmed A.', initials: 'AA', color: 'green' },
  { value: 'SK', label: 'Sara K.', initials: 'SK', color: 'purple' },
  { value: 'MR', label: 'Mohammed R.', initials: 'MR', color: 'orange' },
];

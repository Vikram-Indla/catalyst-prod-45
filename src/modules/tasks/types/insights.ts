// ============================================================
// PLANNER INSIGHTS - TYPE DEFINITIONS
// Data models for Weekly Summary, Daily Scorecard, Monthly Chronicle
// ============================================================

// ==================== WEEKLY SUMMARY ====================
export interface WeeklyReportData {
  period: { start: Date; end: Date };
  projects: string[];
  
  // KPIs
  storiesAdded: number;
  storiesDelivered: number;
  featuresDelivered: number;
  changeRequests: { total: number; approved: number; pending: number; rejected: number; draft: number };
  incidents: { total: number; sev1: number; sev2: number; sev3: number; resolved: number };
  defects: { total: number; critical: number; major: number; minor: number; fixed: number };
  
  // Releases
  releases: Array<{
    id: string;
    version: string;
    type: 'production' | 'hotfix';
    deployedAt: Date;
    project: string;
    features: number;
    stories: number;
  }>;
  
  // Incidents
  incidentItems: Array<{
    id: string;
    title: string;
    severity: 'sev1' | 'sev2' | 'sev3';
    project: string;
    assignee: string;
    status: 'open' | 'investigating' | 'resolved';
    mttr?: string;
  }>;
  
  // Defects
  defectItems: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'major' | 'minor';
    project: string;
    assignee: string;
    status: 'open' | 'in-progress' | 'fixed';
  }>;
  
  // Features
  features: Array<{
    id: string;
    title: string;
    storiesCompleted: number;
    storiesTotal: number;
    status: 'done' | 'in-dev' | 'in-qa' | 'blocked';
  }>;
  
  // Change Requests
  changeRequestItems: Array<{
    id: string;
    title: string;
    impact: string;
    project: string;
    status: 'approved' | 'pending' | 'rejected' | 'draft';
  }>;
  
  // Stories Scribed
  scribedStories: Array<{
    id: string;
    title: string;
    scribedBy: string;
    scribedById: string;
    project: string;
    points: number;
  }>;
  
  // Team Members
  teamMembers: Array<{
    id: string;
    name: string;
    initials: string;
    color: string;
    storiesAssigned: string[];
    subtasksDone: number;
    subtasksActive: number;
    completionPercent: number;
  }>;
  
  // Project Performance
  projectPerformance: Array<{
    id: string;
    name: string;
    color: string;
    features: number;
    storiesDelivered: number;
    defectsTracked: number;
    testsExecuted: number;
    incidentsResolved: number;
  }>;
}

// ==================== DAILY SCORECARD ====================
export interface DailyScorecardData {
  period: { date: Date; label: string };
  summary: {
    workstreams: number;
    totalTasks: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  workstreams: Array<{
    id: string;
    name: string;
    initial: string;
    gradient: { from: string; to: string };
    memberCount: number;
    taskCount: number;
    completionRate: number;
    members: Array<{
      id: string;
      name: string;
      initials: string;
      avatarColor: string;
      role: string;
      tasksDone: number;
      tasksActive: number;
      tasksOverdue: number;
      completionPercent: number;
    }>;
  }>;
}

// ==================== MONTHLY CHRONICLE ====================
export interface MonthlyChronicleData {
  period: { month: string; year: number; edition: number };
  headline: string;
  subhead: string;
  
  ideas: {
    funnel: { submitted: number; underReview: number; approved: number; converted: number };
    items: Array<{ id: string; title: string; submittedBy: string; votes: number; convertedTo?: string; project: string; status: string }>;
  };
  
  businessRequests: {
    funnel: { submitted: number; inReview: number; approved: number; epics: number };
    items: Array<{ id: string; title: string; source: string; priority: string; epicId?: string; project: string }>;
  };
  
  themes: {
    health: { onTrack: number; total: number };
    objectives: { onTrack: number; total: number };
    keyResults: { onTrack: number; total: number; atRisk: number };
    risks: { active: number; mitigated: number };
    items: Array<{ id: string; name: string; objectives: number; epics: number; progress: number; status: string; projects: string[] }>;
  };
  
  okrs: Array<{ id: string; title: string; keyResults: number; dueDate: Date; owner: string; project: string; progress: number; status: string }>;
  
  releases: {
    count: number;
    storiesTrend: number[];
    featuresTrend: number[];
    items: Array<{ id: string; version: string; type: string; features: number; stories: number; date: Date; projects: string[] }>;
  };
  
  incidents: {
    trend: number[];
    reductionPercent: number;
    items: Array<{ id: string; title: string; severity: string; status: string; mttr?: string; project: string }>;
  };
  
  testCycles: {
    passRate: number;
    testsRun: number;
    defectsFound: number;
    defectsFixed: number;
    items: Array<{ id: string; name: string; testCases: number; passRate: number; date: Date; project: string; qaLead: string }>;
  };
}

// ==================== COMMON TYPES ====================
export type InsightView = 'weekly' | 'daily' | 'monthly';

export type PeriodOption = {
  value: string;
  label: string;
};

export const PERIOD_OPTIONS: Record<InsightView, PeriodOption[]> = {
  weekly: [
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
  ],
  daily: [
    { value: 'today', label: 'Today' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-sprint', label: 'This Sprint' },
  ],
  monthly: [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
  ],
};

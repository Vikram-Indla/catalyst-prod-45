// ============================================================
// PLANNER INSIGHTS - MOCK DATA
// Sample data for development and demos
// ============================================================

import type { WeeklyReportData, DailyScorecardData, MonthlyChronicleData } from '../types/insights';

export const sampleWeeklyData: WeeklyReportData = {
  period: { start: new Date('2026-01-06'), end: new Date('2026-01-12') },
  projects: ['Senaei BAU', 'Sectorial', 'Inspection', 'Innovation', 'IR Platform'],
  storiesAdded: 24,
  storiesDelivered: 18,
  featuresDelivered: 12,
  changeRequests: { total: 7, approved: 3, pending: 2, rejected: 1, draft: 1 },
  incidents: { total: 4, sev1: 1, sev2: 2, sev3: 1, resolved: 3 },
  defects: { total: 9, critical: 2, major: 4, minor: 3, fixed: 6 },
  releases: [
    { id: 'REL-240', version: 'v2.4.0', type: 'production', deployedAt: new Date('2026-01-10T22:00:00'), project: 'Senaei BAU', features: 12, stories: 17 },
    { id: 'REL-241', version: 'v2.4.1', type: 'hotfix', deployedAt: new Date('2026-01-11T02:15:00'), project: 'Sectorial', features: 1, stories: 1 },
  ],
  incidentItems: [
    { id: 'INC-089', title: 'Payment gateway timeout during peak hours', severity: 'sev1', project: 'Senaei BAU', assignee: 'Ahmed K.', status: 'resolved', mttr: '47m' },
    { id: 'INC-090', title: 'Dashboard loading slow for large datasets', severity: 'sev2', project: 'Sectorial', assignee: 'Sara M.', status: 'investigating' },
    { id: 'INC-091', title: 'Email notifications delayed', severity: 'sev2', project: 'IR Platform', assignee: 'Omar H.', status: 'resolved' },
    { id: 'INC-092', title: 'Minor UI glitch on mobile', severity: 'sev3', project: 'Inspection', assignee: 'Fatima A.', status: 'open' },
  ],
  defectItems: [
    { id: 'DEF-234', title: 'Form validation not triggering on blur', severity: 'critical', project: 'Senaei BAU', assignee: 'Ahmed K.', status: 'fixed' },
    { id: 'DEF-235', title: 'Incorrect currency formatting in reports', severity: 'major', project: 'Sectorial', assignee: 'Sara M.', status: 'in-progress' },
    { id: 'DEF-236', title: 'Search results not paginating correctly', severity: 'major', project: 'Innovation', assignee: 'Omar H.', status: 'fixed' },
    { id: 'DEF-237', title: 'Tooltip overlap on narrow screens', severity: 'minor', project: 'Inspection', assignee: 'Fatima A.', status: 'open' },
  ],
  features: [
    { id: 'F-101', title: 'Multi-currency Support', storiesCompleted: 8, storiesTotal: 8, status: 'done' },
    { id: 'F-102', title: 'Advanced Analytics Dashboard', storiesCompleted: 5, storiesTotal: 6, status: 'in-dev' },
    { id: 'F-103', title: 'Mobile App Redesign', storiesCompleted: 3, storiesTotal: 5, status: 'in-qa' },
    { id: 'F-104', title: 'API Rate Limiting', storiesCompleted: 2, storiesTotal: 4, status: 'in-dev' },
  ],
  changeRequestItems: [
    { id: 'CR-045', title: 'Add bulk export to Excel', impact: 'Low', project: 'Senaei BAU', status: 'approved' },
    { id: 'CR-046', title: 'Modify user role permissions', impact: 'High', project: 'Sectorial', status: 'pending' },
    { id: 'CR-047', title: 'Update report templates', impact: 'Medium', project: 'Innovation', status: 'approved' },
  ],
  scribedStories: [
    { id: 'S-1001', title: 'As a user, I want to export data to CSV', scribedBy: 'Product Owner', scribedById: 'po-1', project: 'Senaei BAU', points: 3 },
    { id: 'S-1002', title: 'As an admin, I want to manage user roles', scribedBy: 'Product Owner', scribedById: 'po-1', project: 'Sectorial', points: 5 },
    { id: 'S-1003', title: 'As a user, I want real-time notifications', scribedBy: 'Product Owner', scribedById: 'po-1', project: 'IR Platform', points: 8 },
  ],
  teamMembers: [
    { id: 'tm-1', name: 'Ahmed Khalid', initials: 'AK', color: '#2563eb', storiesAssigned: ['S-1001', 'S-1004'], subtasksDone: 12, subtasksActive: 3, completionPercent: 80 },
    { id: 'tm-2', name: 'Sara Mohammed', initials: 'SM', color: '#10b981', storiesAssigned: ['S-1002', 'S-1005'], subtasksDone: 8, subtasksActive: 5, completionPercent: 62 },
    { id: 'tm-3', name: 'Omar Hassan', initials: 'OH', color: '#8b5cf6', storiesAssigned: ['S-1003'], subtasksDone: 15, subtasksActive: 2, completionPercent: 88 },
    { id: 'tm-4', name: 'Fatima Ali', initials: 'FA', color: '#f59e0b', storiesAssigned: ['S-1006', 'S-1007', 'S-1008'], subtasksDone: 6, subtasksActive: 7, completionPercent: 46 },
  ],
  projectPerformance: [
    { id: 'senaei-bau', name: 'Senaei BAU', color: '#2563eb', features: 6, storiesDelivered: 8, defectsTracked: 3, testsExecuted: 312, incidentsResolved: 1 },
    { id: 'sectorial', name: 'Sectorial', color: '#0d9488', features: 4, storiesDelivered: 4, defectsTracked: 2, testsExecuted: 198, incidentsResolved: 1 },
    { id: 'inspection', name: 'Inspection', color: '#d97706', features: 3, storiesDelivered: 3, defectsTracked: 2, testsExecuted: 156, incidentsResolved: 1 },
    { id: 'innovation', name: 'Innovation', color: '#8b5cf6', features: 3, storiesDelivered: 2, defectsTracked: 1, testsExecuted: 108, incidentsResolved: 0 },
    { id: 'ir-platform', name: 'IR Platform', color: '#10b981', features: 2, storiesDelivered: 1, defectsTracked: 1, testsExecuted: 73, incidentsResolved: 0 },
  ],
};

export const sampleDailyData: DailyScorecardData = {
  period: { date: new Date(), label: 'Today' },
  summary: {
    workstreams: 4,
    totalTasks: 48,
    completed: 32,
    overdue: 5,
    completionRate: 67,
  },
  workstreams: [
    {
      id: 'ws-1',
      name: 'Platform Engineering',
      initial: 'P',
      gradient: { from: '#2563eb', to: '#1d4ed8' },
      memberCount: 6,
      taskCount: 18,
      completionRate: 78,
      members: [
        { id: 'm-1', name: 'Ahmed Khalid', initials: 'AK', avatarColor: '#2563eb', role: 'Tech Lead', tasksDone: 5, tasksActive: 2, tasksOverdue: 0, completionPercent: 71 },
        { id: 'm-2', name: 'Sara Mohammed', initials: 'SM', avatarColor: '#10b981', role: 'Senior Dev', tasksDone: 4, tasksActive: 3, tasksOverdue: 1, completionPercent: 57 },
        { id: 'm-3', name: 'Omar Hassan', initials: 'OH', avatarColor: '#8b5cf6', role: 'Developer', tasksDone: 6, tasksActive: 1, tasksOverdue: 0, completionPercent: 86 },
      ],
    },
    {
      id: 'ws-2',
      name: 'Product Design',
      initial: 'D',
      gradient: { from: '#8b5cf6', to: '#7c3aed' },
      memberCount: 4,
      taskCount: 12,
      completionRate: 58,
      members: [
        { id: 'm-4', name: 'Fatima Ali', initials: 'FA', avatarColor: '#f59e0b', role: 'Lead Designer', tasksDone: 3, tasksActive: 4, tasksOverdue: 2, completionPercent: 43 },
        { id: 'm-5', name: 'Youssef Ibrahim', initials: 'YI', avatarColor: '#ef4444', role: 'UX Designer', tasksDone: 4, tasksActive: 2, tasksOverdue: 1, completionPercent: 67 },
      ],
    },
    {
      id: 'ws-3',
      name: 'QA & Testing',
      initial: 'Q',
      gradient: { from: '#10b981', to: '#059669' },
      memberCount: 3,
      taskCount: 10,
      completionRate: 70,
      members: [
        { id: 'm-6', name: 'Nora Abdullah', initials: 'NA', avatarColor: '#0d9488', role: 'QA Lead', tasksDone: 5, tasksActive: 2, tasksOverdue: 0, completionPercent: 71 },
        { id: 'm-7', name: 'Khalid Mansour', initials: 'KM', avatarColor: '#64748b', role: 'Test Engineer', tasksDone: 4, tasksActive: 3, tasksOverdue: 1, completionPercent: 57 },
      ],
    },
  ],
};

export const sampleMonthlyData: MonthlyChronicleData = {
  period: { month: 'January', year: 2026, edition: 24 },
  headline: 'Platform Evolution: Q1 Sprint Delivers Core Infrastructure',
  subhead: 'This month saw significant progress across all strategic themes, with the platform team completing the multi-tenancy foundation and the product design team launching the refreshed dashboard experience.',
  
  ideas: {
    funnel: { submitted: 12, underReview: 4, approved: 6, converted: 3 },
    items: [
      { id: 'IDEA-089', title: 'AI-powered report generation', submittedBy: 'Ahmed K.', votes: 24, convertedTo: 'BR-156', project: 'Innovation', status: 'converted' },
      { id: 'IDEA-091', title: 'Mobile offline mode', submittedBy: 'Sara M.', votes: 18, project: 'Senaei BAU', status: 'approved' },
    ],
  },
  
  businessRequests: {
    funnel: { submitted: 8, inReview: 3, approved: 4, epics: 2 },
    items: [
      { id: 'BR-156', title: 'AI Report Generation Module', source: 'Ideas Hub', priority: 'High', epicId: 'E-045', project: 'Innovation' },
      { id: 'BR-157', title: 'Enhanced Security Audit Logs', source: 'Compliance', priority: 'Critical', project: 'Senaei BAU' },
    ],
  },
  
  themes: {
    health: { onTrack: 3, total: 4 },
    objectives: { onTrack: 8, total: 10 },
    keyResults: { onTrack: 18, total: 24, atRisk: 4 },
    risks: { active: 6, mitigated: 3 },
    items: [
      { id: 'TH-001', name: 'Platform Modernization', objectives: 3, epics: 8, progress: 72, status: 'on-track', projects: ['Senaei BAU', 'Sectorial'] },
      { id: 'TH-002', name: 'User Experience Excellence', objectives: 2, epics: 5, progress: 45, status: 'at-risk', projects: ['Innovation'] },
    ],
  },
  
  okrs: [
    { id: 'OBJ-012', title: 'Achieve 99.9% platform uptime', keyResults: 3, dueDate: new Date('2026-03-31'), owner: 'Ahmed K.', project: 'Senaei BAU', progress: 85, status: 'on-track' },
    { id: 'OBJ-013', title: 'Reduce page load time by 40%', keyResults: 4, dueDate: new Date('2026-02-28'), owner: 'Omar H.', project: 'Sectorial', progress: 62, status: 'at-risk' },
  ],
  
  releases: {
    count: 4,
    storiesTrend: [12, 18, 15, 22],
    featuresTrend: [4, 6, 5, 8],
    items: [
      { id: 'REL-240', version: 'v2.4.0', type: 'production', features: 12, stories: 17, date: new Date('2026-01-10'), projects: ['Senaei BAU'] },
      { id: 'REL-241', version: 'v2.4.1', type: 'hotfix', features: 1, stories: 1, date: new Date('2026-01-11'), projects: ['Senaei BAU'] },
    ],
  },
  
  incidents: {
    trend: [8, 6, 4, 3],
    reductionPercent: 62,
    items: [
      { id: 'INC-089', title: 'Payment gateway timeout', severity: 'L1', status: 'resolved', mttr: '47m', project: 'Senaei BAU' },
      { id: 'INC-090', title: 'Dashboard performance degradation', severity: 'L2', status: 'resolved', mttr: '2h 15m', project: 'Sectorial' },
    ],
  },
  
  testCycles: {
    passRate: 94.2,
    testsRun: 1847,
    defectsFound: 23,
    defectsFixed: 19,
    items: [
      { id: 'TC-2026-01', name: 'v2.4.0 Regression Suite', testCases: 456, passRate: 96.5, date: new Date('2026-01-08'), project: 'Senaei BAU', qaLead: 'Nora A.' },
      { id: 'TC-2026-02', name: 'Mobile App Smoke Tests', testCases: 124, passRate: 91.2, date: new Date('2026-01-09'), project: 'Sectorial', qaLead: 'Khalid M.' },
    ],
  },
};

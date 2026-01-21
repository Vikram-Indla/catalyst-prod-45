/**
 * Sample Data — Hierarchically-correct work items per CATALYST CONTRACT
 * ENTERPRISE: Objectives, Strategic Initiatives
 * PROGRAM: Epics ONLY
 * PROJECT: Features, Stories, Subtasks
 */

import { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority, Assignee, RecentItem, ScopeLevel } from '../types';

const assignees: Assignee[] = [
  { id: '1', name: 'Vikram Kumar', initials: 'VK', color: 'bg-blue-500' },
  { id: '2', name: 'Sarah Chen', initials: 'SC', color: 'bg-teal-500' },
  { id: '3', name: 'Ahmed Al-Rashid', initials: 'AR', color: 'bg-amber-500' },
  { id: '4', name: 'Maria Garcia', initials: 'MG', color: 'bg-purple-500' },
  { id: '5', name: 'James Wilson', initials: 'JW', color: 'bg-indigo-500' },
  { id: '6', name: 'Fatima Hassan', initials: 'FH', color: 'bg-rose-500' },
  { id: '7', name: 'David Park', initials: 'DP', color: 'bg-emerald-500' },
  { id: '8', name: 'Layla Mahmoud', initials: 'LM', color: 'bg-cyan-500' },
];

const sprints = ['PI 24.1', 'PI 24.2', 'Q1 2026', 'Q2 2026', 'Unassigned'];
const dates = ['Jan 15, 2026', 'Jan 16, 2026', 'Jan 17, 2026', 'Jan 18, 2026', 'Jan 19, 2026'];

const statuses: WorkItemStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'];
const priorities: WorkItemPriority[] = ['critical', 'high', 'medium', 'low'];

const getStatus = (i: number): WorkItemStatus => statuses[i % statuses.length];
const getPriority = (i: number): WorkItemPriority => priorities[i % priorities.length];
const getAssignee = (i: number): Assignee | null => i % 5 === 0 ? null : assignees[i % assignees.length];
const getSprint = (i: number): string => sprints[i % sprints.length];
const getDate = (i: number): string => dates[i % dates.length];

// =====================
// ENTERPRISE LEVEL DATA
// =====================
const objectiveTitles = [
  'Increase customer retention by 25%',
  'Reduce operational costs by 15%',
  'Expand to 3 new markets',
  'Achieve carbon neutrality',
  'Improve NPS score to 70+',
];

const initiativeTitles = [
  'Digital Transformation Program',
  'Customer Experience Enhancement',
  'Platform Modernization',
  'Data-Driven Decision Making',
  'Sustainability Roadmap',
];

// =====================
// PROGRAM LEVEL DATA - EPICS ONLY
// =====================
const epicTitles = [
  'Core Banking Platform Upgrade',
  'Mobile App 2.0 Release',
  'API Gateway Modernization',
  'Customer Portal Redesign',
  'Data Analytics Platform',
  'Security Compliance Framework',
  'Integration Hub Development',
  'Performance Optimization Initiative',
];

// =====================
// PROJECT LEVEL DATA
// =====================
const featureTitles = [
  'User Authentication Module',
  'Real-time Notifications',
  'Advanced Search Functionality',
  'Export to PDF/Excel',
  'Multi-language Support',
  'Role-based Access Control',
  'API Rate Limiting',
  'Dashboard Widgets',
  'Report Builder',
  'Audit Trail Logging',
];

const storyTitles = [
  'Implement login form validation',
  'Add password reset functionality',
  'Create notification center UI',
  'Build search results component',
  'Add filter persistence',
  'Implement export modal',
  'Add language selector dropdown',
  'Create role management page',
  'Add API key management',
  'Implement rate limit dashboard',
  'Add SSO integration',
  'Create user profile page',
  'Build activity timeline',
  'Add bulk operations',
  'Implement dark mode toggle',
];

const subtaskTitles = [
  'Write unit tests',
  'Add E2E tests',
  'Update API documentation',
  'Fix accessibility issues',
  'Optimize bundle size',
  'Add loading states',
  'Fix mobile responsiveness',
  'Update error messages',
];

export const generateWorkItems = (): WorkItem[] => {
  const items: WorkItem[] = [];
  let keyCounter = 100;

  // ENTERPRISE: Objectives (OBJ-XXX)
  objectiveTitles.forEach((title, i) => {
    items.push({
      id: `obj-${i}`,
      key: `OBJ-${keyCounter++}`,
      type: 'objective',
      title,
      status: getStatus(i),
      priority: getPriority(i),
      assignee: getAssignee(i),
      sprint: getSprint(i),
      createdAt: getDate(i),
      updatedAt: getDate(i),
      scopeLevel: 'enterprise',
    });
  });

  // ENTERPRISE: Strategic Initiatives (SI-XXX)
  initiativeTitles.forEach((title, i) => {
    items.push({
      id: `si-${i}`,
      key: `SI-${keyCounter++}`,
      type: 'strategic_initiative',
      title,
      status: getStatus(i + 2),
      priority: getPriority(i + 1),
      assignee: getAssignee(i + 2),
      sprint: getSprint(i + 1),
      createdAt: getDate(i + 1),
      updatedAt: getDate(i + 1),
      scopeLevel: 'enterprise',
    });
  });

  // PROGRAM: Epics ONLY (EPIC-XXX)
  epicTitles.forEach((title, i) => {
    items.push({
      id: `epic-${i}`,
      key: `EPIC-${keyCounter++}`,
      type: 'epic',
      title,
      status: getStatus(i + 3),
      priority: getPriority(i + 2),
      assignee: getAssignee(i + 3),
      sprint: getSprint(i + 2),
      createdAt: getDate(i + 2),
      updatedAt: getDate(i + 2),
      scopeLevel: 'program',
      parentKey: `OBJ-${100 + (i % objectiveTitles.length)}`,
    });
  });

  // PROJECT: Features (FEAT-XXX)
  featureTitles.forEach((title, i) => {
    items.push({
      id: `feat-${i}`,
      key: `FEAT-${keyCounter++}`,
      type: 'feature',
      title,
      status: getStatus(i + 4),
      priority: getPriority(i + 3),
      assignee: getAssignee(i + 4),
      sprint: getSprint(i + 3),
      createdAt: getDate(i + 3),
      updatedAt: getDate(i + 3),
      scopeLevel: 'project',
      parentKey: `EPIC-${110 + (i % epicTitles.length)}`,
    });
  });

  // PROJECT: Stories (STORY-XXX)
  storyTitles.forEach((title, i) => {
    items.push({
      id: `story-${i}`,
      key: `STORY-${keyCounter++}`,
      type: 'story',
      title,
      status: getStatus(i + 5),
      priority: getPriority(i),
      assignee: getAssignee(i + 5),
      sprint: getSprint(i),
      createdAt: getDate(i),
      updatedAt: getDate(i),
      scopeLevel: 'project',
      storyPoints: [1, 2, 3, 5, 8][i % 5],
      parentKey: `FEAT-${118 + (i % featureTitles.length)}`,
    });
  });

  // PROJECT: Subtasks (TASK-XXX)
  subtaskTitles.forEach((title, i) => {
    items.push({
      id: `task-${i}`,
      key: `TASK-${keyCounter++}`,
      type: 'subtask',
      title,
      status: getStatus(i),
      priority: getPriority(i + 1),
      assignee: getAssignee(i),
      sprint: getSprint(i + 1),
      createdAt: getDate(i + 1),
      updatedAt: getDate(i + 1),
      scopeLevel: 'project',
      parentKey: `STORY-${128 + (i % storyTitles.length)}`,
    });
  });

  return items;
};

export const recentItems: RecentItem[] = [
  { key: 'OBJ-100', title: 'Increase customer retention by 25%', type: 'objective' },
  { key: 'EPIC-110', title: 'Core Banking Platform Upgrade', type: 'epic' },
  { key: 'FEAT-120', title: 'User Authentication Module', type: 'feature' },
  { key: 'STORY-130', title: 'Implement login form validation', type: 'story' },
];

export const workItems = generateWorkItems();

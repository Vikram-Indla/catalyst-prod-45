/**
 * Sample Data — 45+ Work Items
 * Realistic distribution per spec
 */

import { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority, Assignee, RecentItem } from '../types';

// Assignees pool
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

const sprints = ['Sprint 24', 'Sprint 25', 'Sprint 26', 'Backlog'];

const epicTitles = [
  'Platform Modernization Initiative',
  'Customer Portal Enhancement',
  'Data Analytics Dashboard',
];

const featureTitles = [
  'User Authentication Module',
  'Real-time Notifications',
  'Advanced Search Functionality',
  'Export to PDF/Excel',
  'Multi-language Support',
  'Role-based Access Control',
  'API Rate Limiting',
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
  'Create onboarding wizard',
  'Add keyboard shortcuts',
  'Build command palette',
  'Implement lazy loading',
  'Add infinite scroll',
  'Create toast notifications',
  'Build confirmation dialogs',
  'Add form autosave',
  'Implement undo/redo',
  'Create settings panel',
];

const subtaskTitles = [
  'Write unit tests for login',
  'Add E2E tests for auth flow',
  'Update API documentation',
  'Fix accessibility issues',
  'Optimize bundle size',
  'Add loading states',
  'Fix mobile responsiveness',
  'Update error messages',
  'Add analytics tracking',
  'Write migration scripts',
];

// Distribution: 30% todo, 25% in_progress, 20% review, 20% done, 5% blocked
const getRandomStatus = (index: number): WorkItemStatus => {
  const distribution: WorkItemStatus[] = [
    'todo', 'todo', 'todo', 'todo', 'todo', 'todo',     // 30%
    'in_progress', 'in_progress', 'in_progress', 'in_progress', 'in_progress', // 25%
    'review', 'review', 'review', 'review',              // 20%
    'done', 'done', 'done', 'done',                      // 20%
    'blocked',                                            // 5%
  ];
  return distribution[index % distribution.length];
};

const priorities: WorkItemPriority[] = ['critical', 'high', 'medium', 'low'];
const getRandomPriority = (index: number): WorkItemPriority => {
  return priorities[index % priorities.length];
};

const getRandomAssignee = (index: number): Assignee | null => {
  if (index % 7 === 0) return null; // Some unassigned
  return assignees[index % assignees.length];
};

const getRandomSprint = (index: number): string => {
  return sprints[index % sprints.length];
};

const dates = [
  'Jan 15, 2026', 'Jan 16, 2026', 'Jan 17, 2026', 'Jan 18, 2026',
  'Jan 19, 2026', 'Jan 20, 2026', 'Jan 21, 2026', 'Jan 22, 2026',
];

// Generate 45+ items as per spec
export const generateWorkItems = (): WorkItem[] => {
  const items: WorkItem[] = [];
  let keyCounter = 100;

  // 3 Epics
  epicTitles.forEach((title, i) => {
    items.push({
      id: `epic-${i}`,
      key: `EPIC-${keyCounter++}`,
      type: 'epic',
      title,
      status: getRandomStatus(i),
      priority: getRandomPriority(i),
      assignee: getRandomAssignee(i),
      sprint: getRandomSprint(i),
      createdAt: dates[i % dates.length],
      updatedAt: dates[i % dates.length],
    });
  });

  // 7 Features
  featureTitles.forEach((title, i) => {
    items.push({
      id: `feat-${i}`,
      key: `FEAT-${keyCounter++}`,
      type: 'feature',
      title,
      status: getRandomStatus(i + 3),
      priority: getRandomPriority(i + 1),
      assignee: getRandomAssignee(i + 3),
      sprint: getRandomSprint(i + 1),
      createdAt: dates[(i + 1) % dates.length],
      updatedAt: dates[(i + 1) % dates.length],
      parentKey: `EPIC-${100 + (i % 3)}`,
    });
  });

  // 25 Stories
  storyTitles.forEach((title, i) => {
    items.push({
      id: `story-${i}`,
      key: `STORY-${keyCounter++}`,
      type: 'story',
      title,
      status: getRandomStatus(i + 10),
      priority: getRandomPriority(i + 2),
      assignee: getRandomAssignee(i + 10),
      sprint: getRandomSprint(i + 2),
      createdAt: dates[(i + 2) % dates.length],
      updatedAt: dates[(i + 2) % dates.length],
      parentKey: `FEAT-${103 + (i % 7)}`,
    });
  });

  // 10 Subtasks
  subtaskTitles.forEach((title, i) => {
    items.push({
      id: `sub-${i}`,
      key: `SUB-${keyCounter++}`,
      type: 'subtask',
      title,
      status: getRandomStatus(i + 35),
      priority: getRandomPriority(i + 3),
      assignee: getRandomAssignee(i + 35),
      sprint: getRandomSprint(i + 3),
      createdAt: dates[(i + 3) % dates.length],
      updatedAt: dates[(i + 3) % dates.length],
      parentKey: `STORY-${110 + (i % 25)}`,
    });
  });

  return items;
};

// Recent items for mega menu
export const recentItems: RecentItem[] = [
  { key: 'EPIC-100', title: 'Platform Modernization Initiative', type: 'epic' },
  { key: 'FEAT-105', title: 'Multi-language Support', type: 'feature' },
  { key: 'STORY-115', title: 'Create user profile page', type: 'story' },
  { key: 'STORY-118', title: 'Build command palette', type: 'story' },
  { key: 'SUB-136', title: 'Fix accessibility issues', type: 'subtask' },
];

// Pre-generated data
export const workItems = generateWorkItems();

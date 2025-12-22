// src/lib/work-manager-data.ts
// Work Manager Seed Data

import type { 
  User, Team, Task, KanbanColumn, 
  TaskType, TaskStatus, Priority, LinkedItemType 
} from '@/components/work-manager/types';

// Helper functions
const today = new Date();
const formatDate = (d: Date): string => d.toISOString().split('T')[0];
const addDays = (d: Date, days: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

// Users (8 total) - with distinct avatar colors
export const users: User[] = [
  { id: 'u1', name: 'Sarah Ahmed', initials: 'SA', email: 'sarah.ahmed@catalyst.sa', role: 'Senior Investment Analyst', avatarColor: '#5c7c5c' },
  { id: 'u2', name: 'Mohammed Al-Rashid', initials: 'MR', email: 'mohammed.r@catalyst.sa', role: 'Investment Manager', avatarColor: '#8b7355' },
  { id: 'u3', name: 'Layla Hassan', initials: 'LH', email: 'layla.h@catalyst.sa', role: 'Strategy Consultant', avatarColor: '#c69c6d' },
  { id: 'u4', name: 'Omar Khalid', initials: 'OK', email: 'omar.k@catalyst.sa', role: 'Portfolio Analyst', avatarColor: '#2563eb' },
  { id: 'u5', name: 'Fatima Al-Saud', initials: 'FS', email: 'fatima.s@catalyst.sa', role: 'Operations Lead', avatarColor: '#16a34a' },
  { id: 'u6', name: 'Ahmed Mansour', initials: 'AM', email: 'ahmed.m@catalyst.sa', role: 'Operations Analyst', avatarColor: '#ea580c' },
  { id: 'u7', name: 'Nadia Qureshi', initials: 'NQ', email: 'nadia.q@catalyst.sa', role: 'Compliance Officer', avatarColor: '#dc2626' },
  { id: 'u8', name: 'Khalid Ibrahim', initials: 'KI', email: 'khalid.i@catalyst.sa', role: 'Risk Analyst', avatarColor: '#ca8a04' },
];

// Teams (3 total)
export const teams: Team[] = [
  { id: 'investment', name: 'Investment Strategy', description: 'Strategic investment analysis and portfolio allocation', memberIds: ['u1', 'u2', 'u3'], color: 'olive' },
  { id: 'portfolio', name: 'Portfolio Operations', description: 'Day-to-day portfolio management and operations', memberIds: ['u4', 'u5', 'u6'], color: 'bronze' },
  { id: 'compliance', name: 'Compliance & Risk', description: 'Regulatory compliance and risk management', memberIds: ['u7', 'u8'], color: 'gold' },
];

// Default Kanban columns
export const defaultColumns: KanbanColumn[] = [
  { id: 'col-backlog', name: 'Backlog', status: 'Backlog', wipLimit: undefined },
  { id: 'col-planned', name: 'Planned', status: 'Planned', wipLimit: undefined },
  { id: 'col-inprogress', name: 'In Progress', status: 'In Progress', wipLimit: 5 },
  { id: 'col-waiting', name: 'Waiting', status: 'Waiting', wipLimit: 4 },
  { id: 'col-done', name: 'Done', status: 'Done', wipLimit: undefined },
];

// Tasks (24 total)
export const tasks: Task[] = [
  // Investment Strategy Team (8 tasks)
  {
    id: 't1', key: 'WM-0001', title: 'Review Q4 investment thesis document',
    type: 'Project', priority: 'High', status: 'In Progress',
    assigneeId: 'u1', teamId: 'investment', boardId: 'board-inv', columnPosition: 0,
    dueDate: formatDate(addDays(today, -2)), blocked: false,
    linkedItem: { type: 'Feature', key: 'FEAT-142' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -10)), updatedAt: formatDate(today)
  },
  {
    id: 't2', key: 'WM-0002', title: 'Update sector allocation model',
    type: 'Task', priority: 'Medium', status: 'In Progress',
    assigneeId: 'u2', teamId: 'investment', boardId: 'board-inv', columnPosition: 1,
    dueDate: formatDate(addDays(today, 1)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -7)), updatedAt: formatDate(today)
  },
  {
    id: 't3', key: 'WM-0003', title: 'Prepare board presentation slides',
    type: 'Project', priority: 'Critical', status: 'In Progress',
    assigneeId: 'u1', teamId: 'investment', boardId: 'board-inv', columnPosition: 2,
    dueDate: formatDate(today), blocked: true,
    blockedReason: 'Waiting for CFO approval on financial projections',
    blockedAt: formatDate(addDays(today, -2)),
    linkedItem: { type: 'Epic', key: 'EPIC-023' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -14)), updatedAt: formatDate(today)
  },
  {
    id: 't4', key: 'WM-0004', title: 'Analyze emerging market opportunities',
    type: 'Task', priority: 'Medium', status: 'Planned',
    assigneeId: 'u3', teamId: 'investment', boardId: 'board-inv', columnPosition: 0,
    dueDate: formatDate(addDays(today, 5)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -5)), updatedAt: formatDate(today)
  },
  {
    id: 't5', key: 'WM-0005', title: 'Schedule strategy review meeting',
    type: 'General', priority: 'Low', status: 'Backlog',
    assigneeId: 'u2', teamId: 'investment', boardId: 'board-inv', columnPosition: 0,
    dueDate: formatDate(addDays(today, 7)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -3)), updatedAt: formatDate(today)
  },
  {
    id: 't6', key: 'WM-0006', title: 'Due diligence on tech acquisition target',
    type: 'Project', priority: 'High', status: 'Waiting',
    assigneeId: 'u3', teamId: 'investment', boardId: 'board-inv', columnPosition: 0,
    dueDate: formatDate(addDays(today, -1)), blocked: true,
    blockedReason: 'Legal team reviewing NDA',
    blockedAt: formatDate(addDays(today, -3)),
    linkedItem: { type: 'Feature', key: 'FEAT-156' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -12)), updatedAt: formatDate(today)
  },
  {
    id: 't7', key: 'WM-0007', title: 'Review competitor analysis report',
    type: 'Task', priority: 'Medium', status: 'Done',
    assigneeId: 'u1', teamId: 'investment', boardId: 'board-inv', columnPosition: 0,
    dueDate: formatDate(addDays(today, -3)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -8)), updatedAt: formatDate(addDays(today, -1)),
    completedAt: formatDate(addDays(today, -1))
  },
  {
    id: 't8', key: 'WM-0008', title: 'Update investment committee charter',
    type: 'General', priority: 'Low', status: 'Done',
    assigneeId: 'u2', teamId: 'investment', boardId: 'board-inv', columnPosition: 1,
    dueDate: formatDate(addDays(today, -5)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -10)), updatedAt: formatDate(addDays(today, -2)),
    completedAt: formatDate(addDays(today, -2))
  },

  // Portfolio Operations Team (6 tasks)
  {
    id: 't9', key: 'WM-0009', title: 'Reconcile NAV discrepancies',
    type: 'Task', priority: 'High', status: 'In Progress',
    assigneeId: 'u4', teamId: 'portfolio', boardId: 'board-port', columnPosition: 0,
    dueDate: formatDate(today), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -5)), updatedAt: formatDate(today)
  },
  {
    id: 't10', key: 'WM-0010', title: 'Process Q4 dividend distributions',
    type: 'Project', priority: 'Critical', status: 'Planned',
    assigneeId: 'u5', teamId: 'portfolio', boardId: 'board-port', columnPosition: 0,
    dueDate: formatDate(addDays(today, 3)), blocked: false,
    linkedItem: { type: 'Story', key: 'STORY-089' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -7)), updatedAt: formatDate(today)
  },
  {
    id: 't11', key: 'WM-0011', title: 'Update custody account documentation',
    type: 'Task', priority: 'Medium', status: 'Backlog',
    assigneeId: 'u6', teamId: 'portfolio', boardId: 'board-port', columnPosition: 0,
    dueDate: formatDate(addDays(today, 10)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -3)), updatedAt: formatDate(today)
  },
  {
    id: 't12', key: 'WM-0012', title: 'Weekly trade settlement report',
    type: 'Task', priority: 'Medium', status: 'Done',
    assigneeId: 'u4', teamId: 'portfolio', boardId: 'board-port', columnPosition: 0,
    dueDate: formatDate(addDays(today, -1)), blocked: false,
    linkedItem: null, recurrence: 'Weekly',
    createdAt: formatDate(addDays(today, -8)), updatedAt: formatDate(today),
    completedAt: formatDate(today)
  },
  {
    id: 't13', key: 'WM-0013', title: 'Review counterparty credit limits',
    type: 'Task', priority: 'High', status: 'Waiting',
    assigneeId: 'u5', teamId: 'portfolio', boardId: 'board-port', columnPosition: 0,
    dueDate: formatDate(addDays(today, -3)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -10)), updatedAt: formatDate(today)
  },
  {
    id: 't14', key: 'WM-0014', title: 'Automate cash flow reporting',
    type: 'Project', priority: 'Medium', status: 'In Progress',
    assigneeId: 'u6', teamId: 'portfolio', boardId: 'board-port', columnPosition: 1,
    dueDate: formatDate(addDays(today, 14)), blocked: false,
    linkedItem: { type: 'Feature', key: 'FEAT-201' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -20)), updatedAt: formatDate(today)
  },

  // Compliance & Risk Team (4 tasks)
  {
    id: 't15', key: 'WM-0015', title: 'Complete annual AML review',
    type: 'Project', priority: 'Critical', status: 'In Progress',
    assigneeId: 'u7', teamId: 'compliance', boardId: 'board-comp', columnPosition: 0,
    dueDate: formatDate(addDays(today, 2)), blocked: false,
    linkedItem: { type: 'Epic', key: 'EPIC-045' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -30)), updatedAt: formatDate(today)
  },
  {
    id: 't16', key: 'WM-0016', title: 'Update risk register entries',
    type: 'Task', priority: 'High', status: 'Planned',
    assigneeId: 'u8', teamId: 'compliance', boardId: 'board-comp', columnPosition: 0,
    dueDate: formatDate(addDays(today, 4)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -5)), updatedAt: formatDate(today)
  },
  {
    id: 't17', key: 'WM-0017', title: 'Regulatory filing - Form X',
    type: 'Task', priority: 'Critical', status: 'Done',
    assigneeId: 'u7', teamId: 'compliance', boardId: 'board-comp', columnPosition: 0,
    dueDate: formatDate(addDays(today, -2)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -15)), updatedAt: formatDate(addDays(today, -3)),
    completedAt: formatDate(addDays(today, -3))
  },
  {
    id: 't18', key: 'WM-0018', title: 'Staff compliance training schedule',
    type: 'General', priority: 'Low', status: 'Backlog',
    assigneeId: 'u8', teamId: 'compliance', boardId: 'board-comp', columnPosition: 0,
    dueDate: formatDate(addDays(today, 21)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -2)), updatedAt: formatDate(today)
  },

  // Additional variety tasks (6 tasks)
  {
    id: 't19', key: 'WM-0019', title: 'Monthly portfolio rebalancing review',
    type: 'Task', priority: 'High', status: 'Backlog',
    assigneeId: 'u2', teamId: 'investment', boardId: 'board-inv', columnPosition: 1,
    dueDate: formatDate(addDays(today, 6)), blocked: false,
    linkedItem: null, recurrence: 'Monthly',
    createdAt: formatDate(addDays(today, -1)), updatedAt: formatDate(today)
  },
  {
    id: 't20', key: 'WM-0020', title: 'Vendor contract renewal assessment',
    type: 'Task', priority: 'Medium', status: 'Planned',
    assigneeId: 'u4', teamId: 'portfolio', boardId: 'board-port', columnPosition: 1,
    dueDate: formatDate(addDays(today, 8)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -4)), updatedAt: formatDate(today)
  },
  {
    id: 't21', key: 'WM-0021', title: 'ESG metrics reporting framework',
    type: 'Project', priority: 'High', status: 'Waiting',
    assigneeId: 'u3', teamId: 'investment', boardId: 'board-inv', columnPosition: 1,
    dueDate: formatDate(addDays(today, 12)), blocked: true,
    blockedReason: 'Awaiting data from external ESG provider',
    blockedAt: formatDate(addDays(today, -5)),
    linkedItem: { type: 'Feature', key: 'FEAT-178' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -25)), updatedAt: formatDate(today)
  },
  {
    id: 't22', key: 'WM-0022', title: 'Cyber security incident response drill',
    type: 'Task', priority: 'Medium', status: 'Backlog',
    assigneeId: 'u7', teamId: 'compliance', boardId: 'board-comp', columnPosition: 1,
    dueDate: formatDate(addDays(today, 15)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -6)), updatedAt: formatDate(today)
  },
  {
    id: 't23', key: 'WM-0023', title: 'Client reporting template updates',
    type: 'Task', priority: 'Low', status: 'Done',
    assigneeId: 'u5', teamId: 'portfolio', boardId: 'board-port', columnPosition: 1,
    dueDate: formatDate(addDays(today, -4)), blocked: false,
    linkedItem: null, recurrence: 'None',
    createdAt: formatDate(addDays(today, -12)), updatedAt: formatDate(addDays(today, -2)),
    completedAt: formatDate(addDays(today, -2))
  },
  {
    id: 't24', key: 'WM-0024', title: 'Board risk appetite statement review',
    type: 'Project', priority: 'High', status: 'Planned',
    assigneeId: 'u8', teamId: 'compliance', boardId: 'board-comp', columnPosition: 1,
    dueDate: formatDate(addDays(today, 9)), blocked: false,
    linkedItem: { type: 'BusinessRequest', key: 'BR-034' },
    recurrence: 'None', createdAt: formatDate(addDays(today, -8)), updatedAt: formatDate(today)
  },
];

// Utility functions for computing extended task fields
export function computeTaskExtended(task: Task): import('@/components/work-manager/types').TaskExtended {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let isOverdue = false;
  let daysOverdue = 0;
  let dueBucket: import('@/components/work-manager/types').DueBucket = 'none';
  
  if (task.dueDate && task.status !== 'Done') {
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      isOverdue = true;
      daysOverdue = Math.abs(diffDays);
      dueBucket = 'overdue';
    } else if (diffDays === 0) {
      dueBucket = 'today';
    } else if (diffDays <= 7) {
      dueBucket = 'next7';
    } else {
      dueBucket = 'future';
    }
  }
  
  // Compute attention level
  let attentionLevel: import('@/components/work-manager/types').AttentionLevel = 'neutral';
  
  if (task.blocked && task.blockedAt) {
    const blockedDate = new Date(task.blockedAt);
    const daysSinceBlocked = Math.floor((today.getTime() - blockedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceBlocked >= 5) {
      attentionLevel = 'danger';
    } else if (daysSinceBlocked >= 1) {
      attentionLevel = 'warning';
    }
  }
  
  if (isOverdue) {
    if (daysOverdue >= 2) {
      attentionLevel = 'danger';
    } else {
      attentionLevel = attentionLevel === 'danger' ? 'danger' : 'warning';
    }
  }
  
  return {
    ...task,
    isOverdue,
    daysOverdue,
    dueBucket,
    attentionLevel,
  };
}

// Get user by ID
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

// Get team by ID
export function getTeamById(id: string): Team | undefined {
  return teams.find(t => t.id === id);
}

// Get tasks by team
export function getTasksByTeam(teamId: string): Task[] {
  return tasks.filter(t => t.teamId === teamId);
}

// Get tasks by status
export function getTasksByStatus(status: TaskStatus): Task[] {
  return tasks.filter(t => t.status === status);
}

// Get overdue tasks
export function getOverdueTasks(): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false;
    return new Date(t.dueDate) < today;
  });
}

// Get blocked tasks
export function getBlockedTasks(): Task[] {
  return tasks.filter(t => t.blocked);
}
// src/lib/work-manager-data.ts
// Work Manager Data - In-memory cache (seeded from backend at runtime)

import type {
  User, Team, Task, KanbanColumn,
  TaskStatus,
} from '@/components/work-manager/types';

// Users/Teams act as an in-memory lookup cache for UI helpers (getUserById/getTeamById).
// They are kept in sync from the WorkManager page.
export const users: User[] = [];
export const teams: Team[] = [];

export function setWorkManagerUsers(next: User[]) {
  users.splice(0, users.length, ...next);
}

export function setWorkManagerTeams(next: Team[]) {
  teams.splice(0, teams.length, ...next);
}

// Default Kanban columns
export const defaultColumns: KanbanColumn[] = [
  { id: 'col-backlog', name: 'Backlog', status: 'Backlog' },
  { id: 'col-planned', name: 'Planned', status: 'Planned' },
  { id: 'col-inprogress', name: 'In Progress', status: 'In Progress' },
  { id: 'col-waiting', name: 'Waiting', status: 'Waiting' },
  { id: 'col-done', name: 'Done', status: 'Done' },
];

// Tasks - empty (no seed data)
export const tasks: Task[] = [];

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
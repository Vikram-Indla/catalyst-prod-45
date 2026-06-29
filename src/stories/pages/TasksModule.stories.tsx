import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { TaskCard } from '@/modules/tasks/components/TaskCard';
import { KanbanCard } from '@/modules/tasks/components/kanban/KanbanCard';
import type { PlannerTask } from '@/modules/tasks/types';

// ─── Mock Data ─────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86_400_000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86_400_000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
const pastDue = new Date(Date.now() - 3 * 86_400_000).toISOString();

const baseTask: PlannerTask = {
  id: '1',
  key: 'PLN-101',
  title: 'Implement user authentication flow',
  description: 'Add login, register, and password reset pages',
  status: 'in-progress',
  type: 'project',
  priority: 'medium',
  assigneeId: 'u1',
  assigneeName: 'Vikram Indla',
  assigneeInitials: 'VI',
  assigneeOnline: true,
  reporterName: 'Nada Alfassam',
  reporterInitials: 'NA',
  teamName: 'Platform',
  teamColor: '#0052CC', // ads-scanner:ignore-line — Storybook mock data
  dueDate: nextWeek,
  blocked: false,
  progress: 45,
  comments: 3,
  attachments: 1,
  tags: ['auth', 'frontend'],
  createdAt: lastWeek,
  updatedAt: yesterday,
};

// ─── TaskCard Stories ──────────────────────────────────────────────────────

const taskCardMeta: Meta<typeof TaskCard> = {
  title: 'Pages/Tasks/TaskCard',
  component: TaskCard,
  args: {
    task: baseTask,
    onClick: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 340, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

export default taskCardMeta;

type TCStory = StoryObj<typeof TaskCard>;

export const Default: TCStory = {};

export const CriticalPriority: TCStory = {
  args: {
    task: {
      ...baseTask,
      id: '2',
      key: 'PLN-102',
      title: 'Fix production database connection pool exhaustion',
      priority: 'critical',
      status: 'in-progress',
      progress: 20,
    },
  },
};

export const Blocked: TCStory = {
  args: {
    task: {
      ...baseTask,
      id: '3',
      key: 'PLN-103',
      title: 'Deploy API gateway configuration',
      priority: 'high',
      blocked: true,
      blockedReason: 'Waiting on infrastructure team approval',
      status: 'planned',
      progress: 0,
    },
  },
};

export const Overdue: TCStory = {
  args: {
    task: {
      ...baseTask,
      id: '4',
      key: 'PLN-104',
      title: 'Update onboarding documentation',
      priority: 'low',
      dueDate: pastDue,
      status: 'backlog',
      progress: 10,
      comments: 0,
    },
  },
};

export const WithTags: TCStory = {
  args: {
    task: {
      ...baseTask,
      id: '5',
      key: 'PLN-105',
      title: 'Refactor notification service for scalability',
      tags: ['backend', 'performance', 'notifications', 'Q3'],
      storyPoints: 8,
    },
  },
};

export const Dragging: TCStory = {
  args: {
    task: baseTask,
    isDragging: true,
  },
};

export const Done: TCStory = {
  args: {
    task: {
      ...baseTask,
      id: '6',
      key: 'PLN-106',
      title: 'Set up CI/CD pipeline for staging',
      status: 'done',
      progress: 100,
      priority: 'high',
    },
  },
};

// ─── KanbanCard Stories ────────────────────────────────────────────────────

const kanbanTask = {
  id: 'k1',
  key: 'PLN-201',
  title: 'Design system token audit',
  status: 'in-progress',
  priority: 'medium' as const,
  assigneeName: 'Yazeed Daraz',
  assigneeAvatar: undefined,
  dueDate: nextWeek,
  tags: ['design-system'],
  comments: 2,
  attachments: 0,
  blocked: false,
  createdAt: lastWeek,
  updatedAt: now,
};

export const KanbanDefault: StoryObj = {
  name: 'KanbanCard / Default',
  render: () => (
    <div style={{ maxWidth: 280, padding: 16 }}>
      <KanbanCard task={kanbanTask} onClick={fn()} onEdit={fn()} onDelete={fn()} />
    </div>
  ),
};

export const KanbanHighPriority: StoryObj = {
  name: 'KanbanCard / High Priority',
  render: () => (
    <div style={{ maxWidth: 280, padding: 16 }}>
      <KanbanCard
        task={{ ...kanbanTask, id: 'k2', key: 'PLN-202', title: 'Critical security patch for auth tokens', priority: 'critical', tags: ['security'] }}
        onClick={fn()} onEdit={fn()} onDelete={fn()}
      />
    </div>
  ),
};

export const KanbanBlocked: StoryObj = {
  name: 'KanbanCard / Blocked',
  render: () => (
    <div style={{ maxWidth: 280, padding: 16 }}>
      <KanbanCard
        task={{ ...kanbanTask, id: 'k3', key: 'PLN-203', title: 'Migrate legacy endpoints', blocked: true, priority: 'high' }}
        onClick={fn()} onEdit={fn()} onDelete={fn()}
      />
    </div>
  ),
};

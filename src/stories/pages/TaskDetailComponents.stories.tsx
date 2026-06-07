import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrawerHeader } from '@/modules/tasks/components/TaskDetailDrawer/DrawerHeader';
import { SidebarFields } from '@/modules/tasks/components/TaskDetailDrawer/SidebarFields';
import { ProgressSection } from '@/modules/tasks/components/TaskDetailDrawer/ProgressSection';
import { TaskRow } from '@/modules/tasks/components/my-tasks/TaskRow';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}><MemoryRouter><div style={{ maxWidth: 480, padding: 16, background: 'var(--ds-surface, #fff)' }}>{children}</div></MemoryRouter></QueryClientProvider>;
}

// ─── Mock Task ─────────────────────────────────────────────────────────────

const mockTask = {
  id: 'task-1',
  key: 'PLN-101',
  title: 'Implement user authentication flow',
  description: 'Add login, register, and password reset pages with proper validation and error handling.',
  status: 'in-progress',
  statusId: 'in-progress',
  priority: 'high',
  assigneeId: 'u1',
  assigneeName: 'Vikram Indla',
  assigneeInitials: 'VI',
  reporterName: 'Nada Alfassam',
  reporterInitials: 'NA',
  teamId: 'w1',
  teamName: 'Platform Engineering',
  teamColor: '#0052CC',
  dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  startDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  blocked: false,
  progress: 45,
  comments: 3,
  attachments: 1,
  tags: [{ id: 'l1', name: 'auth', color: 'blue' }, { id: 'l2', name: 'frontend', color: 'green' }],
  createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  checklist: [
    { id: 'c1', title: 'Login page UI', completed: true },
    { id: 'c2', title: 'Register page UI', completed: true },
    { id: 'c3', title: 'Password reset flow', completed: false },
    { id: 'c4', title: 'Integration tests', completed: false },
  ],
};

// ─── DrawerHeader ──────────────────────────────────────────────────────────

const drawerHeaderMeta: Meta<typeof DrawerHeader> = {
  title: 'Pages/Tasks/DrawerHeader',
  component: DrawerHeader,
  decorators: [(Story) => <Wrap><Story /></Wrap>],
  args: {
    task: mockTask,
    onClose: fn(),
    onTitleChange: fn(),
    onStatusChange: fn(),
    onAssigneeChange: fn(),
    onPriorityChange: fn(),
    onEdit: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
    saveStatus: 'idle',
  },
};

export default drawerHeaderMeta;
type DHStory = StoryObj<typeof DrawerHeader>;

export const Default: DHStory = {};

export const Saving: DHStory = {
  args: { saveStatus: 'saving' },
};

export const Saved: DHStory = {
  args: { saveStatus: 'saved' },
};

export const BlockedTask: DHStory = {
  args: {
    task: { ...mockTask, blocked: true, blockedReason: 'Waiting on infra team approval' },
  },
};

export const CriticalPriority: DHStory = {
  args: {
    task: { ...mockTask, priority: 'critical', title: 'Fix production database connection pool exhaustion' },
  },
};

// ─── SidebarFields ─────────────────────────────────────────────────────────

export const SidebarFieldsDefault: StoryObj = {
  name: 'SidebarFields / Default',
  render: () => (
    <Wrap>
      <SidebarFields task={mockTask} onFieldChange={fn()} />
    </Wrap>
  ),
};

export const SidebarFieldsMinimal: StoryObj = {
  name: 'SidebarFields / Minimal Task',
  render: () => (
    <Wrap>
      <SidebarFields
        task={{ ...mockTask, assigneeId: null, assigneeName: null, teamId: null, teamName: null, dueDate: null, startDate: null, tags: [] }}
        onFieldChange={fn()}
      />
    </Wrap>
  ),
};

// ─── ProgressSection ───────────────────────────────────────────────────────

export const ProgressDefault: StoryObj = {
  name: 'ProgressSection / In Progress',
  render: () => (
    <Wrap>
      <ProgressSection task={mockTask} onUpdate={fn()} />
    </Wrap>
  ),
};

export const ProgressComplete: StoryObj = {
  name: 'ProgressSection / Complete',
  render: () => (
    <Wrap>
      <ProgressSection task={{ ...mockTask, progress: 100, status: 'done' }} onUpdate={fn()} />
    </Wrap>
  ),
};

export const ProgressZero: StoryObj = {
  name: 'ProgressSection / Not Started',
  render: () => (
    <Wrap>
      <ProgressSection task={{ ...mockTask, progress: 0, status: 'backlog' }} onUpdate={fn()} />
    </Wrap>
  ),
};

// ─── TaskRow (My Tasks) ────────────────────────────────────────────────────

const myTask = {
  id: 'mt-1',
  key: 'PLN-101',
  title: 'Implement user authentication flow',
  status: 'in_progress' as const,
  priority: 'high' as const,
  assignee_name: 'Vikram Indla',
  assignee_initials: 'VI',
  due_date: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  workstream_name: 'Platform Engineering',
  comments_count: 3,
  is_blocked: false,
  checklist_total: 4,
  checklist_done: 2,
  created_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  updated_at: new Date(Date.now() - 86_400_000).toISOString(),
};

export const MyTaskRow: StoryObj = {
  name: 'TaskRow / Default',
  render: () => (
    <Wrap>
      <TaskRow task={myTask as any} onOpenDetail={fn()} />
    </Wrap>
  ),
};

export const MyTaskRowOverdue: StoryObj = {
  name: 'TaskRow / Overdue',
  render: () => (
    <Wrap>
      <TaskRow
        task={{ ...myTask, id: 'mt-2', due_date: new Date(Date.now() - 3 * 86_400_000).toISOString() } as any}
        onOpenDetail={fn()}
        isOverdueSection
      />
    </Wrap>
  ),
};

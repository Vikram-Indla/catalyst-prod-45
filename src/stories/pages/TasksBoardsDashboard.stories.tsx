/**
 * Stories for Tasks module: Board cards, Dashboard KPIs, Workstream cards, Calendar pills.
 */
import type { StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BoardTaskCard } from '@/modules/tasks/components/boards/BoardTaskCard';
import { DashboardKPIStrip } from '@/modules/tasks/components/dashboard/DashboardKPIStrip';
import { DashboardStatusChartV2 } from '@/modules/tasks/components/dashboard/DashboardStatusChartV2';
import { WorkstreamCard } from '@/modules/tasks/components/workstreams/WorkstreamCard';
import { TaskPillV2 } from '@/modules/tasks/components/calendar/TaskPillV2';
import { ChecklistIndicator } from '@/modules/tasks/components/ChecklistIndicator';
import type { BoardTask } from '@/modules/tasks/types/planner-boards';
import type { DashboardMetrics, StatusDistribution } from '@/modules/tasks/types/planner-dashboard';
import type { Workstream } from '@/modules/tasks/hooks/usePlannerWorkstreams';
import type { PlannerTask } from '@/modules/tasks/types';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Wrap({ children, width = 480 }: { children: React.ReactNode; width?: number }) {
  return <QueryClientProvider client={qc}><div style={{ maxWidth: width, padding: 16 }}>{children}</div></QueryClientProvider>;
}

const now = new Date().toISOString();
const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 86_400_000).toISOString();

export default { title: 'Pages/Tasks/Boards & Dashboard' };

// ─── BoardTaskCard ─────────────────────────────────────────────────────────

const boardTask: BoardTask = {
  id: 'bt-1', key: 'PLN-301', title: 'Implement real-time notifications',
  description: 'Add WebSocket-based notifications for task updates',
  priority: 'high', due_date: nextWeek, progress: 35, position: 1,
  blocked: false, blocked_reason: null,
  created_at: lastWeek, updated_at: now,
  status_id: 's2', status_name: 'In Progress',
  assignee_id: 'u1', assignee_name: 'Vikram Indla',
  workstream_id: 'w1', workstream_name: 'Platform', workstream_color: 'var(--ds-link)',
  labels: [{ id: 'l1', name: 'backend', color: 'blue' }],
  checklist_total: 5, checklist_done: 2, comments_count: 3,
} as any;

export const BoardCardDefault: StoryObj = {
  render: () => <Wrap width={300}><BoardTaskCard task={boardTask} onClick={fn()} /></Wrap>,
};

export const BoardCardCritical: StoryObj = {
  render: () => <Wrap width={300}><BoardTaskCard task={{ ...boardTask, id: 'bt-2', priority: 'critical', title: 'Fix auth token expiry' }} onClick={fn()} /></Wrap>,
};

export const BoardCardBlocked: StoryObj = {
  render: () => <Wrap width={300}><BoardTaskCard task={{ ...boardTask, id: 'bt-3', blocked: true, blocked_reason: 'Waiting on API team' }} onClick={fn()} /></Wrap>,
};

export const BoardCardDragging: StoryObj = {
  render: () => <Wrap width={300}><BoardTaskCard task={boardTask} onClick={fn()} isDragging /></Wrap>,
};

// ─── DashboardKPIStrip ─────────────────────────────────────────────────────

const metrics: DashboardMetrics = {
  total_tasks: 142, overdue_count: 8, blocked_count: 3,
  completed_this_week: 12, critical_count: 5, high_count: 18,
  medium_count: 67, low_count: 52,
};

export const KPIStrip: StoryObj = {
  render: () => (
    <Wrap width={1200}>
      <DashboardKPIStrip
        metrics={metrics} unassignedCount={4}
        userRole="Team Lead"
        assignedWorkstreams={[
          { id: 'w1', name: 'Platform', color: 'var(--ds-link)' },
          { id: 'w2', name: 'Frontend', color: '#00B8D9' },
        ]}
      />
    </Wrap>
  ),
};

export const KPIStripClean: StoryObj = {
  render: () => (
    <Wrap width={1200}>
      <DashboardKPIStrip
        metrics={{ ...metrics, overdue_count: 0, blocked_count: 0 }}
        unassignedCount={0}
      />
    </Wrap>
  ),
};

// ─── DashboardStatusChartV2 ────────────────────────────────────────────────

const statusData: StatusDistribution[] = [
  { status_id: 's1', status_name: 'Backlog', status_slug: 'backlog', status_color: 'var(--ds-text-subtlest)', position: 0, task_count: 34, percentage: 24 },
  { status_id: 's2', status_name: 'Planned', status_slug: 'planned', status_color: 'var(--ds-background-information-bold)', position: 1, task_count: 28, percentage: 20 },
  { status_id: 's3', status_name: 'In Progress', status_slug: 'progress', status_color: 'var(--ds-background-warning-bold)', position: 2, task_count: 42, percentage: 30 },
  { status_id: 's4', status_name: 'Review', status_slug: 'review', status_color: 'var(--ds-background-discovery-bold)', position: 3, task_count: 18, percentage: 13 },
  { status_id: 's5', status_name: 'Done', status_slug: 'done', status_color: 'var(--ds-background-success-bold)', position: 4, task_count: 20, percentage: 14 },
];

export const StatusChart: StoryObj = {
  render: () => <Wrap width={600}><DashboardStatusChartV2 data={statusData} /></Wrap>,
};

// ─── WorkstreamCard ────────────────────────────────────────────────────────

const workstream: Workstream = {
  id: 'w1', name: 'Platform Engineering', slug: 'platform',
  description: 'Core platform infrastructure and shared services',
  color: 'var(--ds-link)', icon: null, sort_order: 1,
  is_active: true, is_archived: false, lead_id: 'u1',
  start_date: '2026-01-01', due_date: '2026-12-31',
  created_at: '2026-01-01T00:00:00Z', updated_at: now,
};

export const WorkstreamDefault: StoryObj = {
  render: () => (
    <Wrap width={400}>
      <WorkstreamCard
        workstream={workstream}
        onLeadChange={fn()} onEdit={fn()} onArchive={fn()} onDelete={fn()} onOpenDrawer={fn()}
      />
    </Wrap>
  ),
};

export const WorkstreamArchived: StoryObj = {
  render: () => (
    <Wrap width={400}>
      <WorkstreamCard
        workstream={{ ...workstream, id: 'w2', name: 'Legacy Migration', is_archived: true, color: 'var(--ds-text-disabled)' }}
        onLeadChange={fn()} onEdit={fn()} onArchive={fn()} onDelete={fn()} onOpenDrawer={fn()}
      />
    </Wrap>
  ),
};

// ─── TaskPillV2 (Calendar) ─────────────────────────────────────────────────

const calTask: PlannerTask = {
  id: 'ct-1', key: 'PLN-401', title: 'Review PR for auth refactor',
  status: 'review', type: 'task', priority: 'high',
  assigneeName: 'Vikram Indla', assigneeInitials: 'VI',
  blocked: false, progress: 80, comments: 2,
  createdAt: lastWeek, updatedAt: now,
  dueDate: nextWeek,
};

export const CalendarPill: StoryObj = {
  render: () => <Wrap width={200}><TaskPillV2 task={calTask} onClick={fn()} /></Wrap>,
};

export const CalendarPillCompact: StoryObj = {
  render: () => <Wrap width={150}><TaskPillV2 task={calTask} onClick={fn()} compact /></Wrap>,
};

export const CalendarPillCritical: StoryObj = {
  render: () => <Wrap width={200}><TaskPillV2 task={{ ...calTask, priority: 'critical', title: 'Hotfix deploy' }} onClick={fn()} /></Wrap>,
};

import type { PlannerTask } from '@/modules/tasks/types';
import type { BoardColumn, BoardTask } from '@/modules/tasks/types/planner-boards';

const NOW = '2026-06-14T10:00:00.000Z';

export const MOCK_BOARD_COLUMNS: BoardColumn[] = [
  { id: 'col-backlog', name: 'Backlog', slug: 'backlog', color: 'var(--ds-text-subtlest)', position: 1, is_completed_status: false, is_system: true, task_count: 3 },
  { id: 'col-planned', name: 'Planned', slug: 'planned', color: 'var(--ds-link)', position: 2, is_completed_status: false, task_count: 2 },
  { id: 'col-in-progress', name: 'In progress', slug: 'in-progress', color: 'var(--ds-background-warning-bold)', position: 3, is_completed_status: false, task_count: 4 },
  { id: 'col-review', name: 'Review', slug: 'review', color: 'var(--ds-icon-information)', position: 4, is_completed_status: false, task_count: 1 },
  { id: 'col-done', name: 'Done', slug: 'done', color: 'var(--ds-background-success-bold)', position: 5, is_completed_status: true, is_done: true, task_count: 5 },
];

export const MOCK_BOARD_TASKS: BoardTask[] = [
  {
    id: 'bt-1', key: 'PLN-201', title: 'Triage ageing Story-points board sweep',
    description: 'Catalyst board ageing > 14 days requires re-triage.',
    priority: 'high', due_date: '2026-06-20', progress: 35, position: 1,
    blocked: false, blocked_reason: null, created_at: NOW, updated_at: NOW,
    status_id: 'col-in-progress', status_name: 'In progress', status_slug: 'in-progress',
    status_color: 'var(--ds-background-warning-bold)', status_position: 3, is_completed_status: false,
    workstream_id: 'ws-platform', workstream_name: 'Platform', workstream_slug: 'platform', workstream_color: 'var(--ds-link)',
    assignee_id: 'p-vikram', assignee_name: 'Vikram Indla', assignee_avatar: null,
    due_status: 'upcoming', days_until_due: 6,
  },
  {
    id: 'bt-2', key: 'PLN-202', title: 'Audit For-You status chip enrichment',
    description: null, priority: 'critical', due_date: '2026-06-15', progress: 80, position: 2,
    blocked: false, blocked_reason: null, created_at: NOW, updated_at: NOW,
    status_id: 'col-review', status_name: 'Review', status_slug: 'review',
    status_color: 'var(--ds-icon-information)', status_position: 4, is_completed_status: false,
    workstream_id: 'ws-ai', workstream_name: 'CATY AI', workstream_slug: 'ai', workstream_color: 'var(--ds-background-discovery-bold)',
    assignee_id: 'p-nada', assignee_name: 'Nada Alfassam', assignee_avatar: null,
    due_status: 'tomorrow', days_until_due: 1,
  },
  {
    id: 'bt-3', key: 'PLN-203', title: 'Calendar timezone DST regression test',
    description: null, priority: 'medium', due_date: null, progress: 0, position: 3,
    blocked: true, blocked_reason: 'Waiting on staging env DB seed', created_at: NOW, updated_at: NOW,
    status_id: 'col-backlog', status_name: 'Backlog', status_slug: 'backlog',
    status_color: 'var(--ds-text-subtlest)', status_position: 1, is_completed_status: false,
    workstream_id: null, workstream_name: null, workstream_slug: null, workstream_color: null,
    assignee_id: null, assignee_name: null, assignee_avatar: null,
    due_status: null, days_until_due: null,
  },
];

export const MOCK_PLANNER_TASKS: PlannerTask[] = [
  {
    id: 'pt-1', key: 'PLN-301', title: 'Wire description editor to ADF parser',
    description: 'Replace NSAttributedString markdown with MarkdownToADF.',
    status: 'in_progress' as any, type: 'task' as any, priority: 'high' as any,
    assigneeId: 'p-vikram', assigneeName: 'Vikram Indla', assigneeInitials: 'VI', assigneeOnline: true,
    reporterId: 'p-vikram', reporterName: 'Vikram Indla', reporterInitials: 'VI',
    teamId: 'ws-platform', teamName: 'Platform', teamColor: 'var(--ds-link)',
    startDate: '2026-06-10', dueDate: '2026-06-20',
    blocked: false, progress: 65, comments: 4, attachments: 1, storyPoints: 5,
    tags: ['platform', 'editor'], createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'pt-2', key: 'PLN-302', title: 'Audit rainbow CTA usage across CATY surfaces',
    status: 'todo' as any, type: 'task' as any, priority: 'medium' as any,
    assigneeId: 'p-nada', assigneeName: 'Nada Alfassam', assigneeInitials: 'NA', assigneeOnline: false,
    teamId: 'ws-ai', teamName: 'CATY AI', teamColor: 'var(--ds-background-discovery-bold)',
    startDate: '2026-06-16', dueDate: '2026-06-25',
    blocked: false, progress: 0, comments: 0, attachments: 0,
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'pt-3', key: 'PLN-303', title: 'Fix For-You status chip falling back to grey',
    status: 'in_review' as any, type: 'bug' as any, priority: 'critical' as any,
    assigneeId: 'p-ahmed', assigneeName: 'Ahmed Yousry', assigneeInitials: 'AY', assigneeOnline: true,
    teamId: 'ws-platform', teamName: 'Platform', teamColor: 'var(--ds-link)',
    startDate: '2026-06-12', dueDate: '2026-06-15',
    blocked: true, blockedReason: 'Waiting on RLS migration',
    progress: 90, comments: 8, attachments: 2,
    createdAt: NOW, updatedAt: NOW,
  },
];

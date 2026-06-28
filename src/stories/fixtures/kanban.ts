import type {
  PlannerStatus,
  KanbanTask,
  KanbanProfile,
  KanbanWorkstream,
  KanbanTaskFilters,
} from '@/modules/tasks/types/kanban';

const NOW = '2026-06-14T10:00:00.000Z';

export const MOCK_STATUSES: PlannerStatus[] = [
  { id: 'st-backlog', name: 'Backlog', slug: 'backlog', color: 'var(--ds-text-subtlest)', position: 1, is_default: true, is_completed_status: false, created_at: NOW, updated_at: NOW },
  { id: 'st-planned', name: 'Planned', slug: 'planned', color: 'var(--ds-link)', position: 2, is_default: false, is_completed_status: false, created_at: NOW, updated_at: NOW },
  { id: 'st-in-progress', name: 'In progress', slug: 'in-progress', color: 'var(--ds-background-warning-bold)', position: 3, is_default: false, is_completed_status: false, created_at: NOW, updated_at: NOW },
  { id: 'st-review', name: 'In review', slug: 'review', color: 'var(--ds-icon-information)', position: 4, is_default: false, is_completed_status: false, created_at: NOW, updated_at: NOW },
  { id: 'st-done', name: 'Done', slug: 'done', color: 'var(--ds-background-success-bold)', position: 5, is_default: false, is_completed_status: true, created_at: NOW, updated_at: NOW },
];

export const MOCK_WORKSTREAMS: KanbanWorkstream[] = [
  { id: 'ws-platform', name: 'Platform' },
  { id: 'ws-ai', name: 'CATY AI' },
  { id: 'ws-mobile', name: 'Mobile' },
];

export const MOCK_PROFILES: KanbanProfile[] = [
  { id: 'p-vikram', full_name: 'Vikram Indla', email: 'vikram@example.com', avatar_url: null },
  { id: 'p-nada', full_name: 'Nada Alfassam', email: 'nada@example.com', avatar_url: null },
  { id: 'p-ahmed', full_name: 'Ahmed Yousry', email: 'ahmed@example.com', avatar_url: null },
];

export const MOCK_TASKS: KanbanTask[] = [
  {
    id: 't-1', key: 'TASK-101', title: 'Wire description editor to ADF parser',
    description: 'Replace NSAttributedString markdown with MarkdownToADF.',
    status_id: 'st-in-progress', priority: 'high', workstream_id: 'ws-platform',
    assignee_id: 'p-vikram', due_date: '2026-06-20', start_date: '2026-06-10',
    position: 1, blocked: false, blocked_reason: null, progress: 65, is_starred: true,
    created_by: 'p-vikram', created_at: NOW, updated_at: NOW, deleted_at: null, cover_url: null,
    status: MOCK_STATUSES[2], workstream: MOCK_WORKSTREAMS[0], assignee: MOCK_PROFILES[0],
  },
  {
    id: 't-2', key: 'TASK-102', title: 'Audit rainbow CTA usage across CATY surfaces',
    description: null,
    status_id: 'st-planned', priority: 'medium', workstream_id: 'ws-ai',
    assignee_id: 'p-nada', due_date: '2026-06-25', start_date: null,
    position: 2, blocked: false, blocked_reason: null, progress: 0, is_starred: false,
    created_by: 'p-vikram', created_at: NOW, updated_at: NOW, deleted_at: null, cover_url: null,
    status: MOCK_STATUSES[1], workstream: MOCK_WORKSTREAMS[1], assignee: MOCK_PROFILES[1],
  },
  {
    id: 't-3', key: 'TASK-103', title: 'Fix For-You status chip falling back to grey',
    description: 'Mention enrichment uses snake_case status_category.',
    status_id: 'st-review', priority: 'critical', workstream_id: 'ws-platform',
    assignee_id: 'p-ahmed', due_date: '2026-06-15', start_date: '2026-06-12',
    position: 3, blocked: true, blocked_reason: 'Waiting on RLS migration', progress: 90, is_starred: false,
    created_by: 'p-vikram', created_at: NOW, updated_at: NOW, deleted_at: null, cover_url: null,
    status: MOCK_STATUSES[3], workstream: MOCK_WORKSTREAMS[0], assignee: MOCK_PROFILES[2],
  },
  {
    id: 't-4', key: 'TASK-104', title: 'iOS: refresh Secrets.xcconfig after Supabase rotation',
    description: null,
    status_id: 'st-backlog', priority: 'low', workstream_id: 'ws-mobile',
    assignee_id: null, due_date: null, start_date: null,
    position: 4, blocked: false, blocked_reason: null, progress: 0, is_starred: false,
    created_by: 'p-vikram', created_at: NOW, updated_at: NOW, deleted_at: null, cover_url: null,
    status: MOCK_STATUSES[0], workstream: MOCK_WORKSTREAMS[2], assignee: undefined,
  },
  {
    id: 't-5', key: 'TASK-105', title: 'Ship sentence-case Jira list typography fix',
    description: null,
    status_id: 'st-done', priority: 'medium', workstream_id: 'ws-platform',
    assignee_id: 'p-vikram', due_date: '2026-06-10', start_date: '2026-06-05',
    position: 5, blocked: false, blocked_reason: null, progress: 100, is_starred: false,
    created_by: 'p-vikram', created_at: NOW, updated_at: NOW, deleted_at: null, cover_url: null,
    status: MOCK_STATUSES[4], workstream: MOCK_WORKSTREAMS[0], assignee: MOCK_PROFILES[0],
  },
];

export const MOCK_FILTERS: KanbanTaskFilters = {
  search: '',
  priority: 'all',
  assignee_id: 'all',
  workstream_id: 'all',
  status_slug: null,
};

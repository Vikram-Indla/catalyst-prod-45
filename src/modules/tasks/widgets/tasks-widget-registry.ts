/**
 * tasks-widget-registry — canonical widget list for the Tasks Hub
 * overview (/tasks/overview).
 *
 * Phase 4 of the Tasks Hub canonical alignment plan (2026-06-16). Each
 * entry has the same shape as the project-hub WIDGET_REGISTRY so the
 * canonical `DashboardWidgetGrid` can render them via its new `registry`
 * prop. Tasks widgets do not persist per-user configuration; the grid is
 * configured with `mode='tasks'` and the persistence layer is skipped.
 *
 * Five widgets, scanned top-to-bottom:
 *   §1 VOLUME      Tasks by status      — where is work concentrated?
 *   §2 EXCEPTIONS  Overdue tasks        — what is slipping?
 *                  Blocked tasks        — what is stuck and why?
 *   §3 CAPACITY    Assignee workload    — who is overloaded?
 *                  Workstream progress  — which workstreams are on track?
 */
import type { WidgetDefinition } from '@/components/project-hub/dashboard/widget-types';
import TasksByStatusWidget from './TasksByStatusWidget';
import OverdueTasksWidget from './OverdueTasksWidget';
import BlockedTasksWidget from './BlockedTasksWidget';
import AssigneeWorkloadWidget from './AssigneeWorkloadWidget';
import WorkstreamProgressWidget from './WorkstreamProgressWidget';

export const TASKS_WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'tasks-by-status',
    title: 'Tasks by status',
    subtitle: 'Where is work concentrated?',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 0,
    component: TasksByStatusWidget,
  },
  {
    id: 'overdue-tasks',
    title: 'Overdue tasks',
    subtitle: 'Past due date — sorted by most slipped first',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 1,
    component: OverdueTasksWidget,
  },
  {
    id: 'blocked-tasks',
    title: 'Blocked tasks',
    subtitle: 'Tasks flagged as blocked',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 2,
    component: BlockedTasksWidget,
  },
  {
    id: 'assignee-workload',
    title: 'Assignee workload',
    subtitle: 'Open tasks per assignee',
    group: 'team',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 3,
    component: AssigneeWorkloadWidget,
  },
  {
    id: 'workstream-progress',
    title: 'Workstream progress',
    subtitle: 'Completion percentage per workstream',
    group: 'delivery',
    defaultSpan: 12,
    minSpan: 12,
    defaultPosition: 4,
    component: WorkstreamProgressWidget,
  },
];

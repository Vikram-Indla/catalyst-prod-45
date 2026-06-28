/**
 * WorkHub Constants — Lookup Maps for Colors, Statuses, Types, Navigation
 */

import type { WorkItemStatus, WorkItemType, Priority, ReleaseStatus } from '@/types/workhub.types';

/* ── Status Colors (map to --wh-status-* tokens) ── */
export const STATUS_CONFIG: Record<WorkItemStatus, { bg: string; text: string; label: string }> = {
  'To Do': {
    bg: 'var(--wh-status-todo-bg)',
    text: 'var(--wh-status-todo-text)',
    label: 'To Do',
  },
  'In Progress': {
    bg: 'var(--wh-status-inprogress-bg)',
    text: 'var(--wh-status-inprogress-text)',
    label: 'In Progress',
  },
  'In Review': {
    bg: 'var(--wh-status-inreview-bg)',
    text: 'var(--wh-status-inreview-text)',
    label: 'In Review',
  },
  'Done': {
    bg: 'var(--wh-status-done-bg)',
    text: 'var(--wh-status-done-text)',
    label: 'Done',
  },
  'Blocked': {
    bg: 'var(--wh-status-blocked-bg)',
    text: 'var(--wh-status-blocked-text)',
    label: 'Blocked',
  },
  'Cancelled': {
    bg: 'var(--ds-surface-sunken)',
    text: 'var(--ds-text-disabled)',
    label: 'Cancelled',
  },
};

/* ── Type Badge Colors (map to --wh-type-* tokens) ── */
export const TYPE_CONFIG: Record<WorkItemType, { bg: string; text: string; label: string }> = {
  'Epic': {
    bg: 'var(--wh-type-epic-bg)',
    text: 'var(--wh-type-epic-text)',
    label: 'Epic',
  },
  'Story': {
    bg: 'var(--wh-type-story-bg)',
    text: 'var(--wh-type-story-text)',
    label: 'Story',
  },
  'Subtask': {
    bg: 'var(--wh-type-subtask-bg)',
    text: 'var(--wh-type-subtask-text)',
    label: 'Subtask',
  },
  'Bug': {
    bg: 'var(--wh-type-bug-bg)',
    text: 'var(--wh-type-bug-text)',
    label: 'Bug',
  },
  'Task': {
    bg: 'var(--ds-surface-sunken)',
    text: 'var(--ds-text-subtle)',
    label: 'Task',
  },
  'Incident': {
    bg: 'var(--ds-background-warning)',
    text: 'var(--ds-text-warning)',
    label: 'Incident',
  },
};

/* ── Priority Colors ── */
export const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  'Critical': { color: 'var(--ds-background-danger-bold)', label: 'Critical' },
  'High': { color: 'var(--ds-background-warning-bold)', label: 'High' },
  'Medium': { color: 'var(--ds-link)', label: 'Medium' },
  'Low': { color: 'var(--ds-text-disabled)', label: 'Low' },
};

/* ── Release Status Colors ── */
export const RELEASE_STATUS_CONFIG: Record<ReleaseStatus, { bg: string; text: string; dot: string }> = {
  'Planned': { bg: 'var(--ds-surface-sunken)', text: 'var(--ds-text-subtle)', dot: 'var(--ds-text-disabled)' },
  'Active': { bg: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', dot: 'var(--ds-link)' },
  'At Risk': { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', dot: 'var(--ds-background-danger-bold)' },
  'Completed': { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', dot: 'var(--ds-background-success-bold)' },
  'Cancelled': { bg: 'var(--ds-surface-sunken)', text: 'var(--ds-text-subtle)', dot: 'var(--ds-text-subtlest)' },
};

/* ── Sidebar Navigation Items ── */
export const WORKHUB_NAV_ITEMS = [
  { label: 'Dashboard', path: '/projecthub', icon: 'LayoutDashboard' },
  { label: 'Work Items', path: '/projecthub/workitems', icon: 'FileStack' },
  { label: 'Releases', path: '/projecthub/releases', icon: 'Rocket' },
  { label: 'Themes', path: '/projecthub/themes', icon: 'Palette' },
  { label: 'Resource 360', path: '/projecthub/resource360', icon: 'Users' },
  { label: 'Calendar', path: '/projecthub/calendar', icon: 'CalendarDays' },
  { label: 'Capacity', path: '/projecthub/capacity', icon: 'BarChart3' },
  { label: 'Analytics', path: '/projecthub/analytics', icon: 'PieChart' },
  { label: 'Caty AI', path: '/projecthub/caty', icon: 'Sparkles' },
] as const;

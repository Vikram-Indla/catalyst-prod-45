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
    bg: '#f1f5f9',
    text: '#94a3b8',
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
    bg: '#f1f5f9',
    text: '#475569',
    label: 'Task',
  },
  'Incident': {
    bg: '#fef3c7',
    text: '#92400e',
    label: 'Incident',
  },
};

/* ── Priority Colors ── */
export const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  'Critical': { color: '#ef4444', label: 'Critical' },
  'High': { color: '#d97706', label: 'High' },
  'Medium': { color: '#2563eb', label: 'Medium' },
  'Low': { color: '#94a3b8', label: 'Low' },
};

/* ── Release Status Colors ── */
export const RELEASE_STATUS_CONFIG: Record<ReleaseStatus, { bg: string; text: string; dot: string }> = {
  'Planned': { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  'Active': { bg: '#dbeafe', text: '#1d4ed8', dot: '#2563eb' },
  'At Risk': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  'Completed': { bg: '#d1fae5', text: '#047857', dot: '#16a34a' },
  'Cancelled': { bg: '#f1f5f9', text: '#475569', dot: '#64748b' },
};

/* ── Sidebar Navigation Items ── */
export const WORKHUB_NAV_ITEMS = [
  { label: 'Dashboard', path: '/workhub', icon: 'LayoutDashboard' },
  { label: 'Work Items', path: '/workhub/workitems', icon: 'FileStack' },
  { label: 'Releases', path: '/workhub/releases', icon: 'Rocket' },
  { label: 'Themes', path: '/workhub/themes', icon: 'Palette' },
  { label: 'Resource 360', path: '/workhub/resource360', icon: 'Users' },
  { label: 'Calendar', path: '/workhub/calendar', icon: 'CalendarDays' },
  { label: 'Capacity', path: '/workhub/capacity', icon: 'BarChart3' },
  { label: 'Analytics', path: '/workhub/analytics', icon: 'PieChart' },
  { label: 'Caty AI', path: '/workhub/caty', icon: 'Sparkles' },
] as const;

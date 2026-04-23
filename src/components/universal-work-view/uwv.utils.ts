// @ts-nocheck
/**
 * Universal Work View — pure utilities. No JSX. No React.
 *
 * Brought to PARITY with src/components/workhub/allwork/AllWorkTable.tsx
 * (Project Work table) per audit decisions Q1–Q4. See CLAUDE.md §5 (status
 * lozenge guardrail), §11 (icon registry), and §15 (interaction states).
 */

import type React from 'react';
import type { UWVColumn } from './uwv.types';

/**
 * Status pill style — verified from live backlog DOM at /project-hub/BAU/backlog.
 * Plain inline styles, NOT @atlaskit/lozenge.
 */
export function getStatusStyle(
  statusCategory: string,
  status?: string,
): React.CSSProperties {
  const cat = (statusCategory ?? '').toLowerCase();
  const st = (status ?? '').toLowerCase();

  const done = ['done', 'closed', 'resolved', 'complete', 'completed', 'merged', 'released'];
  const blocked = ['on hold', 'blocked', 'awaiting info', 'awaiting approval', 'rejected'];
  const todo = ['to do', 'backlog', 'open', 'new', 'draft'];

  const base: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 400,
    borderRadius: 3,
    padding: '0px 4px',
    display: 'inline-block',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  if (done.some((d) => st.includes(d)) || cat === 'done')
    return { ...base, background: '#E3FCEF', color: '#006644' };
  if (blocked.some((b) => st.includes(b)))
    return { ...base, background: '#FFF0B3', color: '#172B4D' };
  if (todo.some((t) => st.includes(t)) || cat === 'to do')
    return { ...base, background: '#F4F5F7', color: '#42526E' };
  // Default: in-progress (verified from backlog DOM)
  return { ...base, background: '#DFEDFF', color: '#0055CC' };
}

// Row height + key colour now match Project Work table.
export const JIRA_ROW_HEIGHT = 40;
// Key colour: always blue (matches AllWorkTable — `var(--cp-blue)`).
export const JIRA_KEY_COLOR = 'var(--cp-blue)';
// Summary uses theme token so dark mode works.
export const JIRA_SUMMARY_COLOR = 'var(--fg-1)';

export function lozengeAppearance(
  statusCategory: string,
  status?: string,
): 'default' | 'success' | 'removed' | 'inprogress' | 'moved' | 'new' {
  const cat = (statusCategory ?? '').toLowerCase();
  const st = (status ?? '').toLowerCase();

  if (cat === 'done' || ['done', 'closed', 'resolved', 'complete', 'completed'].includes(st))
    return 'success';
  if (cat === 'in progress' || cat === 'inprogress') return 'inprogress';
  if (['on hold', 'blocked', 'awaiting info', 'awaiting approval'].includes(st)) return 'moved';
  if (cat === 'to do' || st === 'to do' || st === 'backlog') return 'default';
  if (
    st.includes('progress') ||
    st.includes('review') ||
    st.includes('qa') ||
    st.includes('uat') ||
    st.includes('develop') ||
    st.includes('ready')
  )
    return 'inprogress';
  return 'default';
}

/**
 * Hub label / colour — matches AllWorkTable.tsx HUB_COLORS exactly.
 * Lowercase labels ('project', 'product', 'task', 'incident').
 */
export function hubTypeFromIssueType(issueType?: string | null): string {
  const t = (issueType ?? '').toLowerCase();
  if (t.includes('incident') || t.includes('bug') || t.includes('defect')) return 'incident';
  if (t.includes('epic') || t.includes('story') || t.includes('feature')) return 'project';
  if (t.includes('sub-task') || t.includes('subtask') || t.includes('task')) return 'task';
  return 'product';
}

export function hubLabel(hub: string): string {
  // Map UWV hubSource values to lowercase Project Work labels.
  const map: Record<string, string> = {
    projecthub: 'project',
    producthub: 'product',
    incidenthub: 'incident',
    testhub: 'task',
  };
  return (map[hub] ?? hub).toLowerCase();
}

export function hubColour(hub: string): { bg: string; text: string; border: string } {
  // Mirror HUB_COLORS in AllWorkTable.tsx — token-based, dark-mode aware.
  switch (hub) {
    case 'projecthub':
    case 'project':
      return { bg: 'var(--cp-primary-5)', text: 'var(--cp-blue)', border: 'var(--cp-blue)' };
    case 'producthub':
    case 'product':
      return { bg: '#F4F4F5', text: 'var(--fg-2)', border: 'var(--fg-2)' };
    case 'testhub':
    case 'task':
      return { bg: '#F4F4F5', text: 'var(--fg-3)', border: '#D4D4D8' };
    case 'incidenthub':
    case 'incident':
      return { bg: '#FEF2F2', text: 'var(--sem-danger)', border: 'var(--sem-danger)' };
    default:
      return { bg: '#F4F4F5', text: 'var(--fg-3)', border: '#D4D4D8' };
  }
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Relative time matching AllWorkTable formatRelative ("3d ago"). */
export function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.floor(mo / 12)}y ago`;
  } catch {
    return '—';
  }
}

export function isOverdue(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

/** First name only — kept for backwards compatibility but unused after parity. */
export function firstName(name?: string | null): string {
  if (!name) return '—';
  return name.split(/\s+/)[0] ?? name;
}

/** Deterministic avatar colour (mirrors AllWorkTable AVATAR_COLORS). */
export const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1', '#13C2C2', '#F5222D'];
export function nameToHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

/**
 * COLUMN PARITY with AllWorkTable.tsx COLUMNS:
 *   checkbox · KEY · SUMMARY · STATUS · PROJECT · HUB · PRIORITY · UPDATED · REPORTED BY
 *
 * Widths (px) mirror AllWorkTable.tsx exactly. Summary uses width: 0 here as a
 * sentinel; UWVTable converts width=0 → '1fr' so the column is fluid.
 */
export const DEFAULT_COLUMNS: UWVColumn[] = [
  { fieldId: 'key', label: 'Key', width: 120, visible: true, sortable: true, type: 'string' },
  { fieldId: 'summary', label: 'Summary', width: 336, visible: true, sortable: false, type: 'string' },
  { fieldId: 'status', label: 'Status', width: 180, visible: true, sortable: true, type: 'status' },
  { fieldId: 'project', label: 'Project', width: 140, visible: true, sortable: false, type: 'string' },
  { fieldId: 'hubSource', label: 'Hub', width: 110, visible: true, sortable: false, type: 'hub' },
  { fieldId: 'priority', label: 'Priority', width: 80, visible: true, sortable: true, type: 'string' },
  { fieldId: 'updated', label: 'Updated', width: 110, visible: true, sortable: true, type: 'date' },
  { fieldId: 'assignee', label: 'Reported by', width: 168, visible: true, sortable: true, type: 'user' },
  // Optional / hidden by default — kept available via column picker.
  { fieldId: 'comments', label: 'Comments', width: 130, visible: false, sortable: false, type: 'comments' },
  { fieldId: 'dueDate', label: 'Due date', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'created', label: 'Created', width: 110, visible: false, sortable: true, type: 'date' },
  { fieldId: 'parentKey', label: 'Parent', width: 100, visible: false, sortable: false, type: 'string' },
];
